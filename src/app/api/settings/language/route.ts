import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "language" },
    });
    const language = setting?.value || "en";
    return NextResponse.json({ language });
  } catch {
    return NextResponse.json({ language: "en" });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const lang = body.language;
    if (lang !== "en" && lang !== "es" && lang !== "pt") {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    await prisma.setting.upsert({
      where: { key: "language" },
      update: { value: lang },
      create: { key: "language", value: lang },
    });

    return NextResponse.json({ language: lang });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
