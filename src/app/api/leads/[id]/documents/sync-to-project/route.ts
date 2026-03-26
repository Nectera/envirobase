import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { logger } from "@/lib/logger";

/**
 * POST /api/leads/[id]/documents/sync-to-project
 *
 * Copies all lead documents to the linked project.
 * Skips documents that already exist on the project (matched by fileName + docType).
 * Useful when documents are added to a lead after it was already won/converted.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    // Find the lead and its linked project
    const lead = await prisma.lead.findUnique({
      where: { id: params.id, ...orgWhere(orgId) },
      select: { id: true, projectId: true, businessName: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.projectId) {
      return NextResponse.json(
        { error: "No project linked to this lead. The lead must be won first to create a project." },
        { status: 400 }
      );
    }

    // Verify the project exists
    const project = await prisma.project.findUnique({
      where: { id: lead.projectId },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Linked project not found" }, { status: 404 });
    }

    // Fetch lead documents
    const leadDocs = await prisma.leadDocument.findMany({
      where: { leadId: params.id },
    });

    if (leadDocs.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        skipped: 0,
        message: "No documents to sync",
      });
    }

    // Fetch existing project documents to avoid duplicates
    const existingProjectDocs = await prisma.document.findMany({
      where: { projectId: lead.projectId },
      select: { fileName: true, docType: true, name: true },
    });

    // Build a set of existing doc identifiers for dedup
    const existingKeys = new Set(
      existingProjectDocs.map(
        (d: any) => `${d.docType || ""}::${d.fileName || ""}::${d.name || ""}`
      )
    );

    let synced = 0;
    let skipped = 0;

    for (const doc of leadDocs) {
      const docData =
        doc.data && typeof doc.data === "object" ? (doc.data as any) : {};
      const docKey = `${doc.docType || ""}::${doc.fileName || ""}::${doc.name || ""}`;

      if (existingKeys.has(docKey)) {
        skipped++;
        continue;
      }

      await prisma.document.create({
        data: {
          projectId: lead.projectId!,
          docType: doc.docType || "other",
          name:
            doc.name ||
            docData.title ||
            doc.fileName ||
            "Synced from lead",
          fileName: doc.fileName || null,
          fileUrl: doc.fileUrl || null,
          fileSize: doc.fileSize || null,
          mimeType: doc.mimeType || null,
          date: docData.date || null,
          data: {
            ...docData,
            transferredFromLead: true,
            syncedAt: new Date().toISOString(),
          },
        },
      });

      existingKeys.add(docKey);
      synced++;
    }

    logger.info("Document sync to project complete", {
      leadId: params.id,
      projectId: lead.projectId,
      synced,
      skipped,
    });

    return NextResponse.json({
      success: true,
      projectId: lead.projectId,
      projectName: (project as any).name,
      synced,
      skipped,
      total: leadDocs.length,
    });
  } catch (error: any) {
    logger.error("Document sync to project error", { error: error.message });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
