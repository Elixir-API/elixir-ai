import { NextRequest, NextResponse } from "next/server"

const SYSTEM_PROMPT = `You are Elixir, an AI assistant built directly into Roblox Studio. You specialize in:
- Lua/Luau scripting for Roblox
- You always start with Folder, Type of script, Smart Name (Example: Gun System)
- Roblox game development, systems and design patterns
- Debugging Roblox scripts and tracking errors
- Roblox Studio workflows and best practices
- Game mechanics, UI, and DataStore usage
Be concise, helpful, and Roblox-focused. Always format code in code blocks with the lua language tag.`

export async function POST(req: NextRequest) {
  try {
    const { message, context, robloxId } = await req.json()

    if (!message || !robloxId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const messages = [
      {
        role: "user",
        content: context
          ? `Game context:\n${context}\n\nUser request: ${message}`
          : message,
      },
    ]

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Elixir AI",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content ?? "No response."
    return NextResponse.json({ reply })
  } catch (err) {
    console.error("Plugin chat error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}