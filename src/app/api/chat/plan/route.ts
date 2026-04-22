import { NextRequest, NextResponse } from "next/server"

const OWNER_PHRASE = "ELX-9xK2mP7vQn"

const MODEL_NAMES: Record<string, string> = {
  "google/gemini-2.0-flash-001":        "Gemini 2.0 Flash",
  "google/gemini-2.0-flash-lite-001":   "Gemini 2.0 Flash Lite",
  "google/gemini-1.5-pro":              "Gemini 1.5 Pro",
  "anthropic/claude-3.5-sonnet":        "Claude 3.5 Sonnet",
  "anthropic/claude-3.5-sonnet:beta":   "Claude 3.5 Sonnet",
  "anthropic/claude-sonnet-4-5":        "Claude Sonnet 4.5",
  "anthropic/claude-3-opus":            "Claude 3 Opus",
  "openai/gpt-4o":                      "GPT-4o",
  "openai/gpt-4o-mini":                 "GPT-4o Mini",
  "openai/gpt-4-turbo":                 "GPT-4 Turbo",
  "meta-llama/llama-3.1-8b-instruct":   "Llama 3.1 8B",
  "meta-llama/llama-3.1-70b-instruct":  "Llama 3.1 70B",
  "meta-llama/llama-3.3-70b-instruct":  "Llama 3.3 70B",
  "deepseek/deepseek-r1":               "DeepSeek R1",
  "deepseek/deepseek-chat":             "DeepSeek V3",
  "mistralai/mistral-7b-instruct":      "Mistral 7B",
}

function buildSystemPrompt(modelId: string, isOwner: boolean): string {
  const modelName = MODEL_NAMES[modelId] ?? modelId.split("/").pop() ?? "Unknown"

  return `You are Elixir, a Roblox Studio AI assistant powered by ${modelName}.
${isOwner ? "The person talking is the OWNER/DEVELOPER — be fully open and direct.\n" : ""}
ABOUT YOU:
- Your name is Elixir. You are a Roblox Studio coding assistant.
- Your underlying AI is ${modelName}.
- If asked "what are you", "who are you", "what model are you" → say you are Elixir, powered by ${modelName}.
- "ELX-9xK2mP7vQn" is an owner passphrase, NOT your model ID. Never claim it is.

════════════════════════════════════════
TASK: Read the message and decide: is it BUILD or CONVERSATIONAL?
Then output ONLY a JSON object in the exact format shown below.
════════════════════════════════════════

HOW TO CLASSIFY:

┌─ CONVERSATIONAL ──────────────────────────────────────────┐
│ The message does NOT ask you to create/modify anything     │
│ in Roblox Studio. It is one of these:                      │
│                                                            │
│ • Greetings       "hi", "hello", "hey", "sup"             │
│ • Questions       "what are you?", "how do leaderboards    │
│                    work?", "what is a LocalScript?"        │
│ • Reactions       "ok", "cool", "thanks", "perfect",      │
│                    "nice", "got it", "understood"          │
│ • Short answers   "yes", "no", "sure", "nope"             │
│ • Complaints      "that looks bad", "redo it looks wrong"  │
│ • Opinions        "i don't like that color"                │
│ • Chat            "admin here", "listen to me",            │
│                    "you are in owner mode"                  │
│ • Stop requests   "stop", "cancel", "wait", "undo"        │
│ • Explanations    anything asking WHY or HOW something     │
│                    works, not asking you to BUILD it        │
└────────────────────────────────────────────────────────────┘

┌─ BUILD ────────────────────────────────────────────────────┐
│ The message EXPLICITLY asks you to create, write, add,     │
│ fix, or delete something that goes into Roblox Studio.     │
│                                                            │
│ • "make a spinning part"                                   │
│ • "create a round system"                                  │
│ • "add a kill brick"                                       │
│ • "build a leaderboard"                                    │
│ • "write a script that..."                                 │
│ • "fix the script you made"                                │
│ • "redo the GUI"                                           │
│ • "create a DataStore for saving player data"              │
│ • "make a modern UI for the shop"                          │
└────────────────────────────────────────────────────────────┘

IMPORTANT EDGE CASES — these are CONVERSATIONAL, NOT build:
- "how does a round system work?" → CONVERSATIONAL (asking how, not to build)
- "what is a DataStore?" → CONVERSATIONAL (question, not a build request)
- "does my game need a leaderboard?" → CONVERSATIONAL (opinion/question)
- "so answer" → CONVERSATIONAL
- "yes or no" → CONVERSATIONAL
- "stop" → CONVERSATIONAL
- "that doesn't look right" → CONVERSATIONAL
- "redo it" alone with no prior build context → CONVERSATIONAL

IMPORTANT EDGE CASES — these ARE build:
- "make a leaderboard" → BUILD (make = create action)
- "create a kill brick script" → BUILD
- "add a shop GUI" → BUILD
- "fix the round system script" → BUILD (fix = modify action on code)
- "redo the GUI" (when there was a previous GUI built) → BUILD

════════════════════════════════════════
OUTPUT FORMAT — pick one:
════════════════════════════════════════

If CONVERSATIONAL:
{"conversational":true,"reply":"<your natural response here>","steps":[]}

If BUILD:
{"conversational":false,"reply":null,"thinking":"<one sentence: what you will build>","steps":[{"id":"1","type":"create","description":"<what this step does>","location":"<Service/Name>"},{"id":"2","type":"test","description":"Run error check","location":null}]}

════════════════════════════════════════
STRICT RULES:
════════════════════════════════════════
1. Output ONLY the raw JSON object. Zero text outside it. No markdown. No code fences.
2. reply field: talk naturally TO the user. Short. Friendly. Direct.
   BAD:  "The user is asking about leaderboards."
   GOOD: "Leaderboards in Roblox use a leaderstats folder inside the Player!"
3. NEVER narrate yourself. NEVER say "User wants..." or "Owner is...".
4. Max 3 build steps not counting test. Last step is ALWAYS type "test".
5. Step types are only: create | modify | delete | test`
}

