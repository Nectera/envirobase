import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/portal/[token]
 * Public endpoint — fetch project data for customer portal.
 * No auth required — the token itself is the authentication.
 *
 * Returns: project info, field reports, activity timeline, messages
 */
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const portal = await prisma.customerPortal.findUnique({
      where: { token: params.token },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            type: true,
            subtype: true,
            status: true,
            address: true,
            client: true,
            startDate: true,
            estEndDate: true,
            estimatedDays: true,
            clearanceResult: true,
            clearanceDate: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!portal || !portal.active) {
      return NextResponse.json({ error: "Invalid or expired portal link" }, { status: 404 });
    }

    const projectId = portal.project.id;

    // Fetch field reports (submitted only — no drafts)
    const fieldReports = await prisma.dailyFieldReport.findMany({
      where: { projectId, status: "submitted" },
      orderBy: { date: "desc" },
      take: 50,
    });

    // Flatten field report data (stored as JSON in `data` field)
    const reports = fieldReports.map((r: any) => {
      const data = typeof r.data === "string" ? JSON.parse(r.data) : (r.data || {});
      return {
        id: r.id,
        date: r.date,
        supervisorName: data.supervisorName || "—",
        workCompletedToday: data.workCompletedToday || "",
        plannedForTomorrow: data.plannedForTomorrow || "",
        incident: data.incident || false,
        nearMiss: data.nearMiss || false,
        stopWork: data.stopWork || false,
        photos: data.photos || [],
      };
    });

    // Fetch activity timeline — only customer-safe types
    const activities = await prisma.activity.findMany({
      where: {
        parentType: "project",
        parentId: projectId,
        type: { in: ["note", "email", "status_change", "site_visit"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Fetch documents — contracts and clearance/sampling reports
    const contractDocs = await prisma.document.findMany({
      where: { projectId, docType: "contract" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, fileName: true, fileUrl: true, fileSize: true, docType: true, date: true, createdAt: true },
    });

    // Check if the project has a clearance report or initial sampling doc
    const samplingDocs = await prisma.document.findMany({
      where: { projectId, docType: "initial_sampling" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, fileName: true, fileUrl: true, fileSize: true, docType: true, date: true, createdAt: true },
    });

    const portalDocuments = [
      ...contractDocs.map((d: any) => ({ ...d, displayType: "Contract" })),
      ...samplingDocs.map((d: any) => ({ ...d, displayType: "Sampling Report" })),
    ];

    // Calculate progress
    const startDate = portal.project.startDate;
    const estEndDate = portal.project.estEndDate;
    let progressPercent: number | null = null;

    if (startDate && estEndDate) {
      const start = new Date(startDate + "T00:00:00").getTime();
      const end = new Date(estEndDate + "T00:00:00").getTime();
      const now = Date.now();
      if (end > start) {
        progressPercent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
      }
    }

    return NextResponse.json({
      portal: {
        id: portal.id,
        clientName: portal.clientName,
        clientEmail: portal.clientEmail,
      },
      project: {
        ...portal.project,
        progressPercent,
      },
      documents: portalDocuments,
      fieldReports: reports,
      activities: activities.map((a: any) => ({
        id: a.id,
        type: a.type,
        content: a.content,
        user: a.user,
        createdAt: a.createdAt,
      })),
      messages: portal.messages.map((m: any) => ({
        id: m.id,
        sender: m.sender,
        isClient: m.isClient,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Portal GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
