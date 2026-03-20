import Anthropic from "@anthropic-ai/sdk";
import { sendHtmlEmail, escapeHtml } from "./email";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { sendNotificationToRole, buildFieldReportBody } from "./notifications";
import { COMPANY_SHORT, COMPANY_NAME, COMPANY_LOCATION, BRAND_COLOR } from "./branding";
import { supabase, DFR_PHOTOS_BUCKET } from "./supabase";

/**
 * Upload a base64 data URL image to Supabase Storage and return a public URL.
 * Falls back to the original dataUrl if upload fails.
 */
async function uploadPhotoToStorage(
  dataUrl: string,
  reportId: string,
  index: number,
): Promise<string> {
  try {
    // Parse the base64 data URL: data:image/jpeg;base64,/9j/4AAQ...
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return dataUrl;

    const mimeType = match[1];
    const base64Data = match[2];
    const ext = mimeType.split("/")[1] || "jpg";
    const buffer = Buffer.from(base64Data, "base64");

    const storagePath = `${reportId}/${Date.now()}-${index}.${ext}`;

    const { data, error } = await supabase.storage
      .from(DFR_PHOTOS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error("[DFR-EMAIL] Supabase photo upload failed:", error.message);
      return dataUrl; // Fall back to base64
    }

    const { data: urlData } = supabase.storage
      .from(DFR_PHOTOS_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err: any) {
    console.error("[DFR-EMAIL] Photo upload error:", err.message);
    return dataUrl; // Fall back to base64
  }
}

/**
 * Use Claude AI to generate a professional summary of a daily field report.
 */
async function summarizeFieldReport(reportData: any): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.error("ANTHROPIC_API_KEY not configured — skipping AI summary");
    return buildFallbackSummary(reportData);
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build a clean data payload for the AI — strip base64 images and Prisma metadata
    // to stay well under token limits
    const cleanData: any = {};
    const skipKeys = new Set(["id", "projectId", "createdAt", "updatedAt", "data", "project"]);
    for (const [key, val] of Object.entries(reportData)) {
      if (skipKeys.has(key)) continue;
      if (typeof val === "string" && val.startsWith("data:")) continue; // skip base64
      cleanData[key] = val;
    }
    // Strip base64 from photo arrays — keep only filenames and captions
    if (Array.isArray(cleanData.photos)) {
      cleanData.photos = cleanData.photos.map((p: any) => ({
        filename: p.filename,
        caption: p.caption,
      }));
    }
    if (Array.isArray(cleanData.dailyPictures)) {
      cleanData.dailyPictures = cleanData.dailyPictures.map((p: any) => ({
        filename: p.filename,
        caption: p.caption,
      }));
    }
    if (cleanData.manometerPhoto && typeof cleanData.manometerPhoto === "object") {
      cleanData.manometerPhoto = { filename: cleanData.manometerPhoto.filename, caption: cleanData.manometerPhoto.caption };
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are writing a professional daily progress email for an environmental remediation project. Based on the following field report data, write a concise summary (3-5 paragraphs) covering:

1. What work was accomplished today
2. Site conditions and any notable details (weather, crew size, equipment)
3. Goals for tomorrow

Write in a professional but friendly tone, as if updating a property owner or client on their project. Do not include greetings or sign-offs — just the body content. Use plain text paragraphs, no bullet points or markdown.

Field Report Data:
${JSON.stringify(cleanData, null, 2)}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return (textBlock as any)?.text || buildFallbackSummary(reportData);
  } catch (error: any) {
    logger.error("AI summary generation failed", { error: error.message });
    return buildFallbackSummary(reportData);
  }
}

/**
 * Fallback summary if AI is unavailable.
 */
function buildFallbackSummary(data: any): string {
  const parts: string[] = [];
  if (data.workPerformedToday) {
    parts.push(`Work performed today: ${data.workPerformedToday}`);
  }
  if (data.goalsForTomorrow) {
    parts.push(`Goals for tomorrow: ${data.goalsForTomorrow}`);
  }
  if (data.supervisorName) {
    parts.push(`Supervisor: ${data.supervisorName}`);
  }
  return parts.join("\n\n") || "A daily field report has been submitted for this project.";
}