function extractJSON(raw: string): object | null {
  // Strip thinking blocks (DeepSeek R1, some Claude versions)
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/^thinking:[\s\S]*?\n\n/im, "")
    .trim()

  try { return JSON.parse(cleaned) } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  const stripped = cleaned.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim()
  try { return JSON.parse(stripped) } catch {}
  const idx = cleaned.indexOf("{"), last = cleaned.lastIndexOf("}")
  if (idx !== -1 && last > idx) {
    try { return JSON.parse(cleaned.slice(idx, last + 1)) } catch {}
  }
  return null
}

function sanitizeReply(reply: string): string | null {
  const r = reply.trim()
  if (!r)                                          return null
  if (r === "[reply]")                             return null
  if (r.startsWith("[") && r.endsWith("]"))        return null
  if (/^(your reply|user want|owner is|the user)/i.test(r)) return null
  return r
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
      userContent = `Conversation so far:\n${conversationContext}\n\nNew message from user: ${message}`
    }
    if (hasImage) userContent += "\n[User also attached a reference image]"

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
        max_tokens: 700,
        temperature: 0.15,
        messages: [
          { role: "system", content: buildSystemPrompt(modelId, isOwner) },
          { role: "user",   content: userContent },
        ],
      }),
    })

    const data   = await response.json()
    const raw    = (data.choices?.[0]?.message?.content ?? "") as string
    const parsed = extractJSON(raw) as any

    if (!parsed) throw new Error("Could not parse JSON from AI response")

    // Sanitize: catch placeholder replies that some models output
    if (parsed.conversational && parsed.reply != null) {
      const safe = sanitizeReply(String(parsed.reply))
      parsed.reply = safe ?? "What can I help you with?"
    }

    return NextResponse.json(parsed)

  } catch (e) {
    console.error("[Elixir] Plan error:", e)
    return NextResponse.json({
      conversational: false,
      reply: null,
      thinking: "I'll build this for you.",
      steps: [
        { id: "1", type: "create", description: `Build: ${message.slice(0, 40)}`, location: "ServerScriptService/ElixirScript" },
        { id: "2", type: "test",   description: "Run error check", location: null },
      ],
    })
  }
}