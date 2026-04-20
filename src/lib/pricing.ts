// src/lib/pricing.ts
// Pulls ACTUAL token usage from OpenRouter response → charges exact credits

export type ModelPricing = {
  apiId: string
  name: string
  inputPer1M: number   // USD per 1M input tokens
  outputPer1M: number  // USD per 1M output tokens
  free: boolean
}

// Live OpenRouter pricing as of 2026
export const MODEL_PRICING: Record<string, ModelPricing> = {
  "qwen/qwen-2.5-coder-32b-instruct:free": {
    apiId: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen 2.5 Coder",
    inputPer1M: 0, outputPer1M: 0, free: true,
  },
  "google/gemini-2.0-flash-exp:free": {
    apiId: "google/gemini-2.0-flash-exp:free",
    name: "Gemini Flash",
    inputPer1M: 0, outputPer1M: 0, free: true,
  },
  "deepseek/deepseek-r1:free": {
    apiId: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1",
    inputPer1M: 0, outputPer1M: 0, free: true,
  },
  "google/gemini-2.0-flash-001": {
    apiId: "google/gemini-2.0-flash-001",
    name: "Gemini Flash Pro",
    inputPer1M: 0.10, outputPer1M: 0.40, free: false,
  },
  "deepseek/deepseek-r1": {
    apiId: "deepseek/deepseek-r1",
    name: "DeepSeek R1 Pro",
    inputPer1M: 0.55, outputPer1M: 2.19, free: false,
  },
  "anthropic/claude-sonnet-4-5": {
    apiId: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    inputPer1M: 3.00, outputPer1M: 15.00, free: false,
  },
}

// How much profit we make on top of OpenRouter cost
// 3.5x = if it costs us $0.10, user pays $0.35 worth of credits
const PROFIT_MULTIPLIER = 3.5

// 1 credit = $0.01 USD
// 100 credits = $1.00
const CREDITS_PER_USD = 100

/**
 * ESTIMATE before sending — shown to user in UI
 * Uses rough token estimation from text length
 */
export function estimateCreditCost(
  modelApiId: string,
  promptText: string,
): {
  credits: number
  usdCostToUs: number
  usdUserPays: number
  inputTokens: number
  outputTokens: number
  isFree: boolean
} {
  const pricing = MODEL_PRICING[modelApiId]

  if (!pricing || pricing.free) {
    return {
      credits: 0, usdCostToUs: 0, usdUserPays: 0,
      inputTokens: 0, outputTokens: 0, isFree: true,
    }
  }

  // ~4 chars per token + 1,500 token system prompt overhead
  const inputTokens  = 1500 + Math.ceil(promptText.length / 4)
  // Code gen output is typically 2-3x input, capped at 4096
  const outputTokens = Math.min(Math.ceil(inputTokens * 2.5), 4096)

  const usdCostToUs =
    (inputTokens  / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M

  const usdUserPays = usdCostToUs * PROFIT_MULTIPLIER

  // Round to 2 decimal places, minimum 0.01
  const credits = Math.max(0.01, Math.round(usdUserPays * CREDITS_PER_USD * 100) / 100)

  return { credits, usdCostToUs, usdUserPays, inputTokens, outputTokens, isFree: false }
}

/**
 * EXACT charge after response — uses real token counts from OpenRouter
 * OpenRouter returns usage: { prompt_tokens, completion_tokens }
 */
export function calculateExactCreditCost(
  modelApiId: string,
  promptTokens: number,
  completionTokens: number,
): {
  credits: number
  usdCostToUs: number
  usdUserPays: number
  profitUsd: number
} {
  const pricing = MODEL_PRICING[modelApiId]

  if (!pricing || pricing.free) {
    return { credits: 0, usdCostToUs: 0, usdUserPays: 0, profitUsd: 0 }
  }

  const usdCostToUs =
    (promptTokens     / 1_000_000) * pricing.inputPer1M +
    (completionTokens / 1_000_000) * pricing.outputPer1M

  const usdUserPays = usdCostToUs * PROFIT_MULTIPLIER
  const profitUsd   = usdUserPays - usdCostToUs
  const credits     = Math.max(0.01, Math.round(usdUserPays * CREDITS_PER_USD * 100) / 100)

  return { credits, usdCostToUs, usdUserPays, profitUsd }
}

// Helper — formats credit number nicely: 1.5, 0.12, 5.15
export function formatCredits(n: number): string {
  if (n === 0) return "Free"
  if (n < 0.1) return n.toFixed(3)
  if (n < 10)  return n.toFixed(2)
  return n.toFixed(1)
}