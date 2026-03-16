import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { rcApiCall, isConnected, getValidToken } from "@/lib/ringcentral";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;

  try {
    if (!(await isConnected())) {
      return NextResponse.json({ error: "RingCentral not connected" }, { status: 503 });
    }

    const body = await request.json();
    const { to, parentType, parentId, contactName } = body;

    if (!to) {
      return NextResponse.json({ error: "Phone number (to) is required" }, { status: 400 });
    }

    const auth = await getValidToken();
    if (!auth) {
      return NextResponse.json({ error: "RingCentral authentication expired" }, { status: 401 });
    }

    // Initiate RingOut call
    const ringOutBody: any = {
      to: { phoneNumber: to },
      playPrompt: true,
    };

    // Use the connected phone number as caller ID
    if (auth.phoneNumber) {
      ringOutBody.from = { phoneNumber: auth.phoneNumber };
    }

    const callResult = await rcApiCall("POST", "/account/~/extension/~/ring-out", ringOutBody);

    // Log to activity feed
    if (parentType && parentId) {
      await prisma.activity.create({
        data: {
          parentType,
          parentId,
          type: "call",
          title: `Call to ${contactName || to}`,
          description: `Outbound call initiated to ${to}${contactName ? ` (${contactName})` : ""} via RingCentral`,
          createdBy: "system",
        },
      });
    }

    return NextResponse.json({
      success: true,
      callId: callResult.id,
      status: callResult.status?.callStatus,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
