import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProjectNumber } from "@/lib/utils";
import { createProjectSchema, validateBody } from "@/lib/validations";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const type = req.nextUrl.searchParams.get("type");
    const status = req.nextUrl.searchParams.get("status");

    const where: any = orgWhere(orgId);
    if (type) where.type = type;
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
      where,
      include: { tasks: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
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
    const v = validateBody(createProjectSchema, body);
    if (!v.success) return NextResponse.json({ error: v.error }, { status: 400 });

    const project = await prisma.project.create({
      data: orgData(orgId, {
        projectNumber: body.projectNumber || generateProjectNumber(body.type),
        name: body.name,
        type: body.type,
        subtype: body.subtype || null,
        status: body.status || "planning",
        priority: body.priority || "medium",
        address: body.address,
        client: body.client,
        clientPhone: body.clientPhone || null,
        clientEmail: body.clientEmail || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        estEndDate: body.estEndDate ? new Date(body.estEndDate) : null,
        notificationDate: body.notificationDate ? new Date(body.notificationDate) : null,
        permitNumber: body.permitNumber || null,
        acmQuantity: body.acmQuantity || null,
        compliance: body.compliance ? JSON.stringify(body.compliance) : null,
        estimatedDays: body.estimatedDays ? Number(body.estimatedDays) : null,
        estimatedLaborHours: body.estimatedLaborHours ? Number(body.estimatedLaborHours) : null,
        notes: body.notes || null,
      }),
    });

    // Create default tasks based on type(s) — merge & deduplicate for multi-type projects
    const typesList = (body.type || "").split(",").map((t: string) => t.trim()).filter(Boolean);
    const seen = new Set<string>();
    const defaultTasks: string[] = [];
    for (const t of typesList) {
      for (const task of getDefaultTasks(t)) {
        if (!seen.has(task)) { seen.add(task); defaultTasks.push(task); }
      }
    }
    if (defaultTasks.length > 0) {
      await prisma.projectTask.createMany({
        data: defaultTasks.map((name, i) => ({
          projectId: project.id,
          name,
          status: "pending",
          sortOrder: i,
        })),
      });
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
