import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED_ITEMS = [
  // ── Asbestos (ACM) ──
  { code: "ACM RBAG", category: "ACM", description: "Asbestos removal - bagged material", unit: "CF", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM RPIP", category: "ACM", description: "Asbestos pipe insulation removal - straight run", unit: "LF", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM RFIT", category: "ACM", description: "Asbestos pipe fitting removal", unit: "EA", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM TILE", category: "ACM", description: "Asbestos floor tile removal", unit: "SF", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM MAST", category: "ACM", description: "Asbestos mastic removal", unit: "SF", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM TEXT", category: "ACM", description: "Asbestos textured ceiling removal", unit: "SF", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM SIDN", category: "ACM", description: "Asbestos siding removal - nonfriable", unit: "SF", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM ROOF", category: "ACM", description: "Asbestos roofing material removal", unit: "SQ", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM WRAP", category: "ACM", description: "Asbestos duct/boiler wrap removal", unit: "SF", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM TSI", category: "ACM", description: "Asbestos thermal system insulation removal", unit: "SF", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM GLVB", category: "ACM", description: "Asbestos glove bag removal", unit: "EA", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "ACM ENCAP", category: "ACM", description: "Asbestos encapsulation - bridging/penetrating", unit: "SF", projectTypes: ["ASBESTOS"], defaultRate: null },

  // ── Containment / Setup ──
  { code: "CON CRIT", category: "CON", description: "Critical barrier - 6 mil poly containment", unit: "SF", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "CON DCON", category: "CON", description: "Decontamination unit setup", unit: "EA", projectTypes: ["ASBESTOS", "METH"], defaultRate: null },
  { code: "CON NEG", category: "CON", description: "Negative air machine - HEPA filtered", unit: "EA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "CON SEAL", category: "CON", description: "Seal HVAC openings/vents", unit: "EA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "CON WARN", category: "CON", description: "Warning signs and barricade tape", unit: "EA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "CON FLOR", category: "CON", description: "Floor protection - 2 layers 6 mil poly", unit: "SF", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "CON LOAD", category: "CON", description: "Load out - containerize & transport waste", unit: "EA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },

  // ── Demolition ──
  { code: "DEM DRY", category: "DEM", description: "Drywall removal", unit: "SF", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "DEM CEIL", category: "DEM", description: "Ceiling removal - plaster/lath", unit: "SF", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "DEM TRIM", category: "DEM", description: "Trim/baseboard removal", unit: "LF", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "DEM CABT", category: "DEM", description: "Cabinet removal", unit: "LF", projectTypes: ["METH"], defaultRate: null },
  { code: "DEM CARP", category: "DEM", description: "Carpet removal and disposal", unit: "SF", projectTypes: ["METH", "LEAD"], defaultRate: null },
  { code: "DEM INSUL", category: "DEM", description: "Insulation removal", unit: "SF", projectTypes: ["ASBESTOS", "METH"], defaultRate: null },

  // ── Cleaning ──
  { code: "CLN HEPA", category: "CLN", description: "HEPA vacuum all surfaces", unit: "SF", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "CLN WIPE", category: "CLN", description: "Wet wipe all surfaces", unit: "SF", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "CLN CHEM", category: "CLN", description: "Chemical wash/decontamination", unit: "SF", projectTypes: ["METH"], defaultRate: null },
  { code: "CLN DUCT", category: "CLN", description: "HVAC duct cleaning", unit: "LF", projectTypes: ["METH", "ASBESTOS"], defaultRate: null },
  { code: "CLN SEAL", category: "CLN", description: "Seal/encapsulate surfaces after cleaning", unit: "SF", projectTypes: ["METH", "LEAD"], defaultRate: null },

  // ── Testing / Monitoring ──
  { code: "TST AIR", category: "TST", description: "Air monitoring - PCM analysis", unit: "EA", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "TST TEM", category: "TST", description: "Air monitoring - TEM analysis", unit: "EA", projectTypes: ["ASBESTOS"], defaultRate: null },
  { code: "TST METH", category: "TST", description: "Meth testing / sampling", unit: "EA", projectTypes: ["METH"], defaultRate: null },
  { code: "TST LEAD", category: "TST", description: "Lead testing - XRF or wipe", unit: "EA", projectTypes: ["LEAD"], defaultRate: null },
  { code: "TST CLEAR", category: "TST", description: "Clearance testing", unit: "EA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },

  // ── Lead-specific ──
  { code: "LBP STAB", category: "LBP", description: "Lead paint stabilization", unit: "SF", projectTypes: ["LEAD"], defaultRate: null },
  { code: "LBP STRIP", category: "LBP", description: "Lead paint removal - chemical strip", unit: "SF", projectTypes: ["LEAD"], defaultRate: null },
  { code: "LBP ENCAP", category: "LBP", description: "Lead paint encapsulation", unit: "SF", projectTypes: ["LEAD"], defaultRate: null },
  { code: "LBP DOOR", category: "LBP", description: "Lead door component replacement", unit: "EA", projectTypes: ["LEAD"], defaultRate: null },
  { code: "LBP WIND", category: "LBP", description: "Lead window component replacement", unit: "EA", projectTypes: ["LEAD"], defaultRate: null },

  // ── Meth-specific ──
  { code: "MTH DECON", category: "MTH", description: "Meth decontamination - full structure", unit: "SF", projectTypes: ["METH"], defaultRate: null },
  { code: "MTH COAT", category: "MTH", description: "Meth sealant coating application", unit: "SF", projectTypes: ["METH"], defaultRate: null },
  { code: "MTH DEMO", category: "MTH", description: "Meth contaminated material demolition", unit: "SF", projectTypes: ["METH"], defaultRate: null },
  { code: "MTH HVAC", category: "MTH", description: "HVAC system decontamination or replacement", unit: "EA", projectTypes: ["METH"], defaultRate: null },

  // ── Waste Disposal ──
  { code: "DSP HAUL", category: "DSP", description: "Hazmat waste hauling", unit: "EA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "DSP DUMP", category: "DSP", description: "Disposal fee - licensed hazmat landfill", unit: "TN", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "DSP DRUM", category: "DSP", description: "Drum/container for waste", unit: "EA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "DSP MANF", category: "DSP", description: "Waste manifest preparation", unit: "EA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },

  // ── Labor ──
  { code: "LBR SUPER", category: "LBR", description: "Supervisor - on site", unit: "HR", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "LBR TECH", category: "LBR", description: "Abatement technician labor", unit: "HR", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "LBR PM", category: "LBR", description: "Project management", unit: "HR", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "LBR OT", category: "LBR", description: "Overtime labor premium", unit: "HR", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },

  // ── Equipment ──
  { code: "EQP NEGM", category: "EQP", description: "Negative air machine rental", unit: "DA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "EQP HEPA", category: "EQP", description: "HEPA vacuum rental", unit: "DA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "EQP SCAF", category: "EQP", description: "Scaffolding setup and rental", unit: "DA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "EQP PPE", category: "EQP", description: "PPE - respirators, suits, consumables", unit: "EA", projectTypes: ["ASBESTOS", "METH", "LEAD"], defaultRate: null },
  { code: "EQP PUMP", category: "EQP", description: "Air sampling pump rental", unit: "DA", projectTypes: ["ASBESTOS"], defaultRate: null },
];

// POST — seed the library with common environmental Xactimate codes
export async function POST(_req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const role = (session.user as any)?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // Avoid duplicates — only insert codes that don't already exist for this org
    const existing = await prisma.xactLineItem.findMany({
      where: orgId ? { organizationId: orgId } : {},
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((e: any) => e.code));
    const toInsert = SEED_ITEMS.filter((item) => !existingCodes.has(item.code));

    if (toInsert.length === 0) {
      return NextResponse.json({ message: "Library already seeded", inserted: 0 });
    }

    // createMany doesn't support array fields in all Prisma adapters, use individual creates
    for (const item of toInsert) {
      await prisma.xactLineItem.create({
        data: orgData(orgId, item),
      });
    }

    return NextResponse.json({ message: `Seeded ${toInsert.length} line items`, inserted: toInsert.length });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
