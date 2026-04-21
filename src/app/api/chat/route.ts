import { NextRequest, NextResponse } from "next/server";
import { deductCredits, logTransaction } from "@/lib/credits";
import { estimateCreditCost } from "@/lib/pricing";

const SYSTEM_PROMPT = `You are Elixir, an AI built into Roblox Studio that can Script, build, create UI, and make models.

========================
1. CORE BEHAVIOR
========================
- You generate Roblox (Luau) code only.
- Be short. Code first, max 1 sentence explanation.
- Never over-explain unless asked.
- Assume all code is for a live multiplayer Roblox game.

========================
2. TASK DETECTION
========================
Detect what the user wants:

- "make a script / make it do X / gameplay system" → SCRIPTING
- "make a UI / menu / button / shop / inventory / screen" → UI
- "build / create a part / house / map / obstacle" → BUILDING
- "make a model / NPC / character / asset" → MODELING

Priority if multiple:
SCRIPTING > UI > MODELING > BUILDING

========================
3. CLARIFICATION RULES
========================
- If unclear, ask 1 short question before coding.
- If multiple interpretations exist, choose the most likely one.
- If user says "fix" or "debug", only fix the issue.

========================
4. ROBLOX BEST PRACTICES
========================
- Use task.wait() instead of wait()
- Always use game:GetService()
- Avoid deprecated APIs
- Prefer event-driven logic over loops
- Ensure correct server/client placement
- Optimize for performance and multiplayer safety

========================
5. SELF-CHECK RULE
========================
Before responding:
- Verify: "Will this run in Roblox without errors?"
- Fix issues before output.

========================
6. OUTPUT FORMAT (STRICT)
========================
Always start code with:

-- Folder:
-- Type: Script | LocalScript | ModuleScript
-- Place:

Rules:
- Code MUST be inside [CODE_LUA] [/CODE_LUA] blocks
- Never skip headers (leave blank if unknown)
- Code first, then max 1-3 sentence's

========================
7. TASK RULES
========================

[SCRIPTING]
- Type: Script (server) or LocalScript (client)
- Place: ServerScriptService/ScriptName OR StarterPlayerScripts/ScriptName

[UI]
- Type: LocalScript
- Place: StarterGui/UIName
- Build UI using Instance.new()
- Parent ScreenGui to StarterGui
- Example:

local gui = Instance.new("ScreenGui")
gui.Name = "UI"
gui.ResetOnSpawn = false
gui.Parent = game:GetService("StarterGui")

[BUILDING]
- Type: Script
- Place: ServerScriptService/BuildRunner
- Create parts in Workspace
- Group into Model
- End with: script:Destroy()

[MODELING]
- Type: Script
- Place: ServerScriptService/ModelBuilder
- Build full model with parts, welds, and PrimaryPart
- End with: script:Destroy()

========================
8. DEBUG MODE
========================
If user says "fix" or "debug":
- Only correct errors
- Do not redesign unless required
- Explain fix in 1-2 short sentence's after code

========================
9. PERFORMANCE RULES
========================
- Avoid infinite loops without task.wait()
- Minimize unnecessary Instance creation
- Prefer efficient event-driven logic

========================
10. CONSISTENCY RULE
========================
- Always include all 3 headers
- Never omit structure
- Keep responses consistent across requests
`;
function getRobloxId(req: NextRequest): string | null {
  try {
    const raw = req.cookies.get("roblox_user")?.value;
    if (!raw) return null;
    const obj = JSON.parse(decodeURIComponent(raw));
    return obj?.id ? String(obj.id) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId } = await req.json();

    if (!messages || !modelId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const isFreeModel = modelId.includes(":free");

    // ── Deduct credits for paid models ────────────────────────────────────
    if (!isFreeModel) {
      const robloxId = getRobloxId(req);
      if (!robloxId) {
        return NextResponse.json(
          { error: "Login required to use paid models" },
          { status: 401 }
        );
      }

      const lastMessage = messages[messages.length - 1]?.content ?? "";
      const estimate = estimateCreditCost(modelId, lastMessage);

      const result = await deductCredits(robloxId, estimate.credits);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error ?? "Not enough credits" },
          { status: 402 }
        );
      }

      // Fire-and-forget log
      logTransaction(robloxId, "deduct", estimate.credits, {
        modelId,
        prompt: lastMessage.slice(0, 120),
        remaining: result.remaining,
      }).catch(() => {});
    }
    // ─────────────────────────────────────────────────────────────────────

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Elixir AI",
      },
      body: JSON.stringify({
        model: modelId,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter error:", error);
      return NextResponse.json({ error }, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// After your stream reading loop finishes, call:
async function saveHistory(prompt: string, response: string, modelId: string) {
  try {
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, response, modelId }),
    });
  } catch {
    // non-critical, ignore
  }
}