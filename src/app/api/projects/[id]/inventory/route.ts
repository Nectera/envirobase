import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/inventory
 * List all content inventory items for a project, with photos.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const items = await prisma.contentInventoryItem.findMany({
      where: orgWhere(orgId, { projectId: params.id }),
      include: { photos: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/inventory
 * Add a new inventory item. Body: { brand?, model?, description, location?, photoUrls? }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;
    const userId = (session.user as any)?.id;
    const userName = (session.user as any)?.name || "Unknown";

    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { brand, model, description, location, photoUrls = [] } = body;

    if (!description?.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Create the item
    const item = await prisma.contentInventoryItem.create({
      data: orgData(orgId, {
        projectId: params.id,
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        description: description.trim(),
        location: location?.trim() || null,
        addedBy: userId,
        addedByName: userName,
      }),
    });

    // Attach photos if provided
    if (photoUrls.length > 0) {
      for (let i = 0; i < photoUrls.length; i++) {
        const photo = photoUrls[i];
        await prisma.contentInventoryPhoto.create({
          data: {
            itemId: item.id,
            url: photo.url,
            fileName: photo.fileName || null,
            fileSize: photo.fileSize || null,
            order: i,
          },
        });
      }
    }

    // Return item with photos
    const fullItem = await prisma.contentInventoryItem.findUnique({
      where: orgWhere(orgId, { id: item.id }),
      include: { photos: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(fullItem, { status: 201 });
  } catch (error: any) {
    console.error("Inventory POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
