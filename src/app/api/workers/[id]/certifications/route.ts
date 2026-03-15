import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, API_WRITE_LIMIT } from "@/lib/rateLimit";
import { sendNotificationToWorker, sendNotificationToRole, buildCertExpiryBody } from "@/lib/notifications";

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

    const expires = new Date(body.expires);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expires.getTime() - now.getTime()) / 86400000);
    let status = "active";
    if (daysUntilExpiry <= 0) status = "expired";
    else if (daysUntilExpiry <= 30) status = "expiring_soon";

    const cert = await prisma.certification.create({
      data: {
        workerId: params.id,
        name: body.name,
        number: body.number,
        issued: new Date(body.issued),
        expires,
        status,
      },
    });

    // Create alert if expiring soon or expired
    if (status !== "active") {
      const worker = await prisma.worker.findUnique({ where: { id: params.id } });
      await prisma.alert.create({
        data: {
          type: "certification",
          severity: status === "expired" ? "critical" : "warning",
          title: `${status === "expired" ? "EXPIRED" : "EXPIRING"}: ${worker?.name} - ${body.name}`,
          message: `Certification ${body.number} ${status === "expired" ? "has expired" : "expires soon"}. ${status === "expired" ? "Worker cannot perform work until renewed." : "Schedule renewal ASAP."}`,
          date: expires,
          workerId: params.id,
        },
      });

      // Email notification to the worker and admins
      try {
        const expiryDate = expires.toISOString().split("T")[0];
        const certStatus = status as "expiring_soon" | "expired";
        const notifBody = buildCertExpiryBody(worker?.name || "Worker", body.name, expiryDate, certStatus);
        const subject = `Certification ${status === "expired" ? "Expired" : "Expiring Soon"}: ${body.name}`;

        // Notify the worker
        sendNotificationToWorker(params.id, "certExpiring", subject, notifBody);
        // Notify admins
        sendNotificationToRole("ADMIN", "certExpiring", subject, notifBody);
      } catch { /* notification failure should not block response */ }
    }

    return NextResponse.json(cert, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
