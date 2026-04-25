import { NextRequest, NextResponse } from "next/server"
import { pushCode, isConnected } from "@/lib/inject-store"
import { estimateCreditCost } from "@/lib/pricing"
import { deductCredits, logTransaction, OWNER_IDS } from "@/lib/credits"

const OWNER_PHRASE = "ELX-9xK2mP7vQn"

// ── Location sanitizer ────────────────────────────────────────────────────────

function sanitizeLocation(raw: string | null | undefined, hint?: string): string {
  if (!raw?.trim()) return "ServerScriptService/ElixirScript"

  const parts = raw.trim().split("/").filter(Boolean)

  // Only a service name, no script name
  if (parts.length === 1) {
    const name = hint
      ? hint.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) || "ElixirHandler"
      : "ElixirHandler"
    return `${parts[0]}/${name}`
  }

  // Duplicate: StarterPlayerScripts/StarterPlayerScripts
  const last = parts[parts.length - 1]
  const prev = parts[parts.length - 2]
  if (last === prev) {
    const name = hint
      ? hint.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)
      : null
    parts[parts.length - 1] = name || (last + "Script")
  }

  return parts.join("/")
}

// ── UI Style guides ───────────────────────────────────────────────────────────

const UI_STYLES: Record<string, string> = {
  minimal: `
=== UI STYLE: MINIMAL ===
PALETTE:
  Background  = Color3.fromRGB(248, 248, 248)
  Card        = Color3.fromRGB(255, 255, 255)
  Text        = Color3.fromRGB(25,  25,  25 )
  Subtext     = Color3.fromRGB(120, 120, 120)
  Border      = Color3.fromRGB(220, 220, 220)
  Accent      = Color3.fromRGB(60,  60,  60 )
STYLE RULES:
  CornerRadius = UDim.new(0, 6)
  UIStroke: Thickness=1, Color=Border color above
  BackgroundTransparency on secondary = 0
  NO gradients. NO shadows. Clean flat design.
  Padding: UIPadding Left=12 Right=12 Top=10 Bottom=10
FONTS:
  Title:   Font.GothamBold,   Size 16
  Body:    Font.Gotham,       Size 13
  Button:  Font.GothamMedium, Size 13`,

  modern: `
=== UI STYLE: MODERN DARK ===
PALETTE:
  Background  = Color3.fromRGB(10,  10,  18 )
  Panel       = Color3.fromRGB(20,  20,  34 )
  Card        = Color3.fromRGB(28,  28,  45 )
  Accent      = Color3.fromRGB(124, 58,  237)
  AccentLight = Color3.fromRGB(167, 105, 255)
  Text        = Color3.fromRGB(230, 228, 250)
  Subtext     = Color3.fromRGB(130, 125, 160)
  Border      = Color3.fromRGB(55,  50,  85 )
STYLE RULES:
  CornerRadius = UDim.new(0, 12)
  UIStroke: Thickness=1, Color=Border, Transparency=0.4
  Button UIGradient: Color0=Color3.fromRGB(139,92,246), Color1=Color3.fromRGB(109,40,217), Rotation=90
  Padding: UIPadding Left=16 Right=16 Top=12 Bottom=12
FONTS:
  Title:   Font.GothamBold,   Size 20
  Body:    Font.Gotham,       Size 14
  Button:  Font.GothamBold,   Size 14`,

  sleek: `
=== UI STYLE: SLEEK GLASS ===
PALETTE:
  Background  = Color3.fromRGB(5,   5,   12 )
  Glass       = Color3.fromRGB(255, 255, 255)
  Accent      = Color3.fromRGB(180, 170, 255)
  Text        = Color3.fromRGB(240, 238, 255)
  Subtext     = Color3.fromRGB(140, 135, 175)
GLASS TECHNIQUE:
  BackgroundColor3 = Color3.fromRGB(255,255,255)
  BackgroundTransparency = 0.88
  UIStroke: Color=white, Transparency=0.75, Thickness=1
  CornerRadius = UDim.new(0, 18)
FONTS:
  Title:   Font.GothamBold, Size 17
  Body:    Font.Gotham,     Size 13`,

  cartoony: `
=== UI STYLE: CARTOONY ===
PALETTE:
  Background  = Color3.fromRGB(255, 245, 180)
  PrimaryBtn  = Color3.fromRGB(255, 75,  75 )
  SecondaryBtn= Color3.fromRGB(75,  130, 255)
  Text        = Color3.fromRGB(255, 255, 255)
  Outline     = Color3.fromRGB(0,   0,   0  )
REQUIRED ON EVERY ELEMENT:
  UIStroke: Thickness=3, Color=black — MANDATORY
  CornerRadius = UDim.new(0, 24)
FONTS: Font.GothamBold ALL CAPS everywhere`,

  neon: `
=== UI STYLE: NEON CYBERPUNK ===
PALETTE:
  Background = Color3.fromRGB(0,   0,   0  )
  NeonCyan   = Color3.fromRGB(0,   255, 240)
  NeonPink   = Color3.fromRGB(255, 0,   180)
  NeonLime   = Color3.fromRGB(0,   255, 65 )
  Text       = Color3.fromRGB(220, 255, 255)
GLOW: UIStroke Color=NeonCyan Thickness=2
STYLE: CornerRadius UDim(0,4), ALL UPPERCASE, Font.Code`,
}

