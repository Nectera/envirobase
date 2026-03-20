import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg, orgWhere } from "@/lib/org-context";

/**
 * GET /api/meth-decon-report/[id]/pdf
 * Generate a branded PDF export of the meth decon report
 * Returns HTML page optimized for printing to PDF
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const org = await requireOrg();

    // Fetch the report with project data
    const report = await prisma.methDeconReport.findUnique({
      where: { id: params.id },
      include: { project: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Generate the HTML
    const html = generatePdfHtml(report);

    // Return HTML with print-optimized styling
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="meth-decon-report-${report.id}.html"`,
      },
    });
  } catch (error: any) {
    console.error("Meth decon report PDF GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface Personnel {
  name: string;
  role: string;
  certNumber?: string;
  certExpires?: string;
}

interface ReportData {
  id: string;
  projectId: string;
  project: {
    id: string;
    name: string;
    address?: string;
    clientPhone?: string;
  };
  date?: string;
  personnel?: Personnel[] | null;
  deconProcedure?: string | null;
  removalProcedure?: string | null;
  encapsulation?: string | null;
  wasteManagement?: string | null;
  variationsFromStd?: string | null;
  completionDate?: string | null;
  signedByName?: string | null;
  signedByTitle?: string | null;
  signedDate?: string | null;
}

function generatePdfHtml(report: ReportData): string {
  const projectName = report.project.name || "Project";
  const projectAddress = report.project.address || "Address not specified";
  const reportDate = report.date || new Date().toISOString().split("T")[0];
  const personnel = (report.personnel as Personnel[]) || [];

  // Parse personnel if it's a JSON string
  const parsedPersonnel =
    typeof report.personnel === "string"
      ? JSON.parse(report.personnel || "[]")
      : personnel;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Methamphetamine Decontamination Summary Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }

    .document {
      background: white;
      max-width: 8.5in;
      height: 11in;
      margin: 20px auto;
      padding: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
    }

    /* Print styles */
    @media print {
      body {
        background: white;
        margin: 0;
        padding: 0;
      }

      .document {
        max-width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        box-shadow: none;
        page-break-after: always;
      }

      .page-break {
        page-break-after: always;
        break-after: page;
      }

      .no-print {
        display: none;
      }
    }

    /* Page setup */
    .page {
      width: 8.5in;
      height: 11in;
      padding: 0.5in;
      page-break-after: always;
      background: white;
    }

    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      min-height: 11in;
      padding: 1in 0.5in;
      background: linear-gradient(135deg, #f8f9fa 0%, white 100%);
    }

    .header-logo {
      color: #7BC143;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 0.5in;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .header-subtitle {
      color: #7BC143;
      font-size: 12px;
      margin-bottom: 1in;
      font-weight: 500;
    }

    .cover-title {
      color: #7BC143;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 0.5in;
      line-height: 1.3;
    }

    .cover-subtitle {
      color: #666;
      font-size: 14px;
      margin-bottom: 1in;
    }

    .project-info {
      background: #f8f9fa;
      padding: 0.75in;
      border-radius: 8px;
      margin-bottom: 1in;
      border-left: 4px solid #7BC143;
    }

    .project-info p {
      margin: 8px 0;
      font-size: 12px;
      color: #555;
    }

    .project-info strong {
      color: #333;
    }

    .footer-company {
      font-size: 11px;
      color: #7BC143;
      font-weight: 600;
      margin-top: auto;
      padding-top: 1in;
      border-top: 2px solid #7BC143;
      width: 100%;
    }

    .footer-company p {
      margin: 4px 0;
    }

    /* Content Pages */
    .content-page {
      min-height: 11in;
      padding: 0.75in;
      font-size: 11px;
      line-height: 1.5;
    }

    .content-page h1 {
      color: #7BC143;
      font-size: 16px;
      margin-bottom: 0.25in;
      padding-bottom: 0.1in;
      border-bottom: 2px solid #7BC143;
    }

    .content-page h2 {
      color: #333;
      font-size: 13px;
      font-weight: 600;
      margin: 0.2in 0 0.1in 0;
    }

    .section {
      margin-bottom: 0.3in;
    }

    .section-content {
      margin-left: 0.2in;
      color: #555;
      font-size: 10px;
      line-height: 1.4;
    }

    .personnel-table {
      width: 100%;
      margin: 0.2in 0;
      border-collapse: collapse;
      font-size: 10px;
    }

    .personnel-table th {
      background: #7BC143;
      color: white;
      padding: 6px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #7BC143;
    }

    .personnel-table td {
      padding: 6px;
      border: 1px solid #ddd;
      background: #fafafa;
    }

    .personnel-table tr:nth-child(even) td {
      background: white;
    }

    .certification-block {
      background: #f8f9fa;
      padding: 0.2in;
      margin: 0.2in 0;
      border-left: 3px solid #7BC143;
      font-size: 9px;
      line-height: 1.3;
      color: #555;
    }

    .signature-block {
      margin-top: 0.3in;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5in;
    }

    .signature-line {
      border-top: 1px solid #333;
      padding-top: 4px;
      font-size: 9px;
      text-align: center;
    }

    .signature-label {
      font-size: 9px;
      color: #666;
      margin-top: 4px;
    }

    .divider-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 11in;
      font-size: 28px;
      color: #7BC143;
      font-weight: 300;
    }

    .page-number {
      position: absolute;
      bottom: 0.3in;
      right: 0.5in;
      font-size: 9px;
      color: #999;
    }

    .intro-text {
      margin-bottom: 0.2in;
      color: #555;
      font-size: 11px;
      line-height: 1.5;
    }

    .print-button {
      display: none;
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #7BC143;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      z-index: 1000;
    }

    @media print {
      .print-button {
        display: none;
      }
    }

    @media screen {
      .print-button {
        display: block;
      }
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="page cover-page">
    <div>
      <div class="header-logo">EnviroBase Environmental Services</div>
      <div class="header-subtitle">Specialized Decontamination Solutions</div>
      <div class="cover-title">METHAMPHETAMINE<br>DECONTAMINATION<br>SUMMARY REPORT</div>
      <div class="cover-subtitle">Professional Remediation Services</div>
    </div>

    <div class="project-info">
      <p><strong>Project Name:</strong></p>
      <p>${escapeHtml(projectName)}</p>
      <p style="margin-top: 0.1in;"><strong>Project Address:</strong></p>
      <p>${escapeHtml(projectAddress)}</p>
      <p style="margin-top: 0.1in;"><strong>Report Date:</strong></p>
      <p>${formatDate(reportDate)}</p>
    </div>

    <div class="footer-company">
      <p>EnviroBase Environmental Services</p>
      <p>903 5th Street, Greeley, CO 80631</p>
      <p>(970) 282-4333</p>
    </div>
  </div>

  <!-- REPORT BODY -->
  <div class="page content-page">
    <h1>DECONTAMINATION REPORT</h1>

    <div class="section">
      <div class="intro-text">
        EnviroBase Environmental Services performed a methamphetamine decontamination at <strong>${escapeHtml(projectAddress)}</strong>. This report documents the procedures performed for this project.
      </div>
    </div>

    ${
      parsedPersonnel.length > 0
        ? `
    <div class="section">
      <h2>Personnel</h2>
      <table class="personnel-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Certification #</th>
            <th>Expires</th>
          </tr>
        </thead>
        <tbody>
          ${parsedPersonnel
            .map(
              (person: Personnel) => `
          <tr>
            <td>${escapeHtml(person.name || "")}</td>
            <td>${escapeHtml(person.role || "")}</td>
            <td>${escapeHtml(person.certNumber || "")}</td>
            <td>${person.certExpires ? formatDate(person.certExpires) : ""}</td>
          </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    `
        : ""
    }

    ${
      report.deconProcedure
        ? `
    <div class="section">
      <h2>Decontamination Procedure</h2>
      <div class="section-content">
        ${escapeHtml(report.deconProcedure).replace(/\n/g, "<br>")}
      </div>
    </div>
    `
        : ""
    }

    ${
      report.removalProcedure
        ? `
    <div class="section">
      <h2>Removal Procedure</h2>
      <div class="section-content">
        ${escapeHtml(report.removalProcedure).replace(/\n/g, "<br>")}
      </div>
    </div>
    `
        : ""
    }
  </div>

  <!-- PAGE 3: Additional Procedures -->
  <div class="page content-page">
    ${
      report.encapsulation
        ? `
    <div class="section">
      <h2>Encapsulation Procedure</h2>
      <div class="section-content">
        ${escapeHtml(report.encapsulation).replace(/\n/g, "<br>")}
      </div>
    </div>
    `
        : ""
    }

    ${
      report.wasteManagement
        ? `
    <div class="section">
      <h2>Waste Management</h2>
      <div class="section-content">
        ${escapeHtml(report.wasteManagement).replace(/\n/g, "<br>")}
      </div>
    </div>
    `
        : ""
    }

    ${
      report.variationsFromStd
        ? `
    <div class="section">
      <h2>Variations from Standard Practice</h2>
      <div class="section-content">
        ${escapeHtml(report.variationsFromStd).replace(/\n/g, "<br>")}
      </div>
    </div>
    `
        : ""
    }

    <div class="section" style="margin-top: 0.3in;">
      <h2>Certification Statement</h2>
      <div class="certification-block">
        <p>This methamphetamine decontamination was performed in accordance with the Colorado Department of Public Health and Environment regulations, 6 CCR 1014-3: Rules Regulating Marijuana-Infused Product Manufacturing, and relevant Colorado Public Health Order guidelines. All procedures meet or exceed state standards for remediation of methamphetamine contamination.</p>
        <p style="margin-top: 0.1in;">The contractor certifies that all work was completed to professional standards and that the site has been remediated to acceptable contamination levels.</p>
      </div>
    </div>

    <div class="signature-block">
      <div>
        <div class="signature-line">&nbsp;</div>
        <div class="signature-label">Authorized Representative Signature</div>
      </div>
      <div>
        <div style="border-top: 1px solid #333; padding-top: 4px; font-size: 9px; text-align: center;">
          ${report.signedDate ? formatDate(report.signedDate) : "_______________"}
        </div>
        <div class="signature-label">Date</div>
      </div>
    </div>

    <div style="margin-top: 0.2in; font-size: 9px; color: #666;">
      <p><strong>Printed Name:</strong> ${escapeHtml(report.signedByName || "")}</p>
      <p><strong>Title:</strong> ${escapeHtml(report.signedByTitle || "")}</p>
    </div>
  </div>

  <!-- ATTACHMENTS DIVIDER -->
  <div class="page divider-page">
    <div>
      <div style="font-size: 24px; color: #7BC143;">Attachments</div>
    </div>
  </div>

  <!-- CERTIFICATIONS DIVIDER -->
  <div class="page divider-page">
    <div>
      <div style="font-size: 24px; color: #7BC143;">Certifications</div>
    </div>
  </div>

  <button class="print-button no-print" onclick="window.print()">Print to PDF</button>

  <script>
    // Auto-open print dialog on load in non-mobile environments
    // Commented out to allow user control
    // window.addEventListener('load', function() {
    //   if (!/Mobile|Android|iPhone/.test(navigator.userAgent)) {
    //     setTimeout(() => window.print(), 500);
    //   }
    // });
  </script>
</body>
</html>
  `;

  return html;
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}
