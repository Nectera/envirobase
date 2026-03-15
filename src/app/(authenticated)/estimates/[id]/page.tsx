import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EstimateDetail from "./EstimateDetail";

export const dynamic = "force-dynamic";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { company: true, contact: true, lead: true },
  });

  if (!estimate) notFound();

  const rawActivities = await prisma.activity.findMany({
    where: { parentType: "estimate", parentId: id },
    take: 50,
  });
  const activities = rawActivities.map((a: any) => ({ ...a, description: a.content || a.description || "" }));

  return <EstimateDetail estimate={estimate} activities={activities} />;
}
