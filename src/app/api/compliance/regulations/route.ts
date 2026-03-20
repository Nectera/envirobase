import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

const VALID_TYPES = ["ASBESTOS", "LEAD", "METH", "MOLD"];

// Cache duration: 90 days
const CACHE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * GET /api/compliance/regulations?state=CO&type=ASBESTOS
 * Returns regulation data for a specific state + service type.
 * If cached data exists and is fresh, returns it. Otherwise generates via AI.
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrg();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const state = (searchParams.get("state") || "").toUpperCase().trim();
  const serviceType = (searchParams.get("type") || "").toUpperCase().trim();

  if (!state || !STATE_NAMES[state]) {
    return NextResponse.json({ error: "Invalid or missing state parameter" }, { status: 400 });
  }
  if (!serviceType || !VALID_TYPES.includes(serviceType)) {
    return NextResponse.json({ error: "Invalid type. Must be ASBESTOS, LEAD, METH, or MOLD" }, { status: 400 });
  }

  // Check cache first
  try {
    const cached = await (prisma as any).stateRegulation.findUnique({
      where: { state_serviceType: { state, serviceType } },
    });

    if (cached && Date.now() - new Date(cached.generatedAt).getTime() < CACHE_MAX_AGE_MS) {
      return NextResponse.json({
        state,
        stateName: STATE_NAMES[state],
        serviceType,
        data: cached.data,
        checklists: cached.checklists,
        generatedAt: cached.generatedAt,
        cached: true,
      });
    }
  } catch {
    // Table may not exist yet if migration hasn't run — continue to generate
  }

  // Generate via AI
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  const stateName = STATE_NAMES[state];
  const serviceLabel = serviceType === "METH" ? "methamphetamine lab decontamination"
    : serviceType === "MOLD" ? "mold remediation"
    : serviceType === "LEAD" ? "lead paint abatement"
    : "asbestos abatement";

  try {
    const client = new Anthropic({ apiKey });

    const prompt = `You are an expert in US environmental remediation regulations. Generate comprehensive regulatory reference data for **${serviceLabel}** in **${stateName}** (${state}).

Return a JSON object with two top-level keys: "data" and "checklists".

**"data"** should be an array of section objects. Each section has:
- "title": section heading (e.g., "Contractor & Crew Requirements")
- "rows": array of [label, value] tuples

Include these sections (adapted to the specific service type and state):
1. Contractor & Crew Requirements (state licensing, certifications, training hours, fees, medical surveillance, PPE)
2. Project Notification & Permits (state agency notifications, deadlines, triggers, permit fees, submission contacts)
3. Removal/Remediation/Decontamination Standards (work practices, containment, PEL limits, waste handling)
4. Clearance & Records (clearance levels, sampling requirements, record retention periods)

Include both state-specific regulations AND relevant federal regulations (OSHA, EPA). Always cite the specific regulation numbers (e.g., "29 CFR 1926.1101", state admin codes).

If ${stateName} does not have state-specific regulations for ${serviceLabel} beyond federal requirements, note that and focus on the applicable federal regulations with any state-specific enforcement contacts or agencies.

**"checklists"** should be an array of section objects for compliance tracking. Each section has:
- "section": phase name (e.g., "Pre-Project", "During Project", "Post-Project")
- "items": array of checklist item objects with:
  - "key": unique identifier (e.g., "asb-pre-1")
  - "req": requirement description
  - "reg": regulation citation
  - "critical": boolean (true if legally required, false if best practice)

Return ONLY valid JSON, no markdown fences or explanation.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "AI returned no content" }, { status: 500 });
    }

    let parsed: { data: any; checklists: any };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      // Try to extract JSON from potential markdown fences
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Cache the result
    try {
      await (prisma as any).stateRegulation.upsert({
        where: { state_serviceType: { state, serviceType } },
        update: {
          data: parsed.data,
          checklists: parsed.checklists,
          generatedAt: new Date(),
        },
        create: {
          state,
          serviceType,
          data: parsed.data,
          checklists: parsed.checklists,
        },
      });
    } catch {
      // Cache write failed — still return the data
    }

    return NextResponse.json({
      state,
      stateName,
      serviceType,
      data: parsed.data,
      checklists: parsed.checklists,
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (error: any) {
    console.error("Regulation generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate regulations. Please try again." },
      { status: 500 }
    );
  }
}
