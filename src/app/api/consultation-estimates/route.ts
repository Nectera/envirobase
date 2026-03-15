import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const status = req.nextUrl.searchParams.get("status") || "";
    const leadId = req.nextUrl.searchParams.get("leadId") || "";

    const where: any = { ...orgWhere(orgId) };
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;

    const items = await prisma.consultationEstimate.findMany({ where });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    const item = await prisma.consultationEstimate.create({
      data: orgData(orgId, {
        leadId: body.leadId || null,
        companyId: body.companyId || null,
        contactId: body.contactId || null,
        estimateId: null,
        createdBy: body.createdBy || null,
        status: body.status || "draft",
        // Site info
        customerName: body.customerName || "",
        address: body.address || "",
        city: body.city || "",
        state: body.state || "CO",
        zip: body.zip || "",
        milesFromShop: body.milesFromShop || 0,
        projectDate: body.projectDate || null,
        // Consultation checklist
        siteVisitRequirements: body.siteVisitRequirements || [],
        daysNeeded: body.daysNeeded || 0,
        crewSize: body.crewSize || 0,
        scopeOfWork: body.scopeOfWork || "",
        paymentType: body.paymentType || "self_pay",
        lossType: body.lossType || "",
        septicSystem: body.septicSystem || false,
        vacateProperty: body.vacateProperty || "",
        driveTimeHours: body.driveTimeHours || 0,
        wasteDescription: body.wasteDescription || "",
        permitNeeded: body.permitNeeded || "",
        airClearances: body.airClearances || "",
        projectDesign: body.projectDesign || "",
        deconLocation: body.deconLocation || "",
        namsCount: body.namsCount || 0,
        ductCleaning: body.ductCleaning || "",
        asbestosDumpster: body.asbestosDumpster || false,
        directLoadOut: body.directLoadOut || "",
        openDumpster: body.openDumpster || "",
        dumpsterPlacement: body.dumpsterPlacement || "",
        portableBathroom: body.portableBathroom || false,
        flooringLayers: body.flooringLayers || "",
        drywallLayers: body.drywallLayers || "",
        hvacDucting: body.hvacDucting || "",
        spillQuantity: body.spillQuantity || "",
        contentsRemoval: body.contentsRemoval || "",
        furnitureAppliances: body.furnitureAppliances || "",
        customerResponsible: body.customerResponsible || "",
        powerAvailable: body.powerAvailable ?? true,
        waterSource: body.waterSource ?? true,
        difficultyRating: body.difficultyRating || 1,
        fieldNotes: body.fieldNotes || "",
        // Labor
        supervisorHours: body.supervisorHours || 0,
        supervisorOtHours: body.supervisorOtHours || 0,
        technicianHours: body.technicianHours || 0,
        technicianOtHours: body.technicianOtHours || 0,
        // Operating Costs
        opsItems: body.opsItems || [],
        opsPerHourRate: body.opsPerHourRate ?? 11.5,
        opsCost: body.opsCost || 0,
        // COGS
        cogs: body.cogs || [],
        // Materials
        materials: body.materials || [],
        // Totals
        laborCost: body.laborCost || 0,
        cogsCost: body.cogsCost || 0,
        materialCost: body.materialCost || 0,
        totalCost: body.totalCost || 0,
        // Markup & customer price
        markupPercent: body.markupPercent ?? null,
        customerPriceOverride: body.customerPriceOverride ?? null,
        customerPrice: body.customerPrice ?? null,
        serviceDescription: body.serviceDescription || "",
        // Post-cost fields
        ...(body.isPostCost ? {
          isPostCost: true,
          originalEstimateId: body.originalEstimateId || null,
          projectId: body.projectId || null,
          projectNumber: body.projectNumber || null,
        } : {}),
      }),
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error("Estimate create error:", error?.message, error?.code, error?.meta);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
