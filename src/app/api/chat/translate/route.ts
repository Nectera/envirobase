import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/org-context";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/translate
 * Translate text between English and Spanish.
 * Uses Google Translate free API (no key required).
 *
 * Body: { text: string, targetLang?: "en" | "es" }
 * If targetLang is omitted, auto-detects: if text is Spanish → translate to English, otherwise → Spanish.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { text, targetLang } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Cap at 5000 chars to prevent abuse
    const cleanText = text.trim().slice(0, 5000);

    // Step 1: Detect the source language
    const detectUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(cleanText)}`;
    const detectRes = await fetch(detectUrl);
    if (!detectRes.ok) {
      console.error("[TRANSLATE] Detection failed:", detectRes.status);
      return NextResponse.json({ error: "Translation service unavailable" }, { status: 502 });
    }
    const detectData = await detectRes.json();
    const detectedLang: string = detectData[2] || "en";

    // Step 2: Determine target language
    let target = targetLang;
    if (!target) {
      target = detectedLang === "es" ? "en" : "es";
    }

    // Translate
    const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const translateRes = await fetch(translateUrl);
    if (!translateRes.ok) {
      console.error("[TRANSLATE] Translation failed:", translateRes.status);
      return NextResponse.json({ error: "Translation service unavailable" }, { status: 502 });
    }
    const translateData = await translateRes.json();

    // Extract translated text from Google's response format
    let translated = "";
    if (Array.isArray(translateData[0])) {
      translated = translateData[0]
        .map((segment: any) => (Array.isArray(segment) ? segment[0] : ""))
        .join("");
    }

    if (!translated) {
      return NextResponse.json({ error: "Translation failed" }, { status: 500 });
    }

    return NextResponse.json({
      translated,
      sourceLang: detectedLang,
      targetLang: target,
    });
  } catch (error: any) {
    console.error("[TRANSLATE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
