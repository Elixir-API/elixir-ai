import { NextRequest, NextResponse } from "next/server"
import { pushCode, isConnected } from "@/lib/inject-store"
import { estimateCreditCost } from "@/lib/pricing"
import { deductCredits, logTransaction, OWNER_IDS } from "@/lib/credits"

const OWNER_PHRASE = "ELX-9xK2mP7vQn"

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
  Button:  Font.GothamMedium, Size 13
BUTTON EXAMPLE:
  Size=UDim2.new(0,130,0,36), BG=Color3.fromRGB(25,25,25),
  TextColor=white, CornerRadius UDim(0,6), NO stroke`,

  modern: `
=== UI STYLE: MODERN DARK ===
PALETTE:
  Background  = Color3.fromRGB(10,  10,  18 )
  Panel       = Color3.fromRGB(20,  20,  34 )
  Card        = Color3.fromRGB(28,  28,  45 )
  Accent      = Color3.fromRGB(124, 58,  237)  -- purple
  AccentLight = Color3.fromRGB(167, 105, 255)
  Text        = Color3.fromRGB(230, 228, 250)
  Subtext     = Color3.fromRGB(130, 125, 160)
  Border      = Color3.fromRGB(55,  50,  85 )
STYLE RULES:
  CornerRadius = UDim.new(0, 12)
  UIStroke: Thickness=1, Color=Border, Transparency=0.4
  Button UIGradient: Color0=Color3.fromRGB(139,92,246), Color1=Color3.fromRGB(109,40,217), Rotation=90
  Cards: BackgroundTransparency=0.1 with subtle border
  Padding: UIPadding Left=16 Right=16 Top=12 Bottom=12
FONTS:
  Title:   Font.GothamBold,   Size 20
  Body:    Font.Gotham,       Size 14
  Button:  Font.GothamBold,   Size 14
BUTTON EXAMPLE:
  Size=UDim2.new(0,160,0,44), BG=Color3.fromRGB(124,58,237),
  UIGradient as above, CornerRadius UDim(0,12), TextColor=white`,

  sleek: `
=== UI STYLE: SLEEK GLASS ===
PALETTE:
  Background  = Color3.fromRGB(5,   5,   12 )
  Glass       = Color3.fromRGB(255, 255, 255)  -- use with high transparency
  GlassBorder = Color3.fromRGB(255, 255, 255)  -- use with high transparency
  Accent      = Color3.fromRGB(180, 170, 255)
  Text        = Color3.fromRGB(240, 238, 255)
  Subtext     = Color3.fromRGB(140, 135, 175)
GLASS TECHNIQUE (use for ALL panels):
  BackgroundColor3 = Color3.fromRGB(255,255,255)
  BackgroundTransparency = 0.88
  UIStroke: Color=Color3.fromRGB(255,255,255), Transparency=0.75, Thickness=1
  CornerRadius = UDim.new(0, 18)
STYLE RULES:
  Extreme minimalism. Maximum whitespace.
  Only essential elements on screen.
  Padding: UIPadding Left=20 Right=20 Top=16 Bottom=16
FONTS:
  Title:   Font.GothamBold, Size 17
  Body:    Font.Gotham,     Size 13
  Button:  Font.Gotham,     Size 13
BUTTON EXAMPLE:
  Glass technique above, Size=UDim2.new(0,150,0,42), TextColor=Accent`,

  cartoony: `
=== UI STYLE: CARTOONY ===
PALETTE:
  Background  = Color3.fromRGB(255, 245, 180)  -- warm yellow
  PrimaryBtn  = Color3.fromRGB(255, 75,  75 )  -- red
  SecondaryBtn= Color3.fromRGB(75,  130, 255)  -- blue
  Success     = Color3.fromRGB(75,  210, 100)  -- green
  Text        = Color3.fromRGB(255, 255, 255)
  Outline     = Color3.fromRGB(0,   0,   0  )
REQUIRED ON EVERY ELEMENT:
  UIStroke: Thickness=3, Color=Color3.fromRGB(0,0,0)  -- BLACK OUTLINE IS MANDATORY
  CornerRadius = UDim.new(0, 24)  -- very round
STYLE RULES:
  Oversized elements. Big padding.
  Drop shadow: duplicate frame offset by (4,4) with black color
  Padding: UIPadding Left=18 Right=18 Top=14 Bottom=14
