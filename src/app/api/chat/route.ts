import { NextRequest, NextResponse } from "next/server";
import { deductCredits, logTransaction } from "@/lib/credits";
import { estimateCreditCost } from "@/lib/pricing";

const SYSTEM_PROMPT = `You are Elixir, an AI built into Roblox Studio. Rules:
- Be SHORT and direct. Max 3 sentences of explanation.
- Always start scripts with: -- Folder, -- Type, -- Smart Name
- Format ALL code in \`\`\`lua blocks
- Never over-explain. Code first, brief note after.
- Roblox/Luau only.`;

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