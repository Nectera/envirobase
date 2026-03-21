import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin, isOffice } from "@/lib/roles";
import { requireOrg } from "@/lib/org-context";
import { NextResponse } from "next/server";
import { DEFAULT_CONSULTATION_FIELDS } from "@/lib/consultationFieldConfig";
import ConsultationDetail from "./ConsultationDetail";

export const dynamic = "force-dynamic";

export default async function ConsultationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const item = await prisma.consultationEstimate.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    notFound();
  }

  // Post-cost estimates are only viewable by admin/office roles
  if ((item as any).isPostCost) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role as string | undefined;
    if (!isAdmin(userRole) && !isOffice(userRole)) {
      redirect("/estimates");
    }
  }

  // Load consultation field config
  const auth = await requireOrg();
  const orgId = auth instanceof NextResponse ? null : auth.orgId;
  let fieldConfig = DEFAULT_CONSULTATION_FIELDS;
  if (orgId) {
    try {
      const configSetting = await prisma.setting.findUnique({
        where: { key: `consultationFieldConfig_${orgId}` },
      });
      if (configSetting?.value) {
        fieldConfig = JSON.parse(configSetting.value);
      }
    } catch {}
  }

  return <ConsultationDetail data={item} fieldConfig={fieldConfig} />;
}