FONTS:
  ALL TEXT: Font.GothamBold or Font.GothamBlack
  Title Size=22, Body Size=16, Button Size=18
  ALL UPPERCASE for buttons and labels
BUTTON EXAMPLE:
  Size=UDim2.new(0,180,0,56), BG=Color3.fromRGB(255,75,75),
  UIStroke Thickness=3 black, CornerRadius UDim(0,24),
  TextColor=white, Font=GothamBold, TextScaled=false`,

  neon: `
=== UI STYLE: NEON CYBERPUNK ===
PALETTE:
  Background = Color3.fromRGB(0,   0,   0  )  -- pure black
  Panel      = Color3.fromRGB(8,   8,   16 )
  NeonCyan   = Color3.fromRGB(0,   255, 240)
  NeonPink   = Color3.fromRGB(255, 0,   180)
  NeonLime   = Color3.fromRGB(0,   255, 65 )
  NeonYellow = Color3.fromRGB(255, 240, 0  )
  Text       = Color3.fromRGB(220, 255, 255)
GLOW TECHNIQUE (UIStroke simulates neon glow):
  UIStroke: Color=NeonCyan, Thickness=2, Transparency=0
  Use NeonPink for secondary elements
  Use NeonLime for success/confirm
STYLE RULES:
  CornerRadius = UDim.new(0, 4)  -- sharp, angular
  Panel BackgroundTransparency = 0.6
  ALL text UPPERCASE
  Thin divider lines using frames H=1 with neon color
  Padding: UIPadding Left=14 Right=14 Top=10 Bottom=10
FONTS:
  Font.Code or Font.RobotoMono for labels Size=12
  Font.GothamBold for values/numbers Size=16
BUTTON EXAMPLE:
  Size=UDim2.new(0,160,0,38), BG=Color3.fromRGB(0,0,0),
  BackgroundTransparency=0.3, UIStroke Color=NeonCyan Thickness=2,
  CornerRadius UDim(0,4), TextColor=NeonCyan, ALL CAPS`,
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
- Proper DataStore retry logic with exponential backoff`

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

    // ── Auth checks ───────────────────────────────────────────────────────────
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

    // ── Test step — no code needed ─────────────────────────────────────────────
    if (step?.type === "test") {
      return NextResponse.json({
        ok: true, injected: false,
        result: "Check Studio Output for errors.",
        code: null,
      })
    }

    const model    = modelId    ?? "google/gemini-2.0-flash-001"
    const location = step?.location ?? "ServerScriptService/ElixirScript"
    const style    = (uiStyle as string) ?? "modern"
    const isOwner  = OWNER_IDS.has(String(robloxId)) || ownerMode === true

    // ── Full system prompt with style guide injected ───────────────────────────
    const styleGuide = UI_STYLES[style] ?? UI_STYLES.modern
    const SYSTEM = `${BASE_SYSTEM}\n\n${styleGuide}`

    const userPrompt = [
      `User request: "${message}"`,
      `Implement this step: ${step?.description ?? message}`,
      `Script goes at: ${location}`,
      conversationContext ? `Prior context:\n${conversationContext}` : "",
    ].filter(Boolean).join("\n\n")

    // ── Credits ───────────────────────────────────────────────────────────────
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

    // ── Build AI message (with vision if image attached) ──────────────────────
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
    if (!aiRes.ok) throw new Error(`OpenRouter error: ${aiData?.error?.message ?? aiRes.status}`)

    let code: string = aiData.choices?.[0]?.message?.content ?? ""
    if (!code.trim()) throw new Error("AI returned empty code")

    // Strip fences if AI ignored rules
    code = code
      .replace(/^```(?:lua|luau)?\s*\n?/im, "")
      .replace(/\n?```\s*$/im, "")
      .trim()

    // Ensure required headers
    if (!code.startsWith("-- Type:")) {
      const parts = location.split("/")
      const name  = parts[parts.length - 1] ?? "ElixirScript"
      code = `-- Type: Script\n-- Name: ${name}\n-- Place: ${location}\n\n${code}`
    }

    pushCode(String(robloxId), code)
    console.log(
      `[Elixir] ✓ | user:${robloxId} | style:${style} | lines:${code.split("\n").length}${isOwner ? " | OWNER" : ""}`
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