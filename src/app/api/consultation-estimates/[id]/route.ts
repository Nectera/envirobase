import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCoordinatorTasks } from "@/lib/coordinatorTasks";
import { generateProjectNumber } from "@/lib/utils";
import { runLeadStatusAutomations } from "@/lib/taskAutomation";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const item = await prisma.consultationEstimate.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();

    // Get current estimate to detect status change
    const currentEstimate = await prisma.consultationEstimate.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!currentEstimate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Build update data explicitly to avoid passing unknown fields to Prisma
    const data: any = {};
    if (body.leadId !== undefined) data.leadId = body.leadId || null;
    if (body.companyId !== undefined) data.companyId = body.companyId || null;
    if (body.contactId !== undefined) data.contactId = body.contactId || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.createdBy !== undefined) data.createdBy = body.createdBy;
    // Site info
    if (body.customerName !== undefined) data.customerName = body.customerName;
    if (body.address !== undefined) data.address = body.address;
    if (body.city !== undefined) data.city = body.city;
    if (body.state !== undefined) data.state = body.state;
    if (body.zip !== undefined) data.zip = body.zip;
    if (body.milesFromShop !== undefined) data.milesFromShop = body.milesFromShop;
    if (body.projectDate !== undefined) data.projectDate = body.projectDate;
    // Consultation checklist
    if (body.siteVisitRequirements !== undefined) data.siteVisitRequirements = body.siteVisitRequirements;
    if (body.daysNeeded !== undefined) data.daysNeeded = body.daysNeeded;
    if (body.crewSize !== undefined) data.crewSize = body.crewSize;
    if (body.scopeOfWork !== undefined) data.scopeOfWork = body.scopeOfWork;
    if (body.paymentType !== undefined) data.paymentType = body.paymentType;
    if (body.lossType !== undefined) data.lossType = body.lossType;
    if (body.septicSystem !== undefined) data.septicSystem = body.septicSystem;
    if (body.vacateProperty !== undefined) data.vacateProperty = body.vacateProperty;
    if (body.driveTimeHours !== undefined) data.driveTimeHours = body.driveTimeHours;
    if (body.wasteDescription !== undefined) data.wasteDescription = body.wasteDescription;
    if (body.permitNeeded !== undefined) data.permitNeeded = body.permitNeeded;
    if (body.airClearances !== undefined) data.airClearances = body.airClearances;
    if (body.projectDesign !== undefined) data.projectDesign = body.projectDesign;
    if (body.deconLocation !== undefined) data.deconLocation = body.deconLocation;
    if (body.namsCount !== undefined) data.namsCount = body.namsCount;
    if (body.ductCleaning !== undefined) data.ductCleaning = body.ductCleaning;
    if (body.asbestosDumpster !== undefined) data.asbestosDumpster = body.asbestosDumpster;
    if (body.directLoadOut !== undefined) data.directLoadOut = body.directLoadOut;
    if (body.openDumpster !== undefined) data.openDumpster = body.openDumpster;
    if (body.dumpsterPlacement !== undefined) data.dumpsterPlacement = body.dumpsterPlacement;
    if (body.portableBathroom !== undefined) data.portableBathroom = body.portableBathroom;
    if (body.flooringLayers !== undefined) data.flooringLayers = body.flooringLayers;
    if (body.drywallLayers !== undefined) data.drywallLayers = body.drywallLayers;
    if (body.hvacDucting !== undefined) data.hvacDucting = body.hvacDucting;
    if (body.spillQuantity !== undefined) data.spillQuantity = body.spillQuantity;
    if (body.contentsRemoval !== undefined) data.contentsRemoval = body.contentsRemoval;
    if (body.furnitureAppliances !== undefined) data.furnitureAppliances = body.furnitureAppliances;
    if (body.customerResponsible !== undefined) data.customerResponsible = body.customerResponsible;
    if (body.powerAvailable !== undefined) data.powerAvailable = body.powerAvailable;
    if (body.waterSource !== undefined) data.waterSource = body.waterSource;
    if (body.difficultyRating !== undefined) data.difficultyRating = body.difficultyRating;
    if (body.fieldNotes !== undefined) data.fieldNotes = body.fieldNotes;
    // Labor
    if (body.supervisorHours !== undefined) data.supervisorHours = body.supervisorHours;
    if (body.supervisorOtHours !== undefined) data.supervisorOtHours = body.supervisorOtHours;
    if (body.technicianHours !== undefined) data.technicianHours = body.technicianHours;
    if (body.technicianOtHours !== undefined) data.technicianOtHours = body.technicianOtHours;
    // Operating Costs
    if (body.opsItems !== undefined) data.opsItems = body.opsItems;
    if (body.opsPerHourRate !== undefined) data.opsPerHourRate = body.opsPerHourRate;
    if (body.opsCost !== undefined) data.opsCost = body.opsCost;
    // COGS & Materials
    if (body.cogs !== undefined) data.cogs = body.cogs;
    if (body.materials !== undefined) data.materials = body.materials;
    // Totals
    if (body.laborCost !== undefined) data.laborCost = body.laborCost;
    if (body.cogsCost !== undefined) data.cogsCost = body.cogsCost;
    if (body.materialCost !== undefined) data.materialCost = body.materialCost;
    if (body.totalCost !== undefined) data.totalCost = body.totalCost;
    // Markup & customer price
    if (body.markupPercent !== undefined) data.markupPercent = body.markupPercent;
    if (body.customerPriceOverride !== undefined) data.customerPriceOverride = body.customerPriceOverride;
    if (body.customerPrice !== undefined) data.customerPrice = body.customerPrice;
    if (body.serviceDescription !== undefined) data.serviceDescription = body.serviceDescription;
    // Post-cost fields
    if (body.isPostCost !== undefined) data.isPostCost = body.isPostCost;
    if (body.originalEstimateId !== undefined) data.originalEstimateId = body.originalEstimateId;
    if (body.projectId !== undefined) data.projectId = body.projectId;
    if (body.projectNumber !== undefined) data.projectNumber = body.projectNumber;

    const item = await prisma.consultationEstimate.update({
      where: { id: params.id },
      data,
    });

    // Detect estimate approval: status changing to approved/converted/accepted
    const oldStatus = (currentEstimate as any).status;
    const newStatus = body.status;
    const isBeingApproved =
      newStatus &&
      newStatus !== oldStatus &&
      (newStatus === "approved" || newStatus === "converted" || newStatus === "accepted");

    if (isBeingApproved && (currentEstimate as any).leadId) {
      const leadId = (currentEstimate as any).leadId;
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { company: true },
      });

      if (lead) {
        // Log activity on the lead
        await prisma.activity.create({
          data: {
            parentType: "lead",
            parentId: leadId,
            leadId,
            type: "estimate_approved",
            content: `Consultation estimate was marked as "${newStatus}".`,
            user: "system",
          },
        });

        // When estimate is accepted, automatically mark lead as Won
        if (newStatus === "accepted" && lead.status !== "won") {
          const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
          const oldLeadStatus = lead.status;

          // Create contact from lead info
          let createdContactId: string | null = null;
          if (leadName) {
            const contactData: any = {
              name: leadName,
              title: "",
              email: (lead as any).email || "",
              phone: (lead as any).phone || "",
              notes: `Created from won lead (estimate accepted).`,
            };
            if (lead.companyId) {
              contactData.company = { connect: { id: lead.companyId } };
            }
            const contact = await prisma.contact.create({ data: orgData(orgId, contactData) });
            createdContactId = contact.id;
          }

          // Create project from lead info
          const companyName = lead.company?.name || "Unknown";
          const addressParts = [(lead as any).address, (lead as any).city, (lead as any).state].filter(Boolean);
          const fullAddress = addressParts.join(", ");
          const projectType = lead.projectType || "ASBESTOS";

          // Pull estimated days and labor hours from this estimate
          const est = currentEstimate as any;
          const estDays = est.daysNeeded ? Math.ceil(est.daysNeeded) : null;
          const estLaborHours = est
            ? Math.ceil(
                ((est.supervisorHours || 0) + (est.supervisorOtHours || 0) +
                 (est.technicianHours || 0) + (est.technicianOtHours || 0)) *
                (est.daysNeeded || 1)
              )
            : null;

          const project = await prisma.project.create({
            data: orgData(orgId, {
              projectNumber: generateProjectNumber(projectType),
              name: `${companyName} - ${projectType} ${fullAddress ? "@ " + fullAddress : ""}`.trim(),
              type: projectType,
              subtype: null,
              status: "planning",
              priority: "medium",
              address: fullAddress || "",
              client: companyName,
              startDate: null,
              estEndDate: null,
              notificationDate: null,
              permitNumber: null,
              acmQuantity: null,
              compliance: null,
              estimatedDays: estDays,
              estimatedLaborHours: estLaborHours,
            }),
          });

          // Update lead to Won status
          const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: {
              status: "won",
              wonDate: new Date().toISOString().split("T")[0],
              projectId: project.id,
              ...(createdContactId ? { contactId: createdContactId } : {}),
            },
            include: { company: true },
          });

          // Log the status change
          await prisma.activity.create({
            data: {
              parentType: "lead",
              parentId: leadId,
              leadId,
              type: "status_changed",
              content: `Lead automatically marked as "won" after estimate was accepted. Project created.`,
              user: "system",
            },
          });

          // Create coordinator tasks
          await createCoordinatorTasks(lead, project.id);

          // Run any automation rules for "won" status
          await runLeadStatusAutomations(updatedLead, oldLeadStatus, "won", "system");
        } else {
          // For approved/converted, just create coordinator tasks
          await createCoordinatorTasks(lead);
        }
      }
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("Estimate update error:", error?.message, error?.code, error?.meta);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify consultation estimate belongs to org
    const existingItem = await prisma.consultationEstimate.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingItem) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.consultationEstimate.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
