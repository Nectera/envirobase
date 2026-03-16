import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { COMPANY_NAME } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await requireOrg();
    if (result instanceof NextResponse) return result;
    const { session, orgId } = result;

    const cert = await prisma.certificateOfCompletion.findUnique({
      where: orgWhere(orgId, { id: params.id }),
      include: { project: true },
    });

    if (!cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size: 8.5" x 11"
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 40;

    // Header (centered manually)
    const headerText = COMPANY_NAME;
    const headerWidth = boldFont.widthOfTextAtSize(headerText, 16);
    page.drawText(headerText, {
      x: (width - headerWidth) / 2,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    const addrText = "903 5th St., Greeley, CO 80631";
    const addrWidth = font.widthOfTextAtSize(addrText, 10);
    page.drawText(addrText, {
      x: (width - addrWidth) / 2,
      y: y,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Title
    const titleText = "Certificate of Completion";
    const titleWidth = boldFont.widthOfTextAtSize(titleText, 18);
    page.drawText(titleText, {
      x: (width - titleWidth) / 2,
      y: y,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    // Fields section
    const fieldX = 40;
    const fieldWidth = width - 80;
    const labelFont = font;
    const labelSize = 10;
    const valueSize = 11;

    const drawField = (label: string, value: string) => {
      page.drawText(label, {
        x: fieldX,
        y: y,
        size: labelSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      page.drawText(value || "____________________________", {
        x: fieldX + 150,
        y: y,
        size: valueSize,
        font: font,
        color: rgb(0, 0, 0),
        maxWidth: fieldWidth - 150,
      });
      y -= 18;
    };

    drawField("Work Site Address:", cert.workSiteAddress);
    drawField("Policy Number:", cert.policyNumber);
    drawField("Claim Number:", cert.claimNumber);
    drawField("Purchase Order Number:", cert.purchaseOrderNumber);
    drawField("Job Number:", cert.jobNumber);

    y -= 10;

    // Body text
    const bodyText = `This will certify that the services provided by ${COMPANY_NAME} at the work site have been completed to my entire satisfaction. Additionally, the work area is clean of debris and there are no identifiable damages. These services were deemed complete with demobilization on ${cert.demobilizationDate ? new Date(cert.demobilizationDate).toLocaleDateString("en-US") : "_______________"}.`;

    const lines = bodyText.split("\n");
    page.drawText(bodyText, {
      x: fieldX,
      y: y,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
      maxWidth: fieldWidth,
      lineHeight: 14,
    });

    // Estimate text height
    const textHeight = Math.ceil(bodyText.length / 80) * 14;
    y -= textHeight + 20;

    // Signature section
    const signatureY = y;
    const leftX = fieldX;
    const rightX = width / 2 + 10;
    const lineLength = 140;

    // Left column: Property Owner
    page.drawText("Property Owner/Agent", {
      x: leftX,
      y: signatureY,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    page.drawText("(must be at least 18 years old)", {
      x: leftX,
      y: signatureY - 12,
      size: 8,
      font: font,
      color: rgb(128, 128, 128),
    });

    // Signature line
    page.drawLine({
      start: { x: leftX, y: signatureY - 35 },
      end: { x: leftX + lineLength, y: signatureY - 35 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawText("Signature", {
      x: leftX,
      y: signatureY - 45,
      size: 8,
      font: font,
      color: rgb(128, 128, 128),
    });

    // Name line
    page.drawLine({
      start: { x: leftX, y: signatureY - 60 },
      end: { x: leftX + lineLength, y: signatureY - 60 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawText("Printed Name", {
      x: leftX,
      y: signatureY - 70,
      size: 8,
      font: font,
      color: rgb(128, 128, 128),
    });

    // Date line
    page.drawLine({
      start: { x: leftX, y: signatureY - 85 },
      end: { x: leftX + lineLength, y: signatureY - 85 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawText("Date", {
      x: leftX,
      y: signatureY - 95,
      size: 8,
      font: font,
      color: rgb(128, 128, 128),
    });

    // Right column: Company Rep
    page.drawText("Company Representative", {
      x: rightX,
      y: signatureY,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    page.drawText(COMPANY_NAME, {
      x: rightX,
      y: signatureY - 12,
      size: 8,
      font: font,
      color: rgb(128, 128, 128),
    });

    // Signature line
    page.drawLine({
      start: { x: rightX, y: signatureY - 35 },
      end: { x: rightX + lineLength, y: signatureY - 35 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawText("Signature", {
      x: rightX,
      y: signatureY - 45,
      size: 8,
      font: font,
      color: rgb(128, 128, 128),
    });

    // Name line
    page.drawLine({
      start: { x: rightX, y: signatureY - 60 },
      end: { x: rightX + lineLength, y: signatureY - 60 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawText("Printed Name", {
      x: rightX,
      y: signatureY - 70,
      size: 8,
      font: font,
      color: rgb(128, 128, 128),
    });

    // Date line
    page.drawLine({
      start: { x: rightX, y: signatureY - 85 },
      end: { x: rightX + lineLength, y: signatureY - 85 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawText("Date", {
      x: rightX,
      y: signatureY - 95,
      size: 8,
      font: font,
      color: rgb(128, 128, 128),
    });

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Certificate-of-Completion-${cert.id}.pdf"`,
      },
    });
  } catch (error: any) {
    logger.error("PDF generation error:", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
