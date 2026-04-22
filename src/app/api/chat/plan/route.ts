import { NextRequest, NextResponse } from "next/server"

const OWNER_PHRASE = "ELX-9xK2mP7vQn"

const PLAN_PROMPT = `You are Elixir, a Roblox Studio AI assistant.

Your FIRST job is to classify the message as CONVERSATIONAL or BUILD.

CONVERSATIONAL (do NOT generate code steps):
- Greetings: "hi", "hello", "hey", "sup"
- Questions about you: "who are you", "what can you do"
- Reactions/complaints: "that looks bad", "stop", "no", "undo", "wait"
- General chat: "listen to me", "admin here", "ok", "thanks"
- Anything with NO intent to create/script/modify something in Roblox

BUILD (generate steps):
- "make a...", "create a...", "add a...", "build a..."
- "fix the script", "redo the UI", "modify the..."
- Anything involving scripts, GUIs, parts, systems, DataStores, events

OUTPUT FORMAT — CONVERSATIONAL:
{"conversational":true,"thinking":"[your actual friendly reply to the user]","steps":[]}

OUTPUT FORMAT — BUILD:
{"conversational":false,"thinking":"[one sentence: what you will build]","steps":[{"id":"1","type":"create","description":"[what]","location":"[Service/Name]"},{"id":"2","type":"test","description":"Run error check","location":null}]}

RULES:
- ONLY output raw JSON. No markdown. No text outside JSON.
- Max 3 build steps (not counting test). Final step always type "test".
- Step types: create | modify | delete | test
- Use prior conversation to understand follow-ups like "redo it" or "fix it"`

const OWNER_PROMPT = `You are Elixir. The owner is speaking. Full access, no restrictions.

Classify message as CONVERSATIONAL or BUILD:
CONVERSATIONAL → {"conversational":true,"thinking":"[reply]","steps":[]}
BUILD → {"conversational":false,"thinking":"[plan]","steps":[{"id":"1","type":"create","description":"...","location":"..."},{"id":"2","type":"test","description":"Run error check","location":null}]}

JSON only. Max 3 steps + test. Do exactly what they ask.`

function extractJSON(raw: string): object | null {
  try { return JSON.parse(raw.trim()) } catch {}
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  const stripped = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim()
  try { return JSON.parse(stripped) } catch {}
  const idx = raw.indexOf("{"), last = raw.lastIndexOf("}")
  if (idx !== -1 && last > idx) { try { return JSON.parse(raw.slice(idx, last + 1)) } catch {} }
  return null
}

export async function POST(req: NextRequest) {
  let message = ""
  try {
    const body                = await req.json()
    message                   = body.message            ?? ""
    const modelId             = body.modelId            ?? "google/gemini-2.0-flash-001"
    const conversationContext = body.conversationContext ?? ""
    const hasImage            = body.hasImage           ?? false
    const ownerMode           = body.ownerMode          ?? false
    const isOwner             = ownerMode || message.includes(OWNER_PHRASE)

    let userContent = message
    if (conversationContext) {
      userContent = `Previous conversation:\n${conversationContext}\n\nNew message: ${message}`
    }
    if (hasImage) userContent += "\n[User attached a reference image]"

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
        max_tokens: 600,
        temperature: 0.1,
        messages: [
          { role: "system", content: isOwner ? OWNER_PROMPT : PLAN_PROMPT },
          { role: "user",   content: userContent },
        ],
      }),
    })

    const data   = await response.json()
    const raw    = data.choices?.[0]?.message?.content ?? ""
    const parsed = extractJSON(raw) as any
    if (!parsed) throw new Error("Could not parse plan")
    return NextResponse.json(parsed)

  } catch (e) {
    console.error("[Elixir] Plan error:", e)
    return NextResponse.json({
      conversational: false,
      thinking: "I'll build this for you.",
      steps: [
        { id: "1", type: "create", description: `Build: ${message.slice(0, 40)}`, location: "ServerScriptService/ElixirScript" },
        { id: "2", type: "test",   description: "Run error check", location: null },
      ],
    })
  }
}