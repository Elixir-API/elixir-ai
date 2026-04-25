import { NextRequest, NextResponse } from "next/server"

const MODEL_PROVIDER: Record<string, string> = {
  "google/gemini-2.0-flash-001":       "Google",
  "google/gemini-2.0-flash-lite-001":  "Google",
  "google/gemini-1.5-pro":             "Google",
  "anthropic/claude-3.5-sonnet":       "Anthropic",
  "anthropic/claude-3.5-sonnet:beta":  "Anthropic",
  "anthropic/claude-sonnet-4-5":       "Anthropic",
  "anthropic/claude-3-opus":           "Anthropic",
  "openai/gpt-4o":                     "OpenAI",
  "openai/gpt-4o-mini":                "OpenAI",
  "openai/gpt-4-turbo":                "OpenAI",
  "meta-llama/llama-3.1-8b-instruct":  "Meta",
  "meta-llama/llama-3.1-70b-instruct": "Meta",
  "meta-llama/llama-3.3-70b-instruct": "Meta",
  "deepseek/deepseek-r1":              "DeepSeek",
  "deepseek/deepseek-chat":            "DeepSeek",
  "mistralai/mistral-7b-instruct":     "Mistral",
  "google/gemma-2-9b-it:free": "Google",
}

// ── Detect if Elixir already built something in this convo ────────────────────
function detectPriorBuild(context: string): boolean {
  if (!context) return false
  return context.includes("Elixir:")
}

// ── Hard client-side BUILD override (catches what AI misses) ──────────────────
const ALWAYS_BUILD_WORDS = [
  "redo", "rewrite", "rebuild", "remake", "recreate",
  "redo it", "redo all", "rewrite all", "rewrite it", "rebuild it",
  "fix it", "fix the", "fix this", "fix everything",
  "continue", "keep going", "finish it", "go on", "do it",
  "nothing works", "nothing is there", "not showing", "doesn't show",
  "doesn't work", "not working", "broken", "all broken", "messed up",
]

