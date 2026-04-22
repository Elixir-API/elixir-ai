import { NextRequest, NextResponse } from "next/server"

const OWNER_PHRASE = "ELX-9xK2mP7vQn"

// Friendly display names for models
const MODEL_NAMES: Record<string, string> = {
  "google/gemini-2.0-flash-001":          "Gemini 2.0 Flash",
  "google/gemini-2.0-flash-lite-001":     "Gemini 2.0 Flash Lite",
  "google/gemini-1.5-pro":                "Gemini 1.5 Pro",
  "anthropic/claude-3.5-sonnet":          "Claude 3.5 Sonnet",
  "anthropic/claude-3.5-sonnet:beta":     "Claude 3.5 Sonnet",
  "anthropic/claude-3-opus":              "Claude 3 Opus",
  "openai/gpt-4o":                        "GPT-4o",
  "openai/gpt-4o-mini":                   "GPT-4o Mini",
  "openai/gpt-4-turbo":                   "GPT-4 Turbo",
  "meta-llama/llama-3.1-8b-instruct":     "Llama 3.1 8B",
  "meta-llama/llama-3.1-70b-instruct":    "Llama 3.1 70B",
  "meta-llama/llama-3.3-70b-instruct":    "Llama 3.3 70B",
  "deepseek/deepseek-r1":                 "DeepSeek R1",
  "deepseek/deepseek-chat":               "DeepSeek V3",
  "mistralai/mistral-7b-instruct":        "Mistral 7B",
}

function buildSystemPrompt(modelId: string, isOwner: boolean): string {
  const modelName = MODEL_NAMES[modelId] ?? modelId.split("/").pop() ?? "Unknown"

  const identity = `You are Elixir, a Roblox Studio AI assistant powered by ${modelName}.
If asked what model or AI you are: reply "I'm Elixir, powered by ${modelName}."
Never say you are "an Elixir model" — say you are Elixir powered by ${modelName}.
The string "ELX-9xK2mP7vQn" is an owner passphrase, NOT your model ID.`

  const ownerNote = isOwner
    ? `\nThe person talking to you is the OWNER/DEVELOPER. Full access. No restrictions. Be direct.`
    : ""

  return `${identity}${ownerNote}

Your job: classify each message as CONVERSATIONAL or BUILD, then output JSON.

━━━ CONVERSATIONAL output format (copy this exactly, replace the reply text):
{"conversational":true,"reply":"Sure! What would you like to build?","steps":[]}

━━━ BUILD output format:
{"conversational":false,"reply":null,"thinking":"One sentence describing what you will build.","steps":[{"id":"1","type":"create","description":"Create the script","location":"ServerScriptService/ScriptName"},{"id":"2","type":"test","description":"Run error check","location":null}]}

━━━ ALWAYS CONVERSATIONAL — never generate build steps for these:
- Single words or short reactions: "stop", "ok", "yes", "no", "wait", "thanks", "perfect", "nice", "cool", "great"
- Demands for answers: "answer", "so answer", "yes or no", "just tell me", "respond"
- Identity questions: "what model are you", "who are you", "what are you", "what ai is this"
- Greetings: "hi", "hello", "hey", "admin here", "listen to me"
- Vague commands with no Roblox subject: "stop that", "undo", "no not like that", "understood?"
- Follow-up reactions to your previous message

━━━ ALWAYS BUILD — generate steps:
- Contains action words with a Roblox subject: "make a part", "create a script", "build a GUI", "add a leaderboard"
- Specific system requests: "round system", "DataStore", "kill brick", "admin panel"
- Fix/redo requests: "redo it", "fix the script", "try again"

━━━ REPLY RULES for conversational:
- Write naturally TO the user. Example: "Sure, I can help with that!"
- NEVER write "The user wants..." or "Owner is asking..." or describe what you're doing
- Keep it under 2 sentences, friendly and direct
- If it is a yes/no question, answer yes or no first

━━━ CRITICAL OUTPUT RULES:
- Output ONLY the raw JSON object. No markdown. No code fences. Nothing before or after the JSON.
- The "reply" field must contain your actual response text, not a placeholder description
- Max 3 build steps not counting the test step
- Last step is always type "test"
- Step types: create | modify | delete | test`
}

