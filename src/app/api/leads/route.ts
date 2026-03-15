import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runLeadStatusAutomations } from "@/lib/taskAutomation";
import { createLeadSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const status = req.nextUrl.searchParams.get("status") || "";
    const projectType = req.nextUrl.searchParams.get("projectType") || "";
    const assignedTo = req.nextUrl.searchParams.get("assignedTo") || "";

    const where: any = orgWhere(orgId);
    if (status) where.status = status;
    if (projectType) where.projectType = projectType;
    if (assignedTo) where.assignedTo = assignedTo;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        company: true,
        contact: true,
        estimates: true,
      },
    });

    return NextResponse.json(leads);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const v = validateBody(createLeadSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const lead = await prisma.lead.create({
      data: orgData(orgId, {
        // Contact info
        firstName: body.firstName || "",
        lastName: body.lastName || "",
        phone: body.phone || null,
        email: body.email || null,
        // Location
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        // Company & project
        companyId: body.companyId || null,
        contactId: body.contactId || null,
        title: body.title,
        description: body.description || "",
        status: body.status || "new",
        projectType: body.projectType || "",
        source: body.source || "",
        estimatedValue: body.estimatedValue || 0,
        notes: body.notes || "",
        // Insurance
        isInsuranceJob: body.isInsuranceJob || false,
        insuranceCarrier: body.insuranceCarrier || null,
        claimNumber: body.claimNumber || null,
        adjusterName: body.adjusterName || null,
        adjusterPhone: body.adjusterContact || null,
        dateOfLoss: body.dateOfLoss || null,
        // Office / Region
        office: body.office || null,
        // Site Visit
        locationNotes: body.locationNotes || null,
        siteVisitDate: body.siteVisitDate || null,
        siteVisitNotes: body.siteVisitNotes || null,
        // Project scheduling
        projectStartDate: body.projectStartDate || null,
        // Referral
        referralSource: body.referralSource || null,
        // System
        assignedTo: body.assignedTo || "",
      }),
    });

    // Create activity log entry for lead creation
    await prisma.activity.create({
      data: orgData(orgId, {
        parentType: "lead",
        parentId: lead.id,
        leadId: lead.id,
        type: "lead_created",
        content: `Lead "${lead.firstName} ${lead.lastName}" was created`,
        user: body.userId || "system",
      }),
    });

    // If lead was created with a non-default status, run automations
    if (lead.status && lead.status !== "new") {
      const fullLead = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { company: true },
      });
      if (fullLead) {
        await runLeadStatusAutomations(fullLead, "new", lead.status, body.userId || "system");
      }
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    logger.error("Lead creation error:", { error: error.message, code: error.code, meta: error.meta });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