/**
 * Build the branded HTML email for a field report.
 */
function buildFieldReportHtml(
  projectName: string,
  reportDate: string,
  supervisorName: string,
  weather: string,
  summary: string,
  photos: Array<{ url?: string; caption?: string; filename?: string }>,
): string {
  const escapedProject = escapeHtml(projectName);
  const escapedDate = escapeHtml(reportDate);
  const escapedSupervisor = escapeHtml(supervisorName || "N/A");
  const escapedWeather = escapeHtml(weather || "N/A");

  // Convert summary paragraphs to HTML
  const summaryHtml = summary
    .split("\n\n")
    .filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">${escapeHtml(p.trim())}</p>`)
    .join("");

  // Build photo section
  let photosHtml = "";
  const validPhotos = photos.filter((p) => p.url);
  if (validPhotos.length > 0) {
    const photoItems = validPhotos
      .map((p) => {
        const caption = p.caption || p.filename || "Site photo";
        return `
        <tr><td style="padding:8px 0;">
          <img src="${p.url}" alt="${escapeHtml(caption)}" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;" />
          <p style="margin:4px 0 0;color:#64748b;font-size:12px;">${escapeHtml(caption)}</p>
        </td></tr>`;
      })
      .join("");

    photosHtml = `
      <tr><td style="padding:24px 0 8px;">
        <h3 style="margin:0;color:#1e293b;font-size:15px;font-weight:600;">Site Photos</h3>
      </td></tr>
      ${photoItems}`;
  }

  const content = `
    <h2 style="margin:0 0 4px;color:#1e293b;font-size:18px;font-weight:700;">Daily Field Report</h2>
    <p style="margin:0 0 20px;color:${BRAND_COLOR};font-size:14px;font-weight:600;">${escapedProject}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding:0 0 4px;">Date</td>
            <td style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding:0 0 4px;">Supervisor</td>
            <td style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding:0 0 4px;">Weather</td>
          </tr>
          <tr>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${escapedDate}</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${escapedSupervisor}</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${escapedWeather}</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <h3 style="margin:0 0 12px;color:#1e293b;font-size:15px;font-weight:600;">Progress Summary</h3>
    ${summaryHtml}

    <table width="100%" cellpadding="0" cellspacing="0">
      ${photosHtml}
    </table>
  `;

  // Use the same branded wrapper pattern as other emails
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A2D;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${COMPANY_SHORT}</h1>
          <p style="margin:4px 0 0;color:${BRAND_COLOR};font-size:13px;">Daily Progress Update</p>
        </td></tr>
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            ${COMPANY_NAME} &bull; ${COMPANY_LOCATION}<br>
            This is an automated progress update from your project team.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Resolve customer email from project by tracing back to the lead/contact.
 */
async function resolveCustomerEmail(projectId: string): Promise<{ email: string; name: string } | null> {
  try {
    const lead = await prisma.lead.findFirst({
      where: { projectId },
      include: { contact: true },
    });

    if (!lead) {
      logger.warn("No lead found for project — cannot send field report email", { projectId });
      return null;
    }

    const email = lead.contact?.email || lead.email;
    if (!email) {
      logger.warn("No customer email found on lead or contact", { projectId, leadId: lead.id });
      return null;
    }

    const name = lead.contact
      ? `${lead.contact.firstName || ""} ${lead.contact.lastName || ""}`.trim()
      : `${lead.firstName || ""} ${lead.lastName || ""}`.trim();

    return { email, name: name || "Valued Customer" };
  } catch (error: any) {
    logger.error("Error resolving customer email", { error: error.message, projectId });
    return null;
  }
}

/**
 * Main entry point: summarize a field report with AI and send a branded email to the customer.
 * Call this fire-and-forget after a report is submitted.
 */
export async function sendFieldReportEmail(
  reportId: string,
  projectId: string,
): Promise<void> {
  try {
    console.log("[DFR-EMAIL] Starting email flow", { reportId, projectId });

    // Fetch the report and project
    const report = await prisma.dailyFieldReport.findUnique({ where: { id: reportId } });
    if (!report) {
      console.error("[DFR-EMAIL] Report not found", { reportId });
      return;
    }
    console.log("[DFR-EMAIL] Report found, status:", report.status);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      console.error("[DFR-EMAIL] Project not found", { projectId });
      return;
    }
    console.log("[DFR-EMAIL] Project found:", project.name);

    // Resolve customer
    const customer = await resolveCustomerEmail(projectId);
    if (!customer) {
      console.error("[DFR-EMAIL] No customer email resolved for project", { projectId });
      return;
    }
    console.log("[DFR-EMAIL] Customer resolved:", customer.email);

    // Flatten report data
    const reportData: any = {
      ...report,
      ...(report.data && typeof report.data === "object" ? report.data : {}),
    };

    // Generate AI summary
    console.log("[DFR-EMAIL] Generating AI summary...");
    const summary = await summarizeFieldReport(reportData);
    console.log("[DFR-EMAIL] AI summary generated, length:", summary.length);

    // Collect photos — form uses "photos" key, also check "dailyPictures"
    // Photos may already have Supabase URLs (new flow) or base64 dataUrls (legacy)
    const rawPhotos: Array<{ url?: string; dataUrl?: string; caption?: string; filename?: string }> = [];
    if (reportData.manometerPhoto?.dataUrl || reportData.manometerPhoto?.url) {
      rawPhotos.push({
        url: reportData.manometerPhoto.url,
        dataUrl: reportData.manometerPhoto.dataUrl,
        caption: "Manometer Reading",
        filename: reportData.manometerPhoto.filename,
      });
    }
    const pictureArray = reportData.dailyPictures || reportData.photos || [];
    if (Array.isArray(pictureArray)) {
      for (const pic of pictureArray) {
        if (pic.url || pic.dataUrl) {
          rawPhotos.push({
            url: pic.url,
            dataUrl: pic.dataUrl,
            caption: pic.caption || pic.filename,
            filename: pic.filename,
          });
        }
      }
    }
    console.log("[DFR-EMAIL] Photos collected:", rawPhotos.length, "— uploading to storage...");

    // Upload photos to Supabase Storage in parallel for proper email rendering
    // Skip upload if photo already has a non-base64 URL
    const photos: Array<{ url?: string; caption?: string; filename?: string }> = await Promise.all(
      rawPhotos.map(async (p, i) => {
        let url = p.url;
        if (!url && p.dataUrl) {
          url = await uploadPhotoToStorage(p.dataUrl, reportId, i);
        }
        return { url, caption: p.caption, filename: p.filename };
      }),
    );
    console.log("[DFR-EMAIL] Photos uploaded to storage:", photos.filter(p => p.url && !p.url.startsWith("data:")).length);

    // Build and send email
    const reportDate = reportData.date || new Date().toISOString().split("T")[0];
    const html = buildFieldReportHtml(
      project.name,
      reportDate,
      reportData.supervisorName || "",
      reportData.weather || "",
      summary,
      photos,
    );

    const plainText = `Daily Field Report — ${project.name}\nDate: ${reportDate}\n\n${summary}`;

    console.log("[DFR-EMAIL] Sending email to:", customer.email, "subject:", `Daily Progress Update — ${project.name} (${reportDate})`);
    const result = await sendHtmlEmail({
      to: customer.email,
      subject: `Daily Progress Update — ${project.name} (${reportDate})`,
      html,
      text: plainText,
    });

    if (result.success) {
      console.log("[DFR-EMAIL] Email sent successfully!", { messageId: result.messageId, to: customer.email });
    } else {
      console.error("[DFR-EMAIL] Email send FAILED:", result.error);
    }

    // Also notify office/PM users that a field report was submitted
    try {
      const notifBody = buildFieldReportBody(
        project.name,
        reportDate,
        reportData.supervisorName || "",
      );
      sendNotificationToRole("ADMIN", "fieldReportSubmitted", `Field Report Submitted: ${project.name} (${reportDate})`, notifBody);
      sendNotificationToRole("SUPERVISOR", "fieldReportSubmitted", `Field Report Submitted: ${project.name} (${reportDate})`, notifBody);
    } catch { /* notification failure should not block main email */ }
  } catch (error: any) {
    console.error("[DFR-EMAIL] UNCAUGHT ERROR:", error.message, error.stack);
  }
}