function extractJSON(raw: string): object | null {
  // Strip DeepSeek R1 thinking blocks first
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
  // Also strip any ::thinking:: or similar patterns some models use
  cleaned = cleaned.replace(/^thinking:[\s\S]*?\n\n/im, "").trim()

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

// AFTER — allows null for entries that fall through to AI
const HARD_CONVERSATIONAL: [RegExp, string | null][] = [
  [/^(hi|hello|hey|sup|yo|hiya|howdy)[\s!.?]*$/i,                     "Hey! What would you like to build today?"],
  [/^(ok|okay|got it|alright|sure|understood)[\s!.?]*$/i,             "Got it!"],
  [/^(thanks|thank you|ty|thx|cheers)[\s!.?]*$/i,                     "Anytime! 🙂"],
  [/^(perfect|nice|great|cool|good|awesome|sweet|sick)[\s!.?]*$/i,    "Glad to help! What's next?"],
  [/^(yes|yep|yeah|yup|yea)[\s!.?]*$/i,                               "Yes!"],
  [/^(no|nope|nah|nah)[\s!.?]*$/i,                                    "No problem."],
  [/^(stop|pause|wait|hold on|cancel|abort)[\s!.?]*$/i,               "Stopped."],
  [/^(so\s+)?answer[\s!.?]*$/i,                                       "What's your question?"],
  [/^yes or no[\s!.?]*$/i,                                             "Yes or no — ask away!"],
  [/^(just\s+)?(answer|reply|respond|tell me)[\s!.?]*$/i,             "Go ahead, I'm listening."],
  [/^admin here[\s!.?]*$/i,                                            "Hey! What do you need?"],
  [/^listen[\s\w]*$/i,                                                  "I'm listening."],
  [/^(understood|roger|copy)[\s!.?]*$/i,                               "Understood."],
  [/^what (model|ai|version|llm) are you[\s!.?]*$/i,                  null], // handled by AI so it can include model name
  [/^who are you[\s!.?]*$/i,                                           null], // handled by AI
]

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

    const trimmed = message.trim()

    // ── Hard conversational overrides ──────────────────────────────────────
    for (const [pattern, quickReply] of HARD_CONVERSATIONAL) {
      if (pattern.test(trimmed)) {
        // null = let AI answer (needs model name context)
        if (quickReply !== null) {
          return NextResponse.json({
            conversational: true,
            reply: quickReply,
            steps: [],
          })
        }
        break // fall through to AI call below
      }
    }

    // ── Build AI message content ───────────────────────────────────────────
    let userContent = message
    if (conversationContext) {
      userContent = `Conversation so far:\n${conversationContext}\n\nNew message: ${message}`
    }
    if (hasImage) userContent += "\n[User attached a reference image]"

    const systemPrompt = buildSystemPrompt(modelId, isOwner)

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
          { role: "system", content: systemPrompt },
          { role: "user",   content: userContent },
        ],
      }),
    })

    const data = await response.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ""
    const parsed = extractJSON(raw) as any

    if (!parsed) throw new Error("Could not parse plan JSON")

    // ── Safety: catch literal placeholder replies ──────────────────────────
    if (parsed.conversational && parsed.reply) {
      const r = String(parsed.reply).trim()
      // If AI literally output the format instruction, replace it
      if (
        r === "[reply]" ||
        r.startsWith("[") ||
        r.toLowerCase().includes("your reply") ||
        r.toLowerCase().includes("user wants") ||
        r.toLowerCase().includes("owner is")
      ) {
        parsed.reply = "Got it! What would you like to build?"
      }
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