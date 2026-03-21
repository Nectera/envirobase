import { NextRequest, NextResponse } from "next/server";
import { requireOrg, orgWhere, orgData } from "@/lib/org-context";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { toolDefinitions, ADMIN_ONLY_TOOLS, executeTool } from "./tools";
import { checkRateLimit, AI_ASSISTANT_LIMIT } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const MAX_TOOL_ROUNDS = 8;

function buildSystemPrompt(memories: any[], role: string, knowledgeBaseArticles: any[] = []): string {
  const memoryBlock = memories.length > 0
    ? `\n\nYou have the following saved memories from past conversations:\n${memories.map((m: any) => `- [${m.category}] ${m.content}`).join("\n")}`
    : "";

  let knowledgeBaseBlock = "";
  if (knowledgeBaseArticles.length > 0) {
    const grouped: Record<string, any[]> = {};
    for (const a of knowledgeBaseArticles) {
      const cat = a.category || "General";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(a);
    }
    let kb = "\n\n## Company Knowledge Base\nUse this knowledge base to answer employee questions about training, safety, procedures, and company policies.\n";
    let totalChars = 0;
    const MAX_CHARS = 15000; // ~5000 tokens
    for (const [category, articles] of Object.entries(grouped)) {
      kb += `\n### ${category}\n`;
      for (const art of articles) {
        const entry = `**${art.title}**: ${art.content}\n`;
        if (totalChars + entry.length > MAX_CHARS) break;
        kb += entry;
        totalChars += entry.length;
      }
      if (totalChars >= MAX_CHARS) break;
    }
    knowledgeBaseBlock = kb;
  }

  const isAdmin = role === "ADMIN" || role === "PROJECT_MANAGER" || role === "SUPERVISOR";

  const adminCapabilities = isAdmin
    ? `
You have FULL data mutation capabilities as an admin/supervisor:
- **Schedule management**: Swap workers on the schedule, create/delete schedule entries, reassign workers to different projects
- **Edit any record**: Update leads, contacts, companies, workers, and projects (all fields)
- **Delete records**: Delete leads and tasks when requested
- When modifying data, always confirm what you changed so the user knows the action was taken.
- For schedule swaps, look up the workers by name first to get their IDs, then perform the swap.`
    : `
You have limited write access as a ${role.toLowerCase().replace("_", " ")}:
- Create leads and tasks
- Update lead, task, and project statuses
- Log activities on leads
- If the user asks you to modify schedules, edit records, or delete data, let them know this requires admin or supervisor privileges.`;

  return `You are the EnviroBase AI Assistant — the built-in AI for EnviroBase Environmental Services' project management app.

## About the Company
EnviroBase Environmental Services is a Colorado-based environmental remediation company specializing in asbestos abatement, lead paint remediation, meth lab cleanup, mold remediation, selective demolition, and rebuild services. They operate from two offices:
- **Greeley Office** — covers the Front Range (east of Vail), Northern Colorado, and Southeast Colorado
- **Grand Junction Office** — covers the Western Slope (west of Vail)

The owner is Cody Gordon.

## Your Role
You are logged in as a user with the **${role}** role.

## Your Capabilities
You can read and query all data in the app: projects, leads, tasks, workers, schedule, time entries, invoices, metrics, companies, contacts, and alerts.

You can take actions:
- Create leads and tasks
- Update lead, task, and project statuses
- Log activities (notes, calls, emails) on leads
- Save and recall memories for future reference
- **Suggest optimal crew scheduling** — Recommend which employees to assign to a project based on:
  - Proximity: How close each worker lives to the project site (uses Colorado city coordinates and estimated drive times)
  - Availability: Who is free during the requested date range (checks existing schedule)
  - Certifications: Whether the worker has experience with the project type (asbestos, lead, mold, etc.)
  - Role fit: Supervisors and lead techs score higher for crew leadership needs
${adminCapabilities}

When asked about scheduling, use the suggest_optimal_schedule tool. Present results clearly with distance, drive time, and availability for each recommended worker. Always recommend the crew size from the estimate if available.

## Guidelines
- Be concise and direct — users are busy professionals
- When listing data, use brief summaries, not full dumps
- When taking actions, confirm what you did
- Proactively save useful information to memory when the user shares preferences, important facts, or recurring patterns
- If you're unsure which record the user means, show them the closest matches and ask to confirm
- Use the current date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
- Format currency values properly (e.g., $50,000)
- Format dates in a readable way (e.g., March 1, 2026)
${knowledgeBaseBlock}${memoryBlock}`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId } = await req.json();

    // Read role from server session — never trust client-provided role
    const auth = await requireOrg();
    if (auth instanceof NextResponse) return auth;
    const { session, orgId } = auth;
    const userRole = (session?.user as any)?.role || "TECHNICIAN";
    const userId = (session?.user as any)?.id || "anonymous";

    // Rate limit: 20 requests per minute per user
    const rl = checkRateLimit(`ai:${userId}`, AI_ASSISTANT_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured. Add it to your .env.local file." },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Load persistent memories and knowledge base
    const allMemories = await prisma.assistantMemory.findMany({
      where: orgWhere(orgId, {}),
    });
    const knowledgeBaseArticles = await prisma.knowledgeBase.findMany({
      where: orgWhere(orgId, {}),
    });

    // Load or create conversation
    let conversation: any = null;
    if (conversationId) {
      conversation = await prisma.assistantConversation.findFirst({
        where: orgWhere(orgId, { id: conversationId }),
      });
    }

    // Build message history
    const conversationMessages = conversation?.messages || [];
    const allMessages = [...conversationMessages, ...messages];

    // Keep last 20 messages to stay within token limits (system prompt + tools + KB use ~10-15K tokens)
    const trimmedMessages = allMessages.slice(-20);

    const systemPrompt = buildSystemPrompt(allMemories, userRole, knowledgeBaseArticles);

    // Filter tools based on role — hide admin-only tools from non-admin users
    const isAdmin = userRole === "ADMIN" || userRole === "PROJECT_MANAGER" || userRole === "SUPERVISOR";
    const filteredTools = isAdmin
      ? toolDefinitions
      : toolDefinitions.filter((t) => !ADMIN_ONLY_TOOLS.has(t.name));

    // Tool use loop
    let currentMessages = trimmedMessages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let finalResponse = "";
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      // Retry with backoff on rate limit (429) errors
      let response: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: filteredTools as any,
          });
          break; // Success
        } catch (apiError: any) {
          if (apiError?.status === 429 && attempt < 2) {
            // Wait before retrying: 2s, 4s
            await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
            continue;
          }
          throw apiError;
        }
      }

      // Check if we got tool use blocks
      const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use");
      const textBlocks = response.content.filter((b: any) => b.type === "text");

      if (toolUseBlocks.length === 0) {
        // No tool calls — final text response
        finalResponse = textBlocks.map((b: any) => (b as any).text).join("\n");
        break;
      }

      // Add assistant response with tool use to messages
      currentMessages.push({
        role: "assistant",
        content: response.content as any,
      });

      // Execute each tool call and collect results
      const toolResults: any[] = [];
      for (const toolBlock of toolUseBlocks) {
        const block = toolBlock as any;
        const result = await executeTool(block.name, block.input, userRole);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      // Add tool results to messages
      currentMessages.push({
        role: "user",
        content: toolResults as any,
      });

      // Also capture any text from this round
      if (textBlocks.length > 0 && response.stop_reason === "end_turn") {
        finalResponse = textBlocks.map((b: any) => (b as any).text).join("\n");
        break;
      }
    }

    // Save conversation
    const savedMessages = [
      ...conversationMessages,
      ...messages,
      { role: "assistant", content: finalResponse },
    ];

    if (conversation) {
      await prisma.assistantConversation.update({
        where: orgWhere(orgId, { id: conversation.id }),
        data: { messages: savedMessages },
      });
    } else {
      conversation = await prisma.assistantConversation.create({
        data: orgData(orgId, { messages: savedMessages }),
      });
    }

    return NextResponse.json({
      response: finalResponse,
      conversationId: conversation.id,
    });
  } catch (error: any) {
    console.error("AI Assistant error:", error?.message || error, error?.stack);

    // Friendly message for Anthropic rate limit errors
    if (error?.status === 429 || error?.message?.includes("rate_limit")) {
      return NextResponse.json(
        { error: "I'm getting too many requests right now. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
