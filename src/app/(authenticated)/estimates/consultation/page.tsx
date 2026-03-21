import { prisma } from "@/lib/prisma";
import { DEFAULT_OPS_RATE, DEFAULT_COGS_RATES } from "@/lib/materials";
import { DEFAULT_CONSULTATION_FIELDS } from "@/lib/consultationFieldConfig";
import { requireOrg } from "@/lib/org-context";
import { NextResponse } from "next/server";
import ConsultationForm from "./ConsultationForm";

export const dynamic = "force-dynamic";

export default async function ConsultationEstimatePage({
  searchParams,
}: {
  searchParams: { leadId?: string };
}) {
  // Get org context for org-scoped settings
  const auth = await requireOrg();
  const orgId = auth instanceof NextResponse ? null : auth.orgId;

  let lead = null;
  if (searchParams.leadId) {
    lead = await prisma.lead.findUnique({
      where: { id: searchParams.leadId },
      include: { company: true },
    });
  }

  // Load ops rate from settings
  const opsRateSetting = await prisma.setting.findUnique({ where: { key: "opsPerHourRate" } });
  const settingsOpsRate = opsRateSetting ? parseFloat(opsRateSetting.value) || DEFAULT_OPS_RATE : DEFAULT_OPS_RATE;

  // Load COGS rates from settings
  const cogsKeys = Object.keys(DEFAULT_COGS_RATES).map(k => `cogs_${k}`);
  const cogsSettings = await prisma.setting.findMany({
    where: { key: { in: cogsKeys } },
  });
  const cogsRates: Record<string, number> = {};
  cogsSettings.forEach((s: any) => {
    const key = s.key.replace("cogs_", "");
    cogsRates[key] = parseFloat(s.value);
  });

  // Fetch companies and leads for the selector
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      referralFeeEnabled: true,
      referralFeePercent: true,
    },
    orderBy: { name: "asc" },
  });

  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      description: true,
      notes: true,
      companyId: true,
      status: true,
      company: {
        select: {
          id: true,
          name: true,
          referralFeeEnabled: true,
          referralFeePercent: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      name: true,
      companyId: true,
    },
    orderBy: { name: "asc" },
  });

  // Load consultation field config (tenant-customizable Step 2 fields)
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          New Consultation Estimate
        </h1>
        <p className="text-sm text-slate-500">
          Field consultation checklist + pre-cost calculator
        </p>
      </div>
      <ConsultationForm
        lead={lead}
        companies={companies}
        leads={leads}
        contacts={contacts}
        settingsOpsRate={settingsOpsRate}
        cogsRates={cogsRates}
        fieldConfig={fieldConfig}
      />
    </div>
  );
}
