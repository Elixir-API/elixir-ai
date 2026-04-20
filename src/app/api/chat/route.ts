import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Elixir, an AI built into Roblox Studio. Rules:
- Be SHORT and direct. Max 3 sentences of explanation.
- Always start scripts with: -- Folder, -- Type, -- Smart Name
- Format ALL code in \`\`\`lua blocks
- Never over-explain. Code first, brief note after.
- Roblox/Luau only.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId } = await req.json();

    if (!messages || !modelId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

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