function shouldForceBuild(message: string, priorBuild: boolean): boolean {
  const lower = message.toLowerCase()
  // Redo/rewrite = always build no matter what
  if (["redo", "rewrite", "rebuild", "remake", "recreate"].some(w => lower.includes(w))) return true
  // Other words = only force if there was a prior build
  if (priorBuild) {
    return ALWAYS_BUILD_WORDS.some(w => lower.includes(w))
  }
  return false
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(modelId: string, priorBuild: boolean): string {
  const provider   = MODEL_PROVIDER[modelId] ?? "an external provider"
  const priorNote  = priorBuild
    ? "\n⚠ CONTEXT: Elixir has already built something in this conversation. 'fix it', 'continue', 'redo', 'nothing works', 'not showing' = BUILD a corrected version."
    : ""

  return `You are Elixir — a Roblox Studio AI coding assistant made by Perky, powered by ${provider}.${priorNote}

═══ IDENTITY — never break this ═══
You are Elixir, made by Perky.
If asked what model/AI/who made you: "I'm Elixir, made by Perky — running on ${provider}."
Never say GPT, Claude, Gemini, Llama, DeepSeek, or any specific model name.

═══ OUTPUT — raw JSON only, no markdown, no explanation ═══

Conversational shape:
{"conversational":true,"intent":"chat","reply":"your reply here","steps":[]}

Build shape:
{"conversational":false,"intent":"request","reply":null,"thinking":"one sentence plan","steps":[{"id":"1","type":"create","description":"what to build","location":"Service/ScriptName"},{"id":"2","type":"test","description":"Run error check","location":null}]}

═══ CLASSIFY: BUILD vs CHAT ════════════════════════════════

CHOOSE BUILD (conversational: false) when ANY of these match:

1. REDO WORDS — always BUILD, no exceptions:
   redo, rewrite, rebuild, remake, recreate (and any variation)

2. FIX + PRIOR ELIXIR WORK:
   "fix it", "fix this", "fix the GUI", "fix the script", "it's broken fix it",
   "nothing works", "it's not working", "nothing is showing", "the GUI doesn't show"
   → BUILD (rewrite or fix what was built)

3. CONTINUE + PRIOR WORK:
   "continue", "keep going", "finish it", "go ahead", "do it", "go on"
   → BUILD (continue building)

4. ACTION WORD + ROBLOX SUBJECT:
   Actions: make, create, add, build, write, code, script, generate, implement, give me, set up, put
   Subjects: script, part, GUI, ScreenGui, leaderboard, DataStore, kill brick, tool, weapon, shop,
             NPC, remote, tween, badge, round system, admin panel, camera, animation, proximity prompt

5. USER'S OWN CODE + "fix" word:
   If they paste code and say "fix this" / "fix this script" → BUILD the fixed version

CHOOSE CHAT (conversational: true) ONLY when:
• Pure greeting: hi, hello, hey, ok, thanks, cool, stop, wait, sure, yes, no, obey
• Identity: what are you, who made you → reply: "I'm Elixir, made by Perky — running on ${provider}."
• Concept question (not asking to build): "how do DataStores work?", "what is a RemoteEvent?"
• Feedback only: "looks good", "the button is too big", "wrong color" (no "fix it" / "redo")
• Their own broken code + zero fix/redo words + no prior Elixir build: ask what error they see
• Pure small talk with zero build intent

═══ EXAMPLES — memorize these ════════════════════════════

"make a spinning part"                                    → BUILD
"create a leaderboard"                                    → BUILD
"add a kill brick"                                        → BUILD
"redo the script"                                         → BUILD ← ALWAYS
"rewrite all of it"                                       → BUILD ← ALWAYS
"redo all of it"                                          → BUILD ← ALWAYS
"rebuild everything"                                      → BUILD ← ALWAYS
"fix it"                       [prior build exists]       → BUILD ← fix prior work
"it's all broken fix it"       [prior build exists]       → BUILD ← rewrite prior work
"the gui doesn't show"         [prior build exists]       → BUILD ← fix GUI
"nothing is there"             [prior build exists]       → BUILD ← rebuild
"continue"                     [prior build exists]       → BUILD ← continue
"continue and fix it rewrite all of it"                   → BUILD ← ALWAYS (has "rewrite")
"my script isn't working"      [no prior build, own code] → CHAT ← ask what error
"how do DataStores work?"                                 → CHAT
"hi"                                                      → CHAT
"thanks"                                                  → CHAT
"obey"                                                    → CHAT → "What would you like me to build?"
"looks good"                                              → CHAT ← feedback
"the button is too big"                                   → CHAT ← feedback, say: "Got it! Say 'redo it but make the button smaller' to update."

═══ CHAT REPLY RULES ═══
• Talk directly TO the user — no "The user wants...", no narration
• 1-3 sentences MAX
• One question at a time
• For feedback: "Got it! Say 'redo it but [change]' to rebuild."
• For "obey" / "ok" / "sure": "What can I build for you?"

═══ BUILD STEP RULES ═══
• Max 3 build steps + 1 test step
• Step types: create | modify | delete | test
• Location MUST be "ServiceName/UniqueScriptName" — name ≠ service name
• GUIs MUST go in StarterGui/[Name] or StarterPlayerScripts/[Name]
• NEVER put a GUI script in ServerScriptService

CORRECT locations:
  "ServerScriptService/RoundManager"
  "StarterPlayerScripts/CameraController"
  "StarterGui/ShopGui"
  "ReplicatedStorage/GameConfig"

WRONG locations:
  "StarterPlayerScripts"
  "StarterPlayerScripts/StarterPlayerScripts"
  "ServerScriptService"
  "ServerScriptService/ElixirScript"`
}

// ── JSON extraction ───────────────────────────────────────────────────────────
function extractJSON(raw: string): object | null {
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
  if (!r) return null
  if (r === "[reply]" || r === "[your reply]" || r === "[your reply here]") return null
  if (r.startsWith("[") && r.endsWith("]")) return null
  if (/^(your reply|the user|user want|owner is|i should)/i.test(r)) return null
  return r
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let message = ""
  try {
    const body                = await req.json()
    message                   = body.message            ?? ""
    const modelId             = body.modelId            ?? "google/gemini-2.0-flash-001"
    const conversationContext = body.conversationContext ?? ""
    const hasImage            = body.hasImage           ?? false

    const priorBuild = detectPriorBuild(conversationContext)

    // ── Hard override before calling AI ───────────────────────────────────
    // If the message clearly means BUILD, skip the AI classifier entirely
    // for redo/rewrite — always go straight to build
    const msgLower  = message.toLowerCase()
    const isHardRedo = ["redo", "rewrite", "rebuild", "remake", "recreate"]
      .some(w => msgLower.includes(w))

    let userContent = message
    if (conversationContext) {
      userContent = `Conversation so far:\n${conversationContext}\n\nNew message: ${message}`
    }
    if (hasImage) userContent += "\n[User attached a reference image]"

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title":      "Elixir AI",
      },
      body: JSON.stringify({
        model:       modelId,
        stream:      false,
        max_tokens:  700,
        temperature: 0.05, // very low — we need deterministic classification
        messages: [
          { role: "system", content: buildSystemPrompt(modelId, priorBuild) },
          { role: "user",   content: userContent },
        ],
      }),
    })

    const data   = await response.json()
    const raw    = (data.choices?.[0]?.message?.content ?? "") as string
    const parsed = extractJSON(raw) as any

    if (!parsed) throw new Error("Could not parse JSON from AI response")

    // ── Client-side safety net — if AI still got it wrong ─────────────────
    if (parsed.conversational && shouldForceBuild(message, priorBuild)) {
      // Re-use whatever steps the AI produced if it accidentally put them there,
      // otherwise produce a generic rebuild step
      const steps = (parsed.steps && parsed.steps.length > 0)
        ? parsed.steps
        : [
            {
              id: "1", type: "create",
              description: `Rewrite and fix: ${message.slice(0, 50)}`,
              location: "ServerScriptService/ElixirHandler",
            },
            { id: "2", type: "test", description: "Run error check", location: null },
          ]
      return NextResponse.json({
        conversational: false,
        intent:         "request",
        reply:          null,
        thinking:       "I'll rewrite and fix this properly.",
        steps,
      })
    }

    if (parsed.conversational && parsed.reply != null) {
      const safe = sanitizeReply(String(parsed.reply))
      parsed.reply = safe ?? "What can I help you with?"
    }

    return NextResponse.json(parsed)

  } catch (e) {
    console.error("[Elixir] Plan error:", e)
    return NextResponse.json({
      conversational: false,
      intent:         "request",
      reply:          null,
      thinking:       "I'll build this for you.",
      steps: [
        {
          id: "1", type: "create",
          description: `Build: ${message.slice(0, 40)}`,
          location:    "ServerScriptService/ElixirHandler",
        },
        { id: "2", type: "test", description: "Run error check", location: null },
      ],
    })
  }
}