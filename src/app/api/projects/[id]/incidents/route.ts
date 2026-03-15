import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendNotificationToWorker, sendNotificationToRole, buildIncidentBody } from "@/lib/notifications";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incidents = await prisma.incident.findMany({
      where: { projectId: params.id },
    });
    return NextResponse.json(incidents);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session?.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`write:${userId}`, API_WRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const now = new Date().toISOString();

    // 1. Create the incident record
    const incident = await prisma.incident.create({
      data: {
        projectId: params.id,
        type: body.type || "other",
        severity: body.severity || "medium",
        title: body.title || "",
        description: body.description || "",
        date: body.date || now.split("T")[0],
        time: body.time || now.split("T")[1]?.slice(0, 5) || "",
        reportedBy: body.reportedBy || "",
        status: "open",
        createdAt: now,
        updatedAt: now,
      },
    });

    // 2. Get project details for alert context
    const project = await prisma.project.findUnique({ where: { id: params.id } });
    const projectName = project?.name || "Unknown Project";
    const projectNumber = (project as any)?.projectNumber || "";

    // 3. Create alert for PM
    const pmId = (project as any)?.projectManagerId;
    if (pmId) {
      await prisma.alert.create({
        data: {
          type: "incident",
          severity: body.severity === "critical" ? "critical" : "warning",
          title: `Incident: ${body.title || body.type} — ${projectName}`,
          message: `${body.type.replace(/_/g, " ")} reported on ${projectName} (${projectNumber}). ${body.description || ""}`.trim(),
          date: now,
          projectId: params.id,
          workerId: pmId,
          dismissed: false,
        },
      });
    }

    // 4. Create alert for all Office Admin workers
    const allWorkers = await prisma.worker.findMany();
    const officeAdmins = (allWorkers as any[]).filter(
      (w: any) => w.position === "Office Admin"
    );
    for (const admin of officeAdmins) {
      await prisma.alert.create({
        data: {
          type: "incident",
          severity: body.severity === "critical" ? "critical" : "warning",
          title: `Incident: ${body.title || body.type} — ${projectName}`,
          message: `${body.type.replace(/_/g, " ")} reported on ${projectName} (${projectNumber}). ${body.description || ""}`.trim(),
          date: now,
          projectId: params.id,
          workerId: admin.id,
          dismissed: false,
        },
      });
    }

    // 5. Create an urgent task for the PM to follow up
    if (pmId) {
      await prisma.task.create({
        data: {
          title: `Incident Follow-Up: ${body.title || body.type} — ${projectName}`,
          description: `An incident was reported on ${projectName}.\n\nType: ${body.type.replace(/_/g, " ")}\nSeverity: ${body.severity}\nDate: ${body.date || now.split("T")[0]}\n\n${body.description || ""}`,
          status: "to_do",
          priority: body.severity === "critical" ? "urgent" : "high",
          dueDate: now.split("T")[0],
          assignedTo: pmId,
          linkedEntityType: "project",
          linkedEntityId: params.id,
          autoCreated: true,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // 6. Email notification to PM and admins about the incident
    try {
      const notifBody = buildIncidentBody(
        projectName,
        body.type || "other",
        body.severity || "medium",
        body.description || "",
      );
      const subject = `Incident Reported: ${body.title || body.type} — ${projectName}`;

      // Notify PM via email
      if (pmId) {
        sendNotificationToWorker(pmId, "incidentReported", subject, notifBody);
      }
      // Notify all admins via email
      sendNotificationToRole("ADMIN", "incidentReported", subject, notifBody);
    } catch { /* notification failure should not block response */ }

    return NextResponse.json(incident, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
