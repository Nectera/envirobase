import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere } from "@/lib/org-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/metrics/lead-counts?year=2026
 * Returns lead counts aggregated by office and week, auto-populated from the CRM leads data.
 * Also returns counts by referral source per office.
 */
export async function GET(req: NextRequest) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { orgId } = result;

    const yearParam = req.nextUrl.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    // Fetch all leads
    const allLeads = await prisma.lead.findMany({
      where: orgWhere(orgId, {}),
      include: { company: true },
    });

    // Filter leads to the requested year based on createdAt
    const yearLeads = allLeads.filter((lead: any) => {
      const created = new Date(lead.createdAt);
      return created.getFullYear() === year;
    });

    // Helper: get Monday of the week for a given date
    const getWeekStart = (dateStr: string): string  => {
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().split("T")[0];
    }

    // Aggregate by week and office
    const weeklyData: Record<string, {
      weekStartDate: string;
      greeley: number;
      grandJunction: number;
      greeleyBySource: Record<string, number>;
      gjBySource: Record<string, number>;
      referredOut: number;
    }> = {};

    for (const lead of yearLeads as any[]) {
      const weekStart = getWeekStart(lead.createdAt);

      if (!weeklyData[weekStart]) {
        weeklyData[weekStart] = {
          weekStartDate: weekStart,
          greeley: 0,
          grandJunction: 0,
          greeleyBySource: {},
          gjBySource: {},
          referredOut: 0,
        };
      }

      const week = weeklyData[weekStart];
      const office = lead.office || "greeley"; // default to greeley if not set
      const source = lead.referralSource || lead.company?.name || lead.source || "Direct";

      if (office === "grand_junction") {
        week.grandJunction++;
        week.gjBySource[source] = (week.gjBySource[source] || 0) + 1;
      } else {
        week.greeley++;
        week.greeleyBySource[source] = (week.greeleyBySource[source] || 0) + 1;
      }

      if (lead.referredForTesting) {
        week.referredOut++;
      }
    }

    // Convert to sorted array
    const weeks = Object.values(weeklyData).sort((a, b) =>
      a.weekStartDate.localeCompare(b.weekStartDate)
    );

    // Totals
    const totals = {
      greeley: yearLeads.filter((l: any) => (l.office || "greeley") !== "grand_junction").length,
      grandJunction: yearLeads.filter((l: any) => l.office === "grand_junction").length,
      total: yearLeads.length,
      referredOut: yearLeads.filter((l: any) => l.referredForTesting).length,
    };

    return NextResponse.json({ year, weeks, totals });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
