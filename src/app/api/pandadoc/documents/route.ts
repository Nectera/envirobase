import { NextRequest, NextResponse } from "next/server";
import { pdApiCall, isConnected } from "@/lib/pandadoc";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isConnected())) {
    return NextResponse.json({ error: "PandaDoc not connected" }, { status: 401 });
  }

  try {
    const status = req.nextUrl.searchParams.get("status");
    const endpoint = status
      ? `/documents?status=${encodeURIComponent(status)}`
      : "/documents";
    const data = await pdApiCall("GET", endpoint);
    return NextResponse.json(data.results || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isConnected())) {
    return NextResponse.json({ error: "PandaDoc not connected" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      templateId,
      estimateId,
      recipientEmail,
      recipientName,
      name,
      parentType,
      parentId,
    } = body;

    // Build document creation payload
    const docPayload: any = {
      name: name || "Document",
      recipients: [
        {
          email: recipientEmail,
          first_name: recipientName?.split(" ")[0] || "",
          last_name: recipientName?.split(" ").slice(1).join(" ") || "",
          role: "Client",
        },
      ],
    };

    // If creating from template
    if (templateId) {
      docPayload.template_uuid = templateId;
    }

    // If creating from estimate, map line items as tokens
    if (estimateId) {
      const estimate = await prisma.estimate.findUnique({
        where: { id: estimateId },
        include: { company: true, contact: true },
      });

      if (estimate) {
        // Map estimate fields to PandaDoc tokens
        docPayload.tokens = [
          { name: "estimate.number", value: (estimate as any).estimateNumber || "" },
          { name: "estimate.total", value: `$${((estimate as any).total || 0).toLocaleString()}` },
          { name: "estimate.subtotal", value: `$${((estimate as any).subtotal || 0).toLocaleString()}` },
          { name: "estimate.scope", value: (estimate as any).scope || "" },
          { name: "company.name", value: (estimate as any).company?.name || "" },
          { name: "contact.name", value: (estimate as any).contact ? [(estimate as any).contact.firstName, (estimate as any).contact.lastName].filter(Boolean).join(" ") : "" },
          { name: "estimate.validUntil", value: (estimate as any).validUntil || "" },
        ];

        // Map line items as pricing table items
        const lineItems = (estimate as any).lineItems || [];
        if (lineItems.length > 0) {
          docPayload.pricing_tables = [
            {
              name: "Pricing Table 1",
              data_merge: true,
              options: { currency: "USD", discount: { type: "absolute", value: 0 } },
              sections: [
                {
                  title: "Services",
                  default: true,
                  rows: lineItems.map((item: any) => ({
                    options: {
                      qty_editable: false,
                      optional_selected: true,
                    },
                    data: {
                      name: item.description || "",
                      description: item.unit || "",
                      price: item.unitPrice || 0,
                      qty: item.quantity ?? item.qty ?? 1,
                    },
                  })),
                },
              ],
            },
          ];
        }

        // Use contact email/name as recipient if not provided
        if (!recipientEmail && (estimate as any).contact?.email) {
          docPayload.recipients[0].email = (estimate as any).contact.email;
          docPayload.recipients[0].first_name = (estimate as any).contact.firstName || "";
          docPayload.recipients[0].last_name = (estimate as any).contact.lastName || "";
        }
      }
    }

    // Create document in PandaDoc
    const doc = await pdApiCall("POST", "/documents", docPayload);

    // Store pandadocDocumentId on estimate if applicable
    if (estimateId && doc.id) {
      await prisma.estimate.update({
        where: { id: estimateId },
        data: { pandadocDocumentId: doc.id },
      });
    }

    // Log activity
    if (parentType && parentId) {
      await prisma.activity.create({
        data: {
          parentType,
          parentId,
          type: "document_created",
          description: `PandaDoc document "${doc.name || name}" created`,
        },
      });
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
