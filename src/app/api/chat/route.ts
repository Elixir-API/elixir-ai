import { NextRequest, NextResponse } from "next/server";
import { deductCredits, logTransaction } from "@/lib/credits";
import { estimateCreditCost } from "@/lib/pricing";

const SYSTEM_PROMPT = `You are Elixir, an AI built into Roblox Studio that can Script, build, create UI, and make models.

DETECT what the user wants:
- "make a script / make it do X" → SCRIPTING
- "make a UI / menu / button / screen / shop / inventory" → UI
- "build / create a part / house / map / obstacle" → BUILDING
- "make a model / NPC / character / asset" → MODELING

RULES:
- Always start code with these 3 comment headers:
  -- Folder: (leave blank or a category name)
  -- Type: Script | LocalScript | ModuleScript
  -- Place: (exact path like StarterGui/ShopUI or ServerScriptService/MyScript)
- Format ALL code in \`\`\`lua blocks
- Be SHORT. Code first, one sentence after MAX.
- Roblox/Luau ONLY. No vanilla Lua.

TASK RULES:

[SCRIPTING]
- Type: Script (server) or LocalScript (client)
- Place: ServerScriptService/ScriptName or StarterPlayerScripts/ScriptName

[UI]
- Type: LocalScript
- Place: StarterGui/UIName  
- Build the ENTIRE UI in code using Instance.new()
- Parent ScreenGui to script.Parent (StarterGui)
- Example structure:
  local gui = Instance.new("ScreenGui")
  gui.Name = "ShopGui"
  gui.ResetOnSpawn = false
  gui.Parent = game:GetService("StarterGui")

[BUILDING]  
- Type: Script
- Place: ServerScriptService/BuildRunner
- Create all parts in Workspace using Instance.new()
- At the END of the script add: script:Destroy() so it self-destructs after running
- Group parts into a Model

[MODELING]
- Type: Script  
- Place: ServerScriptService/ModelBuilder
- Build model with multiple parts, welds, and a PrimaryPart
- At the END add: script:Destroy()

Never over-explain. Code first, brief note after.`
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