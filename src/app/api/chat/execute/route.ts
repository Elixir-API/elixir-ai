import { NextRequest, NextResponse } from "next/server"
import { pushCode, isConnected } from "@/lib/inject-store"
import { estimateCreditCost } from "@/lib/pricing"
import { deductCredits, logTransaction, OWNER_IDS } from "@/lib/credits"

// ── Location sanitizer ────────────────────────────────────────────────────────

function sanitizeLocation(raw: string | null | undefined, hint?: string): string {
  if (!raw?.trim()) return "ServerScriptService/ElixirHandler"

  const parts = raw.trim().split("/").filter(Boolean)

  if (parts.length === 1) {
    const svc  = parts[0]
    const name = hint
      ? hint.replace(/[^a-zA-Z0-9]/g, "").slice(0, 28) || "Handler"
      : "Handler"
    return `${svc}/${name}`
  }

  // Duplicate segment: StarterPlayerScripts/StarterPlayerScripts
  const last = parts[parts.length - 1]
  const prev = parts[parts.length - 2]
  if (last === prev) {
    const name = hint
      ? hint.replace(/[^a-zA-Z0-9]/g, "").slice(0, 28) || `${last}Script`
      : `${last}Script`
    parts[parts.length - 1] = name
  }

  return parts.join("/")
}

// ── Deletion script generator ─────────────────────────────────────────────────
// Generates a self-deleting Lua script that destroys the target instance in Studio

function buildDeletionScript(targetPath: string, description: string): string {
  // Parse path: first segment = service, rest = child chain
  const parts = targetPath.split("/").filter(Boolean)
  const service = parts[0] ?? "Workspace"
  const chain   = parts.slice(1)

  const chainCode = chain.map((seg, i) => {
    const parent = i === 0 ? "svc" : `c${i - 1}`
    return `  local c${i} = ${parent}:FindFirstChild("${seg}")
  if not c${i} then warn("[Elixir] Not found: ${seg} in ${targetPath}") script:Destroy() return end`
  }).join("\n")

  const finalVar  = chain.length > 0 ? `c${chain.length - 1}` : "svc"
  const chainFind = chain.length > 0
    ? chainCode
    : `  -- deleting the service root (unusual) — abort\n  warn("[Elixir] Cannot delete a top-level service.")\n  script:Destroy()\n  return`

  return `-- Type: Script
-- Name: ElixirDelete
-- Place: ServerScriptService/ElixirDelete

-- Auto-generated delete operation: ${description}
local success, err = pcall(function()
  local svc = game:GetService("${service}")
${chainFind}
  ${finalVar}:Destroy()
  print("[Elixir] ✓ Deleted: ${targetPath}")
end)
if not success then
  warn("[Elixir] Delete failed: " .. tostring(err))
end
script:Destroy()
`
}

// ── UI Style guides ───────────────────────────────────────────────────────────

const UI_STYLES: Record<string, string> = {
  minimal: `
=== UI STYLE: MINIMAL ===
PALETTE: Background=RGB(248,248,248) Card=RGB(255,255,255) Text=RGB(25,25,25) Border=RGB(220,220,220) Accent=RGB(60,60,60)
STYLE: CornerRadius UDim(0,6), UIStroke Thickness=1, NO gradients, NO shadows, flat design
FONTS: Title=GothamBold/16 Body=Gotham/13 Button=GothamMedium/13`,

  modern: `
=== UI STYLE: MODERN DARK ===
PALETTE: Background=RGB(10,10,18) Panel=RGB(20,20,34) Card=RGB(28,28,45) Accent=RGB(124,58,237) AccentLight=RGB(167,105,255) Text=RGB(230,228,250) Border=RGB(55,50,85)
STYLE: CornerRadius UDim(0,12), UIStroke Thickness=1 Transparency=0.4, Button UIGradient Color0=RGB(139,92,246) Color1=RGB(109,40,217) Rotation=90
FONTS: Title=GothamBold/20 Body=Gotham/14 Button=GothamBold/14`,

  sleek: `
=== UI STYLE: SLEEK GLASS ===
PALETTE: Background=RGB(5,5,12) Accent=RGB(180,170,255) Text=RGB(240,238,255)
GLASS: BackgroundColor3=white BackgroundTransparency=0.88 UIStroke Color=white Transparency=0.75 Thickness=1 CornerRadius UDim(0,18)
FONTS: Title=GothamBold/17 Body=Gotham/13`,

  cartoony: `
=== UI STYLE: CARTOONY ===
PALETTE: Background=RGB(255,245,180) Primary=RGB(255,75,75) Secondary=RGB(75,130,255) Text=white
REQUIRED: UIStroke Thickness=3 Color=black ON EVERY ELEMENT — MANDATORY. CornerRadius UDim(0,24).
FONTS: GothamBold ALL CAPS everywhere. Big padding.`,

  neon: `
=== UI STYLE: NEON CYBERPUNK ===
PALETTE: Background=RGB(0,0,0) NeonCyan=RGB(0,255,240) NeonPink=RGB(255,0,180) NeonLime=RGB(0,255,65) Text=RGB(220,255,255)
GLOW: UIStroke Color=NeonCyan Thickness=2. CornerRadius UDim(0,4). ALL UPPERCASE. Font.Code.`,
}

// ── System prompt ─────────────────────────────────────────────────────────────

