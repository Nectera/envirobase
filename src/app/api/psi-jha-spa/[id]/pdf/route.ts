import { NextResponse, NextRequest } from "next/server";
import { requireOrg, orgWhere } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  ENVIRONMENT_HAZARDS, ERGONOMICS_HAZARDS, HEIGHT_HAZARDS, ACTIVITY_HAZARDS,
  ACCESS_EGRESS_HAZARDS, PERSONAL_LIMITATIONS, PPE_REQUIREMENTS,
} from "@/lib/psi-hazards";
import { COMPANY_NAME } from "@/lib/branding";

function getCheckedLabels(allItems: { key: string; label: string }[], checked: string[]) {
  return allItems.filter((i) => checked.includes(i.key)).map((i) => i.label);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const item = await prisma.psiJhaSpa.findUnique({ where: orgWhere(orgId, { id: params.id }), include: { project: true } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const indigo = rgb(0.31, 0.27, 0.9);
    const lineGray = rgb(0.85, 0.85, 0.85);

    let page = pdf.addPage([612, 792]);
    let y = 740;

    const checkPage = (needed: number) => {
      if (y < needed) {
        page.drawText(`${COMPANY_NAME} — PSI/JHA/SPA`, { x: 50, y: 30, font, size: 7, color: gray });
        page = pdf.addPage([612, 792]);
        y = 740;
      }
    }

    // Header
    page.drawText(COMPANY_NAME, { x: 50, y, font: fontBold, size: 14, color: indigo });
    y -= 14;
    page.drawText("903 5th St., Greeley, CO 80631", { x: 50, y, font, size: 8, color: gray });
    y -= 22;
    page.drawText("PSI / JHA / SPA", { x: 50, y, font: fontBold, size: 14, color: black });
    y -= 20;

    // Job Info
    const formattedDate = new Date(item.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const infoLines = [
      ["Date & Time", `${formattedDate} ${item.time}`],
      ["Project", item.project?.name || "—"],
      ["Job No.", item.jobNumber || "—"],
      ["Task Location", item.taskLocation || "—"],
      ["Muster Point", item.musterPoint || "—"],
      ["Job Site Address", item.jobSiteAddress || "—"],
      ["Nearest Hospital", `${item.nearestHospital || "—"} — ${item.nearestHospitalAddress || ""}`],
    ];
    for (const [label, value] of infoLines) {
      page.drawText(`${label}:`, { x: 50, y, font: fontBold, size: 8, color: gray });
      page.drawText(String(value), { x: 160, y, font, size: 9, color: black, maxWidth: 400 });
      y -= 13;
    }
    y -= 6;
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: lineGray, thickness: 1 });
    y -= 12;

    // Hazard Checklists
    const hazardSections = [
      { title: "Environment Hazards", items: getCheckedLabels(ENVIRONMENT_HAZARDS, item.environmentHazards || []) },
      { title: "Ergonomics Hazards", items: getCheckedLabels(ERGONOMICS_HAZARDS, item.ergonomicsHazards || []) },
      { title: "Height Hazards", items: getCheckedLabels(HEIGHT_HAZARDS, item.heightHazards || []) },
      { title: "Activity Hazards", items: getCheckedLabels(ACTIVITY_HAZARDS, item.activityHazards || []) },
      { title: "Access/Egress Hazards", items: getCheckedLabels(ACCESS_EGRESS_HAZARDS, item.accessEgressHazards || []) },
      { title: "Personal Limitations", items: getCheckedLabels(PERSONAL_LIMITATIONS, item.personalLimitationsHazards || []) },
      { title: "PPE Requirements", items: getCheckedLabels(PPE_REQUIREMENTS, item.ppeRequirements || []) },
    ].filter((s) => s.items.length > 0);

    if (hazardSections.length > 0) {
      page.drawText("Identified Hazards & PPE", { x: 50, y, font: fontBold, size: 10, color: black });
      y -= 14;
      for (const section of hazardSections) {
        checkPage(40);
        page.drawText(section.title + ":", { x: 50, y, font: fontBold, size: 8, color: indigo });
        y -= 11;
        const text = section.items.join(" • ");
        const lines = wrapText(text, font, 9, 500);
        for (const line of lines) {
          checkPage(20);
          page.drawText(line, { x: 60, y, font, size: 8, color: black });
          y -= 11;
        }
        y -= 4;
      }
    }

    if (item.otherHazards) {
      checkPage(30);
      page.drawText("Other Hazards:", { x: 50, y, font: fontBold, size: 8, color: indigo });
      y -= 11;
      page.drawText(item.otherHazards.substring(0, 200), { x: 60, y, font, size: 8, color: black, maxWidth: 500 });
      y -= 14;
    }

    y -= 6;
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: lineGray, thickness: 1 });
    y -= 14;

    // Task Steps
    if (item.taskSteps?.length > 0) {
      checkPage(60);
      page.drawText("Task Steps & Hazard Controls", { x: 50, y, font: fontBold, size: 10, color: black });
      y -= 16;

      // Table header
      page.drawText("Task Step", { x: 50, y, font: fontBold, size: 7, color: gray });
      page.drawText("Hazard", { x: 180, y, font: fontBold, size: 7, color: gray });
      page.drawText("Control", { x: 340, y, font: fontBold, size: 7, color: gray });
      page.drawText("Risk", { x: 540, y, font: fontBold, size: 7, color: gray });
      y -= 4;
      page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: lineGray, thickness: 0.5 });
      y -= 12;

      for (const step of item.taskSteps) {
        checkPage(40);
        page.drawText((step.step || "").substring(0, 40), { x: 50, y, font: fontBold, size: 8, color: black, maxWidth: 125 });
        page.drawText((step.hazard || "").substring(0, 60), { x: 180, y, font, size: 7, color: black, maxWidth: 155 });
        page.drawText((step.control || "").substring(0, 60), { x: 340, y, font, size: 7, color: black, maxWidth: 195 });
        page.drawText(String(step.riskRating || "—"), { x: 545, y, font: fontBold, size: 9, color: step.riskRating >= 6 ? rgb(0.8, 0.2, 0.1) : black });
        y -= 16;
      }
      y -= 6;
    }

    // Weather
    checkPage(80);
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: lineGray, thickness: 1 });
    y -= 14;
    page.drawText("Weather", { x: 50, y, font: fontBold, size: 10, color: black });
    y -= 14;
    page.drawText(`Current: ${item.weatherCurrentTemp || "—"}, ${item.weatherCurrentWind || "—"}, ${item.weatherCurrentCondition || "—"}, ${item.weatherCurrentHumidity || "—"} humidity, HI: ${item.weatherCurrentHeatIndex || "—"}`,
      { x: 50, y, font, size: 8, color: black, maxWidth: 500 });
    y -= 12;
    page.drawText(`Forecast: ${item.weatherForecastTemp || "—"}, ${item.weatherForecastWind || "—"}, ${item.weatherForecastCondition || "—"}, ${item.weatherForecastHumidity || "—"} humidity, HI: ${item.weatherForecastHeatIndex || "—"}`,
      { x: 50, y, font, size: 8, color: black, maxWidth: 500 });
    y -= 14;
    page.drawText(`Reviewed weather: ${item.reviewedWeather ? "Yes" : "No"} | Road conditions: ${item.reviewedRoadConditions ? "Yes" : "No"} | OSHA Heat Index: ${item.reviewedOshaHeatIndex ? "Yes" : "No"}`,
      { x: 50, y, font, size: 8, color: black });
    y -= 18;

    // Sign-off
    checkPage(60);
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: lineGray, thickness: 1 });
    y -= 14;
    page.drawText("Review & Sign-off", { x: 50, y, font: fontBold, size: 10, color: black });
    y -= 14;
    page.drawText(`Supervisor: ${item.supervisorName || "—"}`, { x: 50, y, font: fontBold, size: 9, color: black });
    if (item.supervisorVerified) {
      page.drawText(`VERIFIED on ${new Date(item.supervisorTimestamp).toLocaleString()}`, { x: 250, y, font, size: 8, color: rgb(0.1, 0.6, 0.2) });
    }
    y -= 14;
    page.drawText(`Task Description: ${item.taskDescriptionAdequate ? "Adequate" : "Inadequate"} | Hazard ID: ${item.hazardIdentificationAdequate ? "Adequate" : "Inadequate"} | Lead Review: ${item.reviewedByLead ? "Adequate" : "Inadequate"}`,
      { x: 50, y, font, size: 8, color: black });
    y -= 14;

    if (item.evacuationPlan) {
      page.drawText("Evacuation Plan:", { x: 50, y, font: fontBold, size: 8, color: black });
      y -= 11;
      page.drawText(item.evacuationPlan.substring(0, 200), { x: 50, y, font, size: 8, color: black, maxWidth: 500 });
      y -= 14;
    }

    // Footer
    page.drawText(`Generated ${new Date().toLocaleString("en-US")}`, { x: 50, y: 30, font, size: 7, color: gray });
    page.drawText(`${COMPANY_NAME} — Confidential`, { x: 350, y: 30, font, size: 7, color: gray });

    const pdfBytes = await pdf.save();
    const filename = `PSI-JHA-SPA-${item.date}-${item.project?.name?.replace(/\s+/g, "-").slice(0, 30) || "form"}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Simple text wrapping helper
function wrapText(text: string, _font: any, _size: number, maxWidth: number): string[] {
  // Approximate: ~5.5px per character at size 8-9
  const charsPerLine = Math.floor(maxWidth / 4.5);
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= charsPerLine) {
      lines.push(remaining);
      break;
    }
    let breakAt = remaining.lastIndexOf(" ", charsPerLine);
    if (breakAt <= 0) breakAt = charsPerLine;
    lines.push(remaining.substring(0, breakAt));
    remaining = remaining.substring(breakAt).trimStart();
  }
  return lines;
}
