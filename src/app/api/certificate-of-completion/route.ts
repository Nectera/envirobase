import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const where: any = {};
    if (projectId) where.projectId = projectId;
    const items = await prisma.certificateOfCompletion.findMany({ where, include: { project: true } });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const item = await prisma.certificateOfCompletion.create({
      data: {
        projectId: body.projectId,
        workSiteAddress: body.workSiteAddress || "",
        policyNumber: body.policyNumber || "",
        claimNumber: body.claimNumber || "",
        purchaseOrderNumber: body.purchaseOrderNumber || "",
        jobNumber: body.jobNumber || "",
        demobilizationDate: body.demobilizationDate || new Date().toISOString().split("T")[0],
        propertyOwnerName: body.propertyOwnerName || "",
        propertyOwnerSignDate: body.propertyOwnerSignDate || "",
        companyRepName: body.companyRepName || "",
        companyRepSignDate: body.companyRepSignDate || "",
        status: body.status || "draft",
        createdBy: body.createdBy || "",
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
