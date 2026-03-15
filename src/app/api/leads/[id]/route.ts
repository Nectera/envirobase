import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { generateProjectNumber } from "@/lib/utils";
import { runLeadStatusAutomations } from "@/lib/taskAutomation";
import { createCoordinatorTasks } from "@/lib/coordinatorTasks";
import { updateLeadSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const lead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        company: true,
        contact: true,
        estimates: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const v = validateBody(updateLeadSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    // Get the current lead to check if status changed
    const currentLead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: { company: true },
    });

    if (!currentLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const data: any = {};

    // Contact info
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.email !== undefined) data.email = body.email;
    // Location
    if (body.address !== undefined) data.address = body.address;
    if (body.city !== undefined) data.city = body.city;
    if (body.state !== undefined) data.state = body.state;
    if (body.zip !== undefined) data.zip = body.zip;
    if (body.locationNotes !== undefined) data.locationNotes = body.locationNotes;
    // Company & project
    if (body.companyId !== undefined) data.companyId = body.companyId;
    if (body.contactId !== undefined) data.contactId = body.contactId;
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.projectType !== undefined) data.projectType = body.projectType;
    if (body.source !== undefined) data.source = body.source;
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo;
    if (body.estimatedValue !== undefined) data.estimatedValue = body.estimatedValue;
    // priority and dueDate removed — fields do not exist in Lead schema
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.wonDate !== undefined) data.wonDate = body.wonDate;
    if (body.lostDate !== undefined) data.lostDate = body.lostDate;
    if (body.lostReason !== undefined) data.lostReason = body.lostReason;
    if (body.pipelineStage !== undefined) data.pipelineStage = body.pipelineStage;
    if (body.office !== undefined) data.office = body.office;
    // Insurance
    if (body.isInsuranceJob !== undefined) data.isInsuranceJob = body.isInsuranceJob;
    if (body.insuranceCarrier !== undefined) data.insuranceCarrier = body.insuranceCarrier;
    if (body.claimNumber !== undefined) data.claimNumber = body.claimNumber;
    if (body.adjusterName !== undefined) data.adjusterName = body.adjusterName;
    if (body.adjusterPhone !== undefined) data.adjusterPhone = body.adjusterPhone;
    if (body.adjusterContact !== undefined) data.adjusterPhone = body.adjusterContact;
    if (body.dateOfLoss !== undefined) data.dateOfLoss = body.dateOfLoss;
    // Site visit fields
    if (body.siteVisitDate !== undefined) data.siteVisitDate = body.siteVisitDate;
    if (body.siteVisitTime !== undefined) data.siteVisitTime = body.siteVisitTime;
    if (body.siteVisitNotes !== undefined) data.siteVisitNotes = body.siteVisitNotes;
    // Project scheduling
    if (body.projectStartDate !== undefined) data.projectStartDate = body.projectStartDate;
    // Referral
    if (body.referralSource !== undefined) data.referralSource = body.referralSource;
    // referredForTesting and referredTestingTo removed — fields do not exist in Lead schema

    // Gate: moving to site_visit requires siteVisitDate
    if (
      body.status === "site_visit" &&
      currentLead &&
      currentLead.status !== "site_visit"
    ) {
      const visitDate = body.siteVisitDate || currentLead.siteVisitDate;
      if (!visitDate) {
        return NextResponse.json(
          { error: "Site visit date and time are required before moving to Site Visit stage." },
          { status: 400 }
        );
      }
    }

    // If marking as won, create contact + project
    const isBeingWon =
      currentLead &&
      body.status === "won" &&
      currentLead.status !== "won";

    let createdContactId: string | null = null;
    let createdProjectId: string | null = null;

    if (isBeingWon && currentLead) {
      const leadName = [currentLead.firstName, currentLead.lastName]
        .filter(Boolean)
        .join(" ");

      // 1. Create a contact from the lead's info (if we have a name)
      if (leadName) {
        const contactData: any = {
          firstName: currentLead.firstName || leadName,
          lastName: currentLead.lastName || null,
          name: leadName,
          title: "",
          email: (currentLead as any).email || "",
          phone: (currentLead as any).phone || "",
          notes: `Created from won lead. ${(currentLead as any).referralSource ? "Referral: " + (currentLead as any).referralSource : ""}`.trim(),
        };
        if (currentLead.companyId) {
          contactData.company = { connect: { id: currentLead.companyId } };
        }
        const contact = await prisma.contact.create({ data: orgData(orgId, contactData) });
        createdContactId = contact.id;
        data.contactId = contact.id;
      }

      // 2. Create a project from the lead's info
      const companyName = currentLead.company?.name || leadName || "Unknown";
      const addressParts = [
        (currentLead as any).address,
        (currentLead as any).city,
        (currentLead as any).state,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      const projectType = currentLead.projectType || "ASBESTOS";

      // Pull estimated days and labor hours from linked consultation estimate
      const linkedEstimate = await prisma.consultationEstimate.findFirst({
        where: { leadId: params.id },
        orderBy: { createdAt: "desc" },
      });
      const estDays = linkedEstimate?.daysNeeded ? Math.ceil(linkedEstimate.daysNeeded) : null;
      const estLaborHours = linkedEstimate
        ? Math.ceil(
            ((linkedEstimate.supervisorHours || 0) + (linkedEstimate.supervisorOtHours || 0) +
             (linkedEstimate.technicianHours || 0) + (linkedEstimate.technicianOtHours || 0)) *
            (linkedEstimate.daysNeeded || 1)
          )
        : null;

      const project = await prisma.project.create({
        data: orgData(orgId, {
          projectNumber: generateProjectNumber(projectType),
          name: `${companyName} - ${projectType.split(",").join(" / ")} ${fullAddress ? "@ " + fullAddress : ""}`.trim(),
          type: projectType,
          subtype: null,
          status: "planning",
          priority: "medium",
          address: fullAddress || "",
          client: companyName,
          clientPhone: (currentLead as any).phone || null,
          clientEmail: (currentLead as any).email || null,
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

      createdProjectId = project.id;

      // Store the project ID on the lead for reference
      data.projectId = project.id;

      // Create default tasks for the project (merge from all types, deduplicate)
      const defaultTasks = getDefaultTasksMulti(projectType);
      if (defaultTasks.length > 0) {
        await prisma.projectTask.createMany({
          data: defaultTasks.map((name: string, i: number) => ({
            projectId: project.id,
            name,
            status: "pending",
            sortOrder: i,
          })),
        });
      }

      // Create 3 Project Coordinator tasks (schedule, contracts, permitting)
      await createCoordinatorTasks(currentLead, project.id);

      // Transfer incomplete tasks from the lead to the new project
      try {
        const leadTasks = await prisma.task.findMany({
          where: { linkedEntityType: "lead", linkedEntityId: params.id },
        });
        const incompleteTasks = (leadTasks as any[]).filter(
          (t: any) => t.status !== "completed"
        );
        for (const t of incompleteTasks) {
          await prisma.task.update({
            where: { id: t.id },
            data: { linkedEntityType: "project", linkedEntityId: project.id },
          });
        }
      } catch (transferErr) {
        logger.error("Error transferring lead tasks:", { error: String(transferErr) });
      }

      // Transfer lead documents to the new project
      try {
        const leadDocs = await prisma.leadDocument.findMany({ where: { leadId: params.id } });
        for (const doc of leadDocs) {
          const docData = doc.data && typeof doc.data === "object" ? doc.data as any : {};
          await prisma.document.create({
            data: {
              projectId: project.id,
              docType: doc.docType || "other",
              name: doc.name || docData.title || doc.fileName || "Transferred from lead",
              fileName: doc.fileName || null,
              fileUrl: doc.fileUrl || null,
              fileSize: doc.fileSize || null,
              mimeType: doc.mimeType || null,
              date: docData.date || null,
              data: {
                ...docData,
                transferredFromLead: true,
              },
            },
          });
        }
      } catch (transferErr) {
        logger.error("Error transferring lead documents:", { error: String(transferErr) });
      }
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data,
      include: { company: true },
    });

    // Verify lead belongs to org
    if ((lead as any).organizationId !== orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create activity log if status changed
    if (currentLead && body.status !== undefined && body.status !== currentLead.status) {
      let description = `Status changed from "${currentLead.status}" to "${body.status}"`;

      if (isBeingWon) {
        const parts = [];
        if (createdContactId) parts.push("Contact created");
        if (createdProjectId) parts.push("Project created");
        if (parts.length > 0) description += `. ${parts.join(" and ")}.`;
      }

      await prisma.activity.create({
        data: {
          parentType: "lead",
          parentId: lead.id,
          leadId: lead.id,
          type: "status_changed",
          content: description,
          user: body.userId || "system",
        },
      });

      // Run configurable task automation rules for this status change
      // Pass the UPDATED lead so siteVisitDate/Time etc. are available
      console.log("Running automation with siteVisitAssignee:", body.siteVisitAssignee);
      await runLeadStatusAutomations(
        lead,
        currentLead.status,
        body.status,
        body.userId || "system",
        { siteVisitAssignee: body.siteVisitAssignee || null }
      );
    }

    return NextResponse.json({
      ...lead,
      createdContactId,
      createdProjectId,
    });
  } catch (error: any) {
    logger.error("Lead update error:", { error: error.message, code: error.code, meta: error.meta });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const userId = session.user.id;
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify lead belongs to org
    const existingLead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!existingLead) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete related records that might block deletion
    await prisma.activity.deleteMany({ where: { leadId: params.id } });
    await prisma.leadDocument.deleteMany({ where: { leadId: params.id } });

    await prisma.lead.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error("Lead delete error:", { error: error.message, code: error.code, meta: error.meta });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

function getDefaultTasksMulti(typeString: string): string[] {
  const types = typeString.split(",").map((t) => t.trim()).filter(Boolean);
  const seen = new Set<string>();
  const tasks: string[] = [];
  for (const t of types) {
    for (const task of getDefaultTasks(t)) {
      if (!seen.has(task)) {
        seen.add(task);
        tasks.push(task);
      }
    }
  }
  return tasks;
}

function getDefaultTasks(type: string): string[] {
  switch (type) {
    case "ASBESTOS":
      return [
        "CDPHE 10-day notification",
        "Pre-abatement inspection",
        "Containment setup",
        "ACM removal",
        "Air clearance testing (AMS)",
        "Waste manifest & disposal",
        "Final project report to CDPHE",
      ];
    case "LEAD":
      return [
        "Pre-renovation notification to occupants",
        "Lead inspection & risk assessment",
        "Occupant relocation (if needed)",
        "Containment & HEPA setup",
        "Lead paint removal / encapsulation",
        "Dust clearance sampling",
        "Clearance report submission",
      ];
    case "METH":
      return [
        "Law enforcement report obtained",
        "CIH preliminary assessment",
        "Assessment sampling (wipe)",
        "Decontamination work plan",
        "HVAC lockout & negative pressure",
        "Surface decontamination",
        "Ventilation system decon",
        "Post-decon clearance sampling",
        "Final clearance report to governing body",
      ];
    case "MOLD":
      return [
        "Moisture source identification",
        "Containment & HEPA setup",
        "Mold remediation",
        "Structural drying",
        "Post-remediation verification",
        "Clearance sampling (IEP)",
      ];
    default:
      return [];
  }
}
