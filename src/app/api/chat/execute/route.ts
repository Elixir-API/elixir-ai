// src/app/api/chat/execute/route.ts
import { NextRequest, NextResponse } from "next/server"
import { pushCode, isConnected } from "@/lib/inject-store"
import { estimateCreditCost } from "@/lib/pricing"
import { deductCredits, logTransaction, OWNER_IDS } from "@/lib/credits"

const SYSTEM = `You are Elixir — an expert Roblox Studio Lua engineer. You write production-quality code that works immediately.

ABSOLUTE OUTPUT RULES:
- Output ONLY raw Lua. Zero markdown. Zero code fences. Zero explanation text.
- FIRST 3 lines MUST be exactly:
  -- Type: Script
  -- Name: ScriptName
  -- Place: ServiceName/OptionalFolder/ScriptName
- Type options: Script | LocalScript | ModuleScript

CODE STANDARDS (non-negotiable):
- NEVER write "-- your code here" or any placeholder. Write the ACTUAL code.
- Every script must work immediately with zero modifications.
- Minimum 60 lines for any real feature. Complex systems = 150-400 lines.
- Structure EVERY script with clear sections:
  -- [[ SERVICES ]]
  -- [[ CONFIGURATION ]]  
  -- [[ VARIABLES ]]
  -- [[ FUNCTIONS ]]
  -- [[ CONNECTIONS / MAIN ]]
- Use pcall() around any operation that can fail
- Nil-check instances before touching them
- Use proper Roblox services: TweenService, RunService, CollectionService, Players, etc.
- Name variables and functions descriptively (camelCase for vars, PascalCase for functions)
- Add comments explaining WHY, not just WHAT
- If the feature needs RemoteEvents/Functions, create them in the script
- Handle cleanup/disconnection properly`

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { step, message, robloxId, modelId, conversationContext } = body

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!robloxId) {
      return NextResponse.json(
        { ok: false, error: "No robloxId — is the plugin connected?" },
        { status: 400 }
      )
    }

    if (!isConnected(String(robloxId))) {
      return NextResponse.json(
        { ok: false, error: "Plugin not connected — click Elixir Connect in Studio" },
        { status: 400 }
      )
    }

    // ── Test steps: no code needed ────────────────────────────────────────────
    if (step?.type === "test") {
      return NextResponse.json({
        ok: true,
        injected: false,
        result: "Check the Studio Output panel for errors.",
        code: null,
      })
    }

    const model    = modelId ?? "openai/gpt-4o-mini"
    const location = step?.location ?? "ServerScriptService/ElixirScript"

    const userPrompt = [
      `User request: "${message}"`,
      `Step to implement: ${step?.description ?? message}`,
      `Target location in Studio: ${location}`,
      conversationContext ? `Prior context:\n${conversationContext}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")

    // ── Credit check (skip for owner) ─────────────────────────────────────────
    const isOwner = OWNER_IDS.has(String(robloxId))

    if (!isOwner) {
      const estimate = estimateCreditCost(model, userPrompt)
      if (!estimate.isFree) {
        const deductResult = await deductCredits(String(robloxId), estimate.credits)
        if (!deductResult.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: deductResult.error ?? "Not enough credits — visit the shop to top up",
              creditsNeeded: estimate.credits,
              creditsBalance: deductResult.remaining,
            },
            { status: 402 }
          )
        }
        await logTransaction(String(robloxId), "deduct", estimate.credits, {
          model,
          step: step?.description ?? "unknown",
          remaining: deductResult.remaining,
        }).catch(() => {})
      }
    }

    // ── Call OpenRouter ───────────────────────────────────────────────────────
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Elixir AI",
      },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: 4096,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user",   content: userPrompt },
        ],
      }),
    })

    const aiData = await aiRes.json()

    if (!aiRes.ok) {
      throw new Error(`OpenRouter: ${aiData?.error?.message ?? aiRes.status}`)
    }

    let code: string = aiData.choices?.[0]?.message?.content ?? ""
    if (!code.trim()) throw new Error("AI returned empty code")

    // ── Strip code fences if AI ignored the rules ─────────────────────────────
    code = code
      .replace(/^```(?:lua)?\s*\n?/im, "")
      .replace(/\n?```\s*$/im, "")
      .trim()

    // ── Ensure headers exist ──────────────────────────────────────────────────
    if (!code.startsWith("-- Type:")) {
      const parts = location.split("/")
      const name  = parts[parts.length - 1] ?? "ElixirScript"
      code = `-- Type: Script\n-- Name: ${name}\n-- Place: ${location}\n${code}`
    }

    // ── Push to plugin queue ──────────────────────────────────────────────────
    pushCode(String(robloxId), code)

    const lines = code.split("\n").length

    console.log(
      `[Elixir] EXECUTE ✓` +
      ` | user: ${robloxId}` +
      ` | model: ${model}` +
      ` | step: "${step?.description}"` +
      ` | lines: ${lines}` +
      (isOwner ? " | OWNER (free)" : "")
    )

    return NextResponse.json({
      ok:       true,
      injected: true,
      code,
      lines,
      result:   `Sent to Studio: ${step?.description ?? "script"}`,
      chars:    code.length,
      model,
    })

  } catch (e: any) {
    console.error("[Elixir] Execute error:", e)
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    )
  }
}