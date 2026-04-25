import { NextRequest, NextResponse } from "next/server"
import { kv }                        from "@vercel/kv"
import { getCredits, deductCredits, logTransaction, calcCreditsFromUSD, OWNER_IDS } from "@/lib/credits"

export const dynamic = "force-dynamic"

// ─── Model pricing for actual token usage (USD per million tokens) ─────────────
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemma-2-9b-it:free":          { input: 0,     output: 0      },
  "google/gemini-2.0-flash-001":        { input: 0.075, output: 0.30   },
  "google/gemini-flash-1.5":            { input: 0.075, output: 0.30   },
  "openai/gpt-4o-mini":                 { input: 0.15,  output: 0.60   },
  "meta-llama/llama-3.3-70b-instruct":  { input: 0.65,  output: 0.65   },
  "deepseek/deepseek-r1":               { input: 0.55,  output: 2.19   },
  "openai/gpt-4o":                      { input: 2.50,  output: 10.00  },
  "anthropic/claude-sonnet-4-6":        { input: 3.00,  output: 15.00  },
}

function getOpenRouterCostUSD(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0
  const inputCost  = (promptTokens     / 1_000_000) * pricing.input
  const outputCost = (completionTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model, robloxId } = await req.json()

    if (!robloxId) {
      return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 })
    }
    if (!messages || !model) {
      return NextResponse.json({ ok: false, error: "Missing messages or model." }, { status: 400 })
    }

    const isOwner = OWNER_IDS.has(String(robloxId))

    // ── Check credits before call ──────────────────────────────────────────────
    if (!isOwner) {
      const balance = await getCredits(String(robloxId))
      if (balance <= 0) {
        return NextResponse.json(
          { ok: false, error: "Not enough credits. Please top up your balance." },
          { status: 402 }
        )
      }
    }

    // ── Call OpenRouter ────────────────────────────────────────────────────────
    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type":  "application/json",
        "HTTP-Referer":  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title":       "Elixir AI",
      },
      body: JSON.stringify({ model, messages }),
    })

    if (!orResponse.ok) {
      const err = await orResponse.text()
      console.error("[OpenRouter Error]", err)
      return NextResponse.json({ ok: false, error: "AI request failed." }, { status: 502 })
    }

    const data = await orResponse.json()

    // ── Deduct actual credits based on real token usage ────────────────────────
    const promptTokens     = data.usage?.prompt_tokens     ?? 0
    const completionTokens = data.usage?.completion_tokens ?? 0
    const openRouterCostUSD = getOpenRouterCostUSD(model, promptTokens, completionTokens)
    const creditsToCharge   = calcCreditsFromUSD(openRouterCostUSD)

    console.log(
      `[Credits] user:${robloxId} | model:${model} | ` +
      `OpenRouter: $${openRouterCostUSD.toFixed(6)} USD | ` +
      `CAD ×3.5: CA$${(openRouterCostUSD * 1.38 * 3.5).toFixed(6)} | ` +
      `Deduct: ${creditsToCharge} cr`
    )

    let newBalance = 0
    if (!isOwner && creditsToCharge > 0) {
      const result = await deductCredits(String(robloxId), creditsToCharge)
      newBalance   = result.remaining ?? 0
      await logTransaction(String(robloxId), "deduct", creditsToCharge, { model }).catch(() => {})
    } else {
      newBalance = await getCredits(String(robloxId))
    }

    const reply = data.choices?.[0]?.message?.content ?? ""

    return NextResponse.json({
      ok:             true,
      reply,
      creditsCharged: creditsToCharge,
      newBalance,
    })

  } catch (err: any) {
    console.error("[Chat API Error]", err)
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal server error" }, { status: 500 })
  }
}