const BASE_SYSTEM = `You are Elixir — an expert Roblox Lua engineer. You write production-ready code.

═══ ABSOLUTE OUTPUT RULES ═══
1. ONLY raw Lua. ZERO markdown. ZERO code fences. ZERO explanations.
2. First 3 lines MUST be exactly:
   -- Type: [Script|LocalScript|ModuleScript]
   -- Name: [ExactScriptName]
   -- Place: [ExactService/ExactPath]
3. NEVER placeholders. NEVER "-- add logic here". COMPLETE working code.
4. Minimum 80 lines. GUIs = 150-350 lines minimum.
5. Works with ZERO changes after paste.

═══ SCRIPT TYPE RULES ═══
• Server logic, DataStores, physics → Script in ServerScriptService
• GUI, player input, camera → LocalScript in StarterPlayerScripts OR inside ScreenGui in StarterGui
• Shared functions → ModuleScript in ReplicatedStorage

═══ GUI RULES (CRITICAL) ═══
• ALL GUIs must be LocalScripts
• LocalScript goes in: StarterGui/[ScreenGuiName]/[LocalScriptName]  OR  StarterPlayerScripts/[Name]
• Create ScreenGui → parent to PlayerGui via LocalScript (Players.LocalPlayer.PlayerGui)
• NEVER parent ScreenGui to ServerScriptService
• ALWAYS set ScreenGui.ResetOnSpawn = false
• ALWAYS set ScreenGui.IgnoreGuiInset = true for fullscreen UIs
• Every Frame/TextLabel/Button needs explicit Size, Position, BackgroundColor3, ZIndex

═══ LOCATION RULE ═══
• The -- Place: header MUST exactly match the requested location
• NEVER create sub-folders that weren't requested
• NEVER rename services

═══ CODE STRUCTURE ═══
-- [[ SERVICES ]]
-- [[ CONFIGURATION ]]
-- [[ INSTANCES / VARIABLES ]]
-- [[ FUNCTIONS ]]
-- [[ CONNECTIONS / MAIN ]]

═══ QUALITY ═══
• pcall() for all DataStore/network calls
• WaitForChild() for instances that load async
• Debounce on Touched events (0.5s cooldown table)
• RemoteEvents in ReplicatedStorage for client↔server
• :Destroy() / :Disconnect() cleanup`

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

    // ── Auth ───────────────────────────────────────────────────────────────
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

    // ── Test step ─────────────────────────────────────────────────────────
    if (step?.type === "test") {
      return NextResponse.json({
        ok: true, injected: false,
        result: "Check Studio Output for errors.",
        code: null,
      })
    }

    const model   = modelId ?? "google/gemini-2.0-flash-001"
    const style   = (uiStyle as string) ?? "modern"
    const isOwner = OWNER_IDS.has(String(robloxId)) || ownerMode === true

    // ── DELETE step — no AI needed, generate deterministic deletion code ──
    if (step?.type === "delete") {
      const rawLoc  = step.location ?? ""
      const delCode = buildDeletionScript(rawLoc, step.description ?? rawLoc)
      pushCode(String(robloxId), delCode)
      console.log(`[Elixir] DELETE | user:${robloxId} | target:${rawLoc}`)
      return NextResponse.json({
        ok: true, injected: true,
        result: `Deleted: ${rawLoc}`,
      })
    }

    // ── Sanitize location for create/modify ───────────────────────────────
    const location = sanitizeLocation(step?.location, step?.description)

    const styleGuide = UI_STYLES[style] ?? UI_STYLES.modern
    const SYSTEM     = `${BASE_SYSTEM}\n\n${styleGuide}`

    const userPrompt = [
      `User request: "${message}"`,
      `Task: ${step?.description ?? message}`,
      `Script location: ${location}`,
      `The -- Place: header MUST be exactly: ${location}`,
      conversationContext ? `Context from planning:\n${conversationContext}` : "",
    ].filter(Boolean).join("\n\n")

    // ── Credits ───────────────────────────────────────────────────────────
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

    // ── Build message (vision-aware) ───────────────────────────────────────
    const userMessage = imageDataUrl
      ? {
          role: "user",
          content: [
            { type: "text",      text: userPrompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        }
      : { role: "user", content: userPrompt }

    // ── Call OpenRouter ───────────────────────────────────────────────────
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title":      "Elixir AI",
      },
      body: JSON.stringify({
        model,
        stream:      false,
        max_tokens:  4096,
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

    // Strip any markdown fences if AI ignored rules
    code = code
      .replace(/^```(?:lua|luau)?\s*\n?/im, "")
      .replace(/\n?```\s*$/im, "")
      .trim()

    // Ensure headers are present
    if (!code.startsWith("-- Type:")) {
      const parts = location.split("/")
      const name  = parts[parts.length - 1] ?? "ElixirScript"
      // Guess script type from location
      const isLocal = location.toLowerCase().includes("startergui") ||
                      location.toLowerCase().includes("starterplayer") ||
                      location.toLowerCase().includes("playergui")
      const type  = isLocal ? "LocalScript" : "Script"
      code = `-- Type: ${type}\n-- Name: ${name}\n-- Place: ${location}\n\n${code}`
    }

    pushCode(String(robloxId), code)
    console.log(
      `[Elixir] ✓ | user:${robloxId} | loc:${location} | style:${style} | lines:${code.split("\n").length}${isOwner ? " | OWNER" : ""}`
    )

    return NextResponse.json({
      ok: true, injected: true,
      result: `Injected: ${step?.description ?? "script"}`,
      lines: code.split("\n").length,
    })

  } catch (e: any) {
    console.error("[Elixir] Execute error:", e)
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}