import { USD_TO_CAD, CREDIT_CAD_VALUE, MARKUP_MULTIPLIER } from "@/lib/credits"

// ─── Model Pricing (USD per million tokens, from OpenRouter) ──────────────────
const MODEL_PRICING: Record<string, { input: number; output: number; free?: boolean }> = {
  "google/gemma-2-9b-it:free":          { input: 0,     output: 0,     free: true },
  "google/gemini-2.0-flash-001":        { input: 0.075, output: 0.30  },
  "google/gemini-flash-1.5":            { input: 0.075, output: 0.30  },
  "openai/gpt-4o-mini":                 { input: 0.15,  output: 0.60  },
  "meta-llama/llama-3.3-70b-instruct":  { input: 0.65,  output: 0.65  },
  "deepseek/deepseek-r1":               { input: 0.55,  output: 2.19  },
  "openai/gpt-4o":                      { input: 2.50,  output: 10.00 },
  "anthropic/claude-sonnet-4-6":        { input: 3.00,  output: 15.00 },
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

export function estimateCreditCost(
  model: string,
  prompt: string
): { credits: number; isFree: boolean; estimatedUSD: number } {
  const pricing = MODEL_PRICING[model]

  if (!pricing || pricing.free) {
    return { credits: 0, isFree: true, estimatedUSD: 0 }
  }

  const promptTokens = estimateTokens(prompt)
  const outputTokens = 2000 // conservative estimate for code output

  const inputCost  = (promptTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const totalUSD   = inputCost + outputCost

  if (totalUSD === 0) return { credits: 0, isFree: true, estimatedUSD: 0 }

  const costCAD   = totalUSD * USD_TO_CAD
  const chargeCAD = costCAD * MARKUP_MULTIPLIER
  const credits   = Math.max(0.01, Math.round((chargeCAD / CREDIT_CAD_VALUE) * 100) / 100)

  return { credits, isFree: false, estimatedUSD: totalUSD }
}

export function formatcredits(credits: number): string {
  if (credits === 0) return "free"
  return credits.toFixed(2)
}