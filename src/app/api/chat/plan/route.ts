// src/app/api/chat/plan/route.ts
import { NextRequest, NextResponse } from "next/server"

const PLAN_PROMPT = `You are Elixir, an AI for Roblox Studio. Given a request output ONLY valid JSON. No markdown. No explanation. No text outside the JSON.

Rules:
- Maximum 3 steps (not counting test)
- HIGH LEVEL steps only: "Create Script", "Create Part", "Modify Script"
- Final step is ALWAYS type "test"
- Types: create | modify | delete | test
- Use conversation context to understand follow-up requests

Format:
{"thinking":"one sentence","steps":[{"id":"1","type":"create","description":"Create spinning script","location":"ServerScriptService/SpinScript"},{"id":"2","type":"test","description":"Run error check","location":null}]}`

function extractJSON(raw: string): object | null {
  try { return JSON.parse(raw.trim()) } catch {}
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  const stripped = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim()
  try { return JSON.parse(stripped) } catch {}
  const idx = raw.indexOf("{")
  const lastIdx = raw.lastIndexOf("}")
  if (idx !== -1 && lastIdx > idx) {
    try { return JSON.parse(raw.slice(idx, lastIdx + 1)) } catch {}
  }
  return null
}

export async function POST(req: NextRequest) {
  let message = ""
  try {
    const body = await req.json()
    message                        = body.message            ?? ""
    const modelId                  = body.modelId            ?? "google/gemini-2.0-flash-001"
    const conversationContext      = body.conversationContext ?? ""

    const userContent = conversationContext
      ? `${conversationContext}\n\nNew request: ${message}`
      : message

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
        stream: false,
        max_tokens: 500,
        temperature: 0.1,
        messages: [
          { role: "system", content: PLAN_PROMPT },
          { role: "user",   content: userContent },
        ],
      }),
    })

    const data = await response.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ""
    const parsed = extractJSON(raw)
    if (!parsed) throw new Error("Could not parse plan")
    return NextResponse.json(parsed)

  } catch (e) {
    console.error("[Elixir] Plan error:", e)
    return NextResponse.json({
      thinking: "I'll build this for you.",
      steps: [
        {
          id: "1",
          type: "create",
          description: `Build: ${message.slice(0, 40)}`,
          location: "ServerScriptService/ElixirScript",
        },
        {
          id: "2",
          type: "test",
          description: "Run error check",
          location: null,
        },
      ],
    })
  }
}