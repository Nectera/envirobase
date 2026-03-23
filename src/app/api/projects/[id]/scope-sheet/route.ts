import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — generate a scope sheet from project inspection data mapped to Xact categories
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, type: true, address: true, client: true,
        acmQuantity: true, projectNumber: true,
        preAbatementInspections: {
          where: { status: "submitted" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Fetch matching Xact line items for this project type
    const xactItems = await prisma.xactLineItem.findMany({
      where: orgWhere(orgId, { projectTypes: { has: project.type } }),
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    // Parse pre-abatement inspection to suggest quantities
    const inspection = project.preAbatementInspections[0];
    const inspectionData = inspection?.checklistItems as Record<string, string> | null;

    // Build suggested scope lines from inspection + project data
    const suggestedLines: {
      xactItemId: string;
      xactCode: string;
      description: string;
      category: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      room: string;
      source: string;
    }[] = [];

    type XactLI = { id: string; code: string; description: string; category: string; unit: string; defaultRate: number | null };
    if (inspectionData) {
      const xactByCode: Record<string, XactLI> = {};
      for (const xi of xactItems as XactLI[]) {
        xactByCode[xi.code] = xi;
      }

      const addSuggested = (code: string, qty: number, room: string, source: string) => {
        const item = xactByCode[code];
        if (!item) return;
        suggestedLines.push({
          xactItemId: item.id, xactCode: item.code,
          description: item.description, category: item.category,
          unit: item.unit, quantity: qty, unitPrice: item.defaultRate || 0,
          room, source,
        });
      };

      // If project is asbestos, auto-suggest containment, removal, cleaning, testing, disposal
      if (project.type === "ASBESTOS") {
        addSuggested("CON CRIT", 0, "Work Area", "auto-containment");
        addSuggested("CON DCON", 1, "Work Area", "auto-decon");
        addSuggested("CON NEG", 1, "Work Area", "auto-neg-air");
        addSuggested("TST AIR", 0, "All Areas", "auto-monitoring");
        addSuggested("TST CLEAR", 1, "All Areas", "auto-clearance");
      }

      // For all types: waste disposal, PPE, labor
      addSuggested("DSP HAUL", 1, "Waste", "auto-disposal");
      addSuggested("DSP MANF", 1, "Waste", "auto-manifest");
      addSuggested("EQP PPE", 0, "General", "auto-ppe");
      addSuggested("LBR SUPER", 0, "Labor", "auto-supervision");
      addSuggested("LBR TECH", 0, "Labor", "auto-labor");
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        type: project.type,
        address: project.address,
        client: project.client,
        acmQuantity: project.acmQuantity,
        projectNumber: project.projectNumber,
      },
      hasInspection: !!inspection,
      suggestedLines,
      availableXactItems: xactItems,
    });
  } catch (error: any) {
    console.error("Scope sheet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
