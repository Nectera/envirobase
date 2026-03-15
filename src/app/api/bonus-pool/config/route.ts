import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_READ_LIMIT, API_WRITE_LIMIT } from "@/lib/rateLimit";

const DEFAULTS = {
  ratePerHour: 17,
  googleReviewBonusEach: 50,
  positionWeights: {
    "Office Assistant": 0.5,
    "Project Manager": 2.0,
    "Supervisor": 1.5,
    "Technician": 1.0,
  },
  excludedPositions: [
    "Field Estimator",
    "Office Manager",
    "Sales Representative",
    "Sales/Marketing",
    "Marketing",
  ],
};

/**
 * GET /api/bonus-pool/config
 * Returns the bonus configuration settings.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any)?.id || "anonymous";
    const rl = checkRateLimit(`read:${userId}`, API_READ_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const setting = await prisma.setting.findUnique({ where: { key: "bonusConfig" } });
    const config = setting ? JSON.parse(setting.value) : DEFAULTS;

    return NextResponse.json({
      ratePerHour: config.ratePerHour ?? DEFAULTS.ratePerHour,
      googleReviewBonusEach: config.googleReviewBonusEach ?? DEFAULTS.googleReviewBonusEach,
      positionWeights: config.positionWeights ?? DEFAULTS.positionWeights,
      excludedPositions: config.excludedPositions ?? DEFAULTS.excludedPositions,
    });
  } catch (error: any) {
    console.error("Bonus config GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/bonus-pool/config
 * Update bonus configuration (admin only).
 * Body: { ratePerHour, googleReviewBonusEach, positionWeights: { "Technician": 1, ... } }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user?.role !== "ADMIN" && user?.role !== "SUPERVISOR" && user?.role !== "OFFICE") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const rl = checkRateLimit(`write:${user.id}`, API_WRITE_LIMIT);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const existing = await prisma.setting.findUnique({ where: { key: "bonusConfig" } });
    const current = existing ? JSON.parse(existing.value) : DEFAULTS;

    const updated = {
      ratePerHour: body.ratePerHour ?? current.ratePerHour,
      googleReviewBonusEach: body.googleReviewBonusEach ?? current.googleReviewBonusEach,
      positionWeights: body.positionWeights ?? current.positionWeights,
      excludedPositions: body.excludedPositions ?? current.excludedPositions ?? DEFAULTS.excludedPositions,
    };

    await prisma.setting.upsert({
      where: { key: "bonusConfig" },
      create: { key: "bonusConfig", value: JSON.stringify(updated) },
      update: { value: JSON.stringify(updated) },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Bonus config PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
