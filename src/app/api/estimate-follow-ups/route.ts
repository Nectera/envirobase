import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import {
  getEstimateFollowUpConfig,
  ESTIMATE_FOLLOWUP_SEQUENCE,
} from "@/lib/estimate-followup-config";

// ─── GET /api/estimate-follow-ups ───────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const { searchParams } = new URL(req.url);
    const estimateId = searchParams.get("estimateId");

    const where: any = {};
    if (estimateId) where.estimateId = estimateId;

    const followUps = await prisma.estimateFollowUp.findMany({
      where: orgWhere(orgId, where),
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(followUps);
  } catch (error: any) {
    console.error("Estimate follow-up GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/estimate-follow-ups ──────────────────────────────────
// Create a follow-up sequence for an estimate and send touch 1
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;

    const user = session.user as any;
    const body = await req.json();
    const { estimateId, clientName, clientEmail } = body;

    if (!estimateId) {
      return NextResponse.json({ error: "estimateId is required" }, { status: 400 });
    }
    if (!clientEmail) {
      return NextResponse.json({ error: "clientEmail is required" }, { status: 400 });
    }

    // Verify estimate exists and is in "sent" status
    const estimate = await prisma.estimate.findFirst({
      where: orgWhere(orgId, { id: estimateId }),
    });
    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }
    if (estimate.status !== "sent") {
      return NextResponse.json(
        { error: `Estimate status is "${estimate.status}" — follow-ups only apply to sent estimates` },
        { status: 400 }
      );
    }

    // Check if there's already an active follow-up for this estimate
    const existing = await prisma.estimateFollowUp.findFirst({
      where: orgWhere(orgId, {
        estimateId,
        status: { in: ["pending", "active"] },
      }),
    });
    if (existing) {
      return NextResponse.json(
        { error: "A follow-up sequence is already active for this estimate" },
        { status: 409 }
      );
    }

    const config = await getEstimateFollowUpConfig();
    const sequence = config.sequence || ESTIMATE_FOLLOWUP_SEQUENCE;

    // Schedule first touch
    const firstStep = sequence[0];
    const nextTouchAt = new Date();
    nextTouchAt.setDate(nextTouchAt.getDate() + firstStep.delayDays);

    const followUp = await prisma.estimateFollowUp.create({
      data: orgData(orgId, {
        estimateId,
        clientName: clientName || null,
        clientEmail,
        sentBy: user.id,
        sentByName: user.name || user.email,
        status: "active",
        touchesSent: 0,
        nextTouchAt,
      }),
    });

    return NextResponse.json(followUp, { status: 201 });
  } catch (error: any) {
    console.error("Estimate follow-up POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