const BASE_SYSTEM = `You are Elixir — an expert Roblox Lua engineer. You write code that works immediately.

ABSOLUTE OUTPUT RULES:
1. ONLY output raw Lua. NO markdown. NO code fences. NO explanations whatsoever.
2. First 3 lines MUST be:
   -- Type: [Script|LocalScript|ModuleScript]
   -- Name: [ScriptName]
   -- Place: [Service/Folder/Name]
3. NEVER write placeholders. NEVER write "-- add your logic here". Write WORKING code.
4. Minimum 80 lines. GUIs and complex systems = 150-350 lines.
5. Must work with ZERO modifications after pasting.

ALWAYS STRUCTURE CODE AS:
-- [[ SERVICES ]]
-- [[ CONFIGURATION ]]
-- [[ VARIABLES / INSTANCES ]]
-- [[ FUNCTIONS ]]
-- [[ CONNECTIONS / MAIN ]]

CODE QUALITY REQUIREMENTS:
- pcall() wrapping for all DataStore, network, and risky instance operations
- WaitForChild() for instances that may not exist yet
- :Disconnect() all connections on cleanup
- RemoteEvents in ReplicatedStorage for client-server communication
- Proper DataStore retry logic with exponential backoff

LOCATION RULE — the Place header MUST exactly match what was requested.
NEVER create sub-folders or rename services. Use exactly: ServiceName/ScriptName`

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
      ownerMode,
    } = body

    if (!robloxId) {
      return NextResponse.json(
        { ok: false, error: "Not logged in — please sign in with Roblox first." },
        { status: 400 }
      )
    }
    if (!isConnected(String(robloxId))) {
      return NextResponse.json(
        { ok: false, error: "Plugin not connected — click Elixir Connect in Studio." },
        { status: 400 }
      )
    }

    if (step?.type === "test") {
      return NextResponse.json({
        ok: true, injected: false,
        result: "Check Studio Output for errors.",
        code: null,
      })
    }

    const model    = modelId ?? "google/gemini-2.0-flash-001"
    // ← sanitize here, passing step description as naming hint
    const location = sanitizeLocation(step?.location, step?.description)
    const style    = (uiStyle as string) ?? "modern"
    const isOwner  = OWNER_IDS.has(String(robloxId)) || ownerMode === true

    const styleGuide = UI_STYLES[style] ?? UI_STYLES.modern
    const SYSTEM = `${BASE_SYSTEM}\n\n${styleGuide}`

    const userPrompt = [
      `User request: "${message}"`,
      `Implement this step: ${step?.description ?? message}`,
      `Script goes at exactly: ${location}`,
      `The -- Place: header in your output MUST be: ${location}`,
      conversationContext ? `Prior context:\n${conversationContext}` : "",
    ].filter(Boolean).join("\n\n")

    if (!isOwner) {
      const estimate = estimateCreditCost(model, userPrompt)
      if (!estimate.isFree) {
        const result = await deductCredits(String(robloxId), estimate.credits)
        if (!result.ok) {
          return NextResponse.json(
            { ok: false, error: result.error ?? "Not enough credits.", creditsNeeded: estimate.credits },
            { status: 402 }
          )
        }
        await logTransaction(String(robloxId), "deduct", estimate.credits, {
          model, step: step?.description,
        }).catch(() => {})
      }
    }

    const userMessage = imageDataUrl
      ? {
          role: "user",
          content: [
            { type: "text",      text: userPrompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        }
      : { role: "user", content: userPrompt }

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
        stream:       false,
        max_tokens:   4096,
        temperature:  0.1,
        messages: [
          { role: "system", content: SYSTEM },
          userMessage,
        ],
      }),
    })

    const aiData = await aiRes.json()
    if (!aiRes.ok) throw new Error(`OpenRouter error: ${aiData?.error?.message ?? aiRes.status}`)

    let code: string = aiData.choices?.[0]?.message?.content ?? ""
    if (!code.trim()) throw new Error("AI returned empty code")

    code = code
      .replace(/^```(?:lua|luau)?\s*\n?/im, "")
      .replace(/\n?```\s*$/im, "")
      .trim()

    if (!code.startsWith("-- Type:")) {
      const parts = location.split("/")
      const name  = parts[parts.length - 1] ?? "ElixirScript"
      code = `-- Type: Script\n-- Name: ${name}\n-- Place: ${location}\n\n${code}`
    }

    pushCode(String(robloxId), code)
    console.log(
      `[Elixir] ✓ | user:${robloxId} | loc:${location} | style:${style} | lines:${code.split("\n").length}${isOwner ? " | OWNER" : ""}`
    )

    return NextResponse.json({
      ok: true,
      injected: true,
      result: `Injected: ${step?.description ?? "script"}`,
      lines: code.split("\n").length,
    })

  } catch (e: any) {
    console.error("[Elixir] Execute error:", e)
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}