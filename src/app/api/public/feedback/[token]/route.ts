import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/feedback/[token]
 * Public endpoint — returns survey info for the feedback page.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const reviewRequest = await prisma.reviewRequest.findUnique({
      where: { token: params.token },
      include: {
        project: { select: { id: true, name: true, client: true, address: true } },
      },
    });

    if (!reviewRequest) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Get the Google review URL for this location
    let googleReviewUrl = "";
    try {
      const setting = await prisma.setting.findUnique({ where: { key: "reviewConfig" } });
      if (setting) {
        const config = JSON.parse(setting.value);
        const location = config.locations?.find(
          (l: any) => l.key === reviewRequest.googleLocationKey
        );
        googleReviewUrl = location?.reviewUrl || "";
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      id: reviewRequest.id,
      clientName: reviewRequest.clientName,
      projectName: reviewRequest.project?.name || "Your Project",
      // If already completed, send the rating so the page shows the thank-you state
      rating: reviewRequest.rating,
      surveyCompleted: !!reviewRequest.surveyCompletedAt,
      googleReviewUrl,
      googleReviewClicked: reviewRequest.googleReviewClicked,
    });
  } catch (error: any) {
    console.error("Public feedback GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/public/feedback/[token]
 * Public endpoint — submit the survey rating and feedback.
 * Body: { rating: 1-5, comment?: string, contactPermission?: boolean }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const reviewRequest = await prisma.reviewRequest.findUnique({
      where: { token: params.token },
    });

    if (!reviewRequest) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (reviewRequest.surveyCompletedAt) {
      return NextResponse.json({ error: "Survey already completed" }, { status: 400 });
    }

    const body = await req.json();
    const { rating, comment, contactPermission } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const isHighRating = rating >= 4;

    await prisma.reviewRequest.update({
      where: { token: params.token },
      data: {
        rating,
        feedbackComment: comment || null,
        contactPermission: contactPermission || false,
        surveyCompletedAt: new Date(),
        googleReviewPrompted: isHighRating,
        status: "survey_completed",
      },
    });

    // Get Google review URL if high rating
    let googleReviewUrl = "";
    if (isHighRating) {
      try {
        const setting = await prisma.setting.findUnique({ where: { key: "reviewConfig" } });
        if (setting) {
          const config = JSON.parse(setting.value);
          const location = config.locations?.find(
            (l: any) => l.key === reviewRequest.googleLocationKey
          );
          googleReviewUrl = location?.reviewUrl || "";
        }
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      success: true,
      rating,
      isHighRating,
      googleReviewUrl,
    });
  } catch (error: any) {
    console.error("Public feedback POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/public/feedback/[token]
 * Track that the customer clicked the Google review link.
 * Body: { googleReviewClicked: true }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const reviewRequest = await prisma.reviewRequest.findUnique({
      where: { token: params.token },
    });

    if (!reviewRequest) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const body = await req.json();
    if (body.googleReviewClicked) {
      await prisma.reviewRequest.update({
        where: { token: params.token },
        data: { googleReviewClicked: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Public feedback PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
