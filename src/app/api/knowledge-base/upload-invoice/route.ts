import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { supabase, INVOICES_BUCKET } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MATERIALS } from "@/lib/materials";

export const dynamic = "force-dynamic";

/**
 * POST /api/knowledge-base/upload-invoice
 * 1. Uploads a material invoice (PDF or image) to Supabase Storage
 * 2. Sends it to Claude Vision to extract material names + prices
 * 3. Matches extracted items to DEFAULT_MATERIALS
 * 4. Creates a KnowledgeBase record with parsed data
 * 5. Optionally auto-updates the materialPrices setting
 */
export async function POST(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Admin or Supervisor access required" }, { status: 403 });
    }

    const userId = (session.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`upload:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const autoApply = formData.get("autoApply") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type (PDF, images)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg", "image/png", "image/webp", "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and image files are supported" }, { status: 400 });
    }

    // Validate file size (25 MB max)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "pdf";
    const uniqueId = crypto.randomUUID();
    const storagePath = `invoices/${Date.now()}-${uniqueId}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(INVOICES_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(INVOICES_BUCKET)
      .getPublicUrl(uploadData.path);
    const publicUrl = urlData.publicUrl;

    // Send to Claude Vision to extract material prices
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build the known materials list for matching
    const knownMaterials = DEFAULT_MATERIALS.map((m) => m.name).join(", ");

    // Determine media type for Claude
    const mediaType = file.type === "application/pdf" ? "application/pdf" as const
      : file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const base64Data = buffer.toString("base64");

    const aiResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: file.type === "application/pdf" ? "document" : "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            } as any,
            {
              type: "text",
              text: `You are analyzing a material supply invoice for an environmental remediation company (asbestos, lead, mold abatement).

Extract ALL line items from this invoice with their:
- Item name / description
- Unit price (per unit)
- Unit type (e.g., Roll, Per, Box, Bucket, Case, Bag, Can, etc.)
- Quantity ordered (if shown)

Then match each extracted item to the closest item from our known materials list:
${knownMaterials}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "vendor": "Vendor name from invoice",
  "invoiceDate": "YYYY-MM-DD or null",
  "invoiceNumber": "Invoice # or null",
  "items": [
    {
      "invoiceName": "Name as it appears on invoice",
      "matchedMaterial": "Closest match from our known list, or null if no match",
      "unitPrice": 12.50,
      "unit": "Roll",
      "quantity": 10,
      "confidence": "high|medium|low"
    }
  ]
}

Rules:
- Match items by meaning, not exact name (e.g., "Tyvek Coverall" = "Tyvek Suit")
- Set confidence to "high" if the match is obvious, "medium" if likely, "low" if uncertain
- If an item has no reasonable match, set matchedMaterial to null
- Unit price should be per-unit, not total line cost
- Return valid JSON only`,
            },
          ],
        },
      ],
    });

    // Parse AI response
    let parsedInvoice: any = null;
    const aiText = aiResponse.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    try {
      // Try to parse JSON directly, or extract from markdown code blocks
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedInvoice = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", aiText);
    }

    // Build price update suggestions
    const priceUpdates: { name: string; currentPrice: number; invoicePrice: number; confidence: string }[] = [];
    if (parsedInvoice?.items) {
      for (const item of parsedInvoice.items) {
        if (!item.matchedMaterial || item.unitPrice == null) continue;
        const existing = DEFAULT_MATERIALS.find(
          (m) => m.name.toLowerCase() === item.matchedMaterial.toLowerCase()
        );
        if (existing && existing.defaultPrice !== item.unitPrice) {
          priceUpdates.push({
            name: existing.name,
            currentPrice: existing.defaultPrice,
            invoicePrice: item.unitPrice,
            confidence: item.confidence || "medium",
          });
        }
      }
    }

    // Create KB record
    const article = await prisma.knowledgeBase.create({
      data: orgData(orgId, {
        title: `Invoice — ${parsedInvoice?.vendor || file.name}${parsedInvoice?.invoiceDate ? ` (${parsedInvoice.invoiceDate})` : ""}`,
        category: "material_invoice",
        content: parsedInvoice
          ? `Vendor: ${parsedInvoice.vendor || "Unknown"}\nInvoice #: ${parsedInvoice.invoiceNumber || "N/A"}\nDate: ${parsedInvoice.invoiceDate || "N/A"}\n\n${parsedInvoice.items?.length || 0} items extracted, ${priceUpdates.length} price changes detected.`
          : "Invoice uploaded but AI parsing failed. Please review manually.",
        tags: "invoice,materials,pricing",
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        parsedData: parsedInvoice || null,
        createdBy: (session.user as any)?.name || "Unknown",
      }),
    });

    // Auto-apply price updates if requested
    let appliedCount = 0;
    if (autoApply && priceUpdates.length > 0) {
      // Load current settings
      const settings = await prisma.setting.findMany();
      const settingsMap: Record<string, string> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value;
      }

      let materialPrices: { name: string; price: number }[] = [];
      try {
        materialPrices = JSON.parse(settingsMap.materialPrices || "[]");
      } catch {}

      // Apply updates (only high/medium confidence)
      for (const update of priceUpdates) {
        if (update.confidence === "low") continue;
        const idx = materialPrices.findIndex((p) => p.name === update.name);
        if (idx >= 0) {
          materialPrices[idx].price = update.invoicePrice;
        } else {
          materialPrices.push({ name: update.name, price: update.invoicePrice });
        }
        appliedCount++;
      }

      // Save updated prices
      await prisma.setting.upsert({
        where: { key: "materialPrices" },
        update: { value: JSON.stringify(materialPrices) },
        create: { key: "materialPrices", value: JSON.stringify(materialPrices) },
      });
    }

    return NextResponse.json({
      id: article.id,
      fileUrl: publicUrl,
      fileName: file.name,
      vendor: parsedInvoice?.vendor || null,
      invoiceDate: parsedInvoice?.invoiceDate || null,
      invoiceNumber: parsedInvoice?.invoiceNumber || null,
      itemCount: parsedInvoice?.items?.length || 0,
      priceUpdates,
      appliedCount,
      parsedInvoice,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Invoice upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
