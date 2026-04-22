import { NextRequest, NextResponse } from "next/server"
import { pushCode, isConnected } from "@/lib/inject-store"
import { estimateCreditCost } from "@/lib/pricing"
import { deductCredits, logTransaction, OWNER_IDS } from "@/lib/credits"

// ── UI Style guides injected into the AI prompt ───────────────────────────────

const UI_STYLE_GUIDES: Record<string, string> = {
  minimal: `GUI STYLE — MINIMAL: Use flat white/light-grey backgrounds. No gradients. Thin 1px borders. Corner radius 4-6px. Dark text. Clean whitespace. Simple and understated.`,
  modern: `GUI STYLE — MODERN: Dark theme panels (#1A1A2E, #16213E). Purple/blue accents (Color3.fromRGB(124,58,237)). UIGradient on buttons. Corner radius 10-14px. BackgroundTransparency 0.1-0.2 for depth.`,
  sleek: `GUI STYLE — SLEEK/GLASS: Pure dark background (#0A0A10). Glass panels: BackgroundTransparency 0.75 + UIStroke (white, Thickness 1, Transparency 0.85). Corner radius 14-18px. Minimal elements. Maximum whitespace.`,
  cartoony: `GUI STYLE — CARTOONY: Bright saturated colors (yellow, red, blue). UIStroke on EVERY element: Thickness 3, Color black. Corner radius 20-28px. Bold chunky buttons. Oversized playful proportions. Drop shadows via offset UIStroke.`,
  neon: `GUI STYLE — NEON/CYBERPUNK: Pure black background (0,0,0). Neon accents: cyan (0,255,255), pink (255,0,255), lime (0,255,65). UIStroke with neon colors simulates glow. Dark panels with bright borders. Sharp corners 4-6px.`,
}

const BASE_SYSTEM = `You are Elixir — an expert Roblox Studio Lua engineer. You write production-quality code that works immediately.

ABSOLUTE OUTPUT RULES:
- Output ONLY raw Lua. Zero markdown. Zero code fences. Zero explanation text.
- FIRST 3 lines MUST be exactly:
  -- Type: Script
  -- Name: ScriptName
  -- Place: ServiceName/OptionalFolder/ScriptName
- Type options: Script | LocalScript | ModuleScript

CODE STANDARDS (non-negotiable):
- NEVER write placeholders. Write ACTUAL working code.
- Every script must work immediately with zero modifications.
- Minimum 60 lines. Complex systems = 150-400 lines.
- Structure with: [[ SERVICES ]] [[ CONFIGURATION ]] [[ VARIABLES ]] [[ FUNCTIONS ]] [[ MAIN ]]
- Use pcall() around anything that can fail
- Nil-check instances before use
- Use TweenService, RunService, CollectionService, Players etc properly
- Handle cleanup/disconnection properly`

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      step,
      message,
      robloxId,
      modelId,
      conversationContext,
      uiStyle,
      imageDataUrl,
    } = body

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

    if (step?.type === "test") {
      return NextResponse.json({ ok: true, injected: false, result: "Check Studio Output for errors.", code: null })
    }

    const model    = modelId ?? "openai/gpt-4o-mini"
    const location = step?.location ?? "ServerScriptService/ElixirScript"
    const style    = uiStyle ?? "modern"

    // Build system prompt with style guide
    const SYSTEM = `${BASE_SYSTEM}

${UI_STYLE_GUIDES[style] ?? UI_STYLE_GUIDES.modern}`

    const userPromptParts = [
      `User request: "${message}"`,
      `Step to implement: ${step?.description ?? message}`,
      `Target location in Studio: ${location}`,
      conversationContext ? `Prior context:\n${conversationContext}` : "",
    ].filter(Boolean)

    const userPrompt = userPromptParts.join("\n\n")

    // ── Credit check ──────────────────────────────────────────────────────────
    const isOwner = OWNER_IDS.has(String(robloxId))

    if (!isOwner) {
      const estimate = estimateCreditCost(model, userPrompt)
      if (!estimate.isFree) {
        const deductResult = await deductCredits(String(robloxId), estimate.credits)
        if (!deductResult.ok) {
          return NextResponse.json(
            { ok: false, error: deductResult.error ?? "Not enough credits", creditsNeeded: estimate.credits },
            { status: 402 }
          )
        }
        await logTransaction(String(robloxId), "deduct", estimate.credits, { model, step: step?.description }).catch(() => {})
      }
    }

    // ── Build messages (with vision if image attached) ─────────────────────────
    const userMessage = imageDataUrl
      ? {
          role: "user",
          content: [
            { type: "text",      text: userPrompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        }
      : { role: "user", content: userPrompt }

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
          userMessage,
        ],
      }),
    })

    const aiData = await aiRes.json()
    if (!aiRes.ok) throw new Error(`OpenRouter: ${aiData?.error?.message ?? aiRes.status}`)

    let code: string = aiData.choices?.[0]?.message?.content ?? ""
    if (!code.trim()) throw new Error("AI returned empty code")

    // Strip fences if AI ignored rules
    code = code.replace(/^```(?:lua)?\s*\n?/im, "").replace(/\n?```\s*$/im, "").trim()

    // Ensure headers
    if (!code.startsWith("-- Type:")) {
      const parts = location.split("/")
      const name  = parts[parts.length - 1] ?? "ElixirScript"
      code = `-- Type: Script\n-- Name: ${name}\n-- Place: ${location}\n${code}`
    }

    // Push to plugin
    pushCode(String(robloxId), code)

    console.log(`[Elixir] EXECUTE ✓ | user:${robloxId} | style:${style} | lines:${code.split("\n").length}${isOwner ? " | OWNER" : ""}`)

    return NextResponse.json({
      ok: true, injected: true, code,
      lines: code.split("\n").length,
      result: `Sent to Studio: ${step?.description ?? "script"}`,
      model,
    })

  } catch (e: any) {
    console.error("[Elixir] Execute error:", e)
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}