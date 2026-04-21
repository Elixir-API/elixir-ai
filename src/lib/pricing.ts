// lib/pricing.ts
export type ModelPricing = {
  apiId: string
  name: string
  inputPer1M: number
  outputPer1M: number
  free: boolean
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // ── FREE ─────────────────────────────────────────────────────────────────
  "qwen/qwen-2.5-coder-32b-instruct:free": {
    apiId: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen 2.5 Coder",
    inputPer1M: 0, outputPer1M: 0, free: true,
  },

  // ── LOW TIER ─────────────────────────────────────────────────────────────
  "google/gemini-2.0-flash-001": {
    apiId: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    inputPer1M: 0.10, outputPer1M: 0.40, free: false,
  },
  "meta-llama/llama-3.3-70b-instruct": {
    apiId: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    inputPer1M: 0.12, outputPer1M: 0.30, free: false,
  },

  // ── MID TIER ─────────────────────────────────────────────────────────────
  "deepseek/deepseek-r1": {
    apiId: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    inputPer1M: 0.55, outputPer1M: 2.19, free: false,
  },
  "openai/gpt-4o-mini": {
    apiId: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    inputPer1M: 0.15, outputPer1M: 0.60, free: false,
  },

  // ── HIGH TIER ────────────────────────────────────────────────────────────
  "anthropic/claude-sonnet-4-5": {
    apiId: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    inputPer1M: 3.00, outputPer1M: 15.00, free: false,
  },
  "openai/gpt-4o": {
    apiId: "openai/gpt-4o",
    name: "GPT-4o",
    inputPer1M: 2.50, outputPer1M: 10.00, free: false,
  },
}

const PROFIT_MULTIPLIER = 3.5
const CREDITS_PER_USD = 100

export function estimateCreditCost(modelApiId: string, promptText: string) {
  const pricing = MODEL_PRICING[modelApiId]
  if (!pricing || pricing.free) {
    return { credits: 0, usdCostToUs: 0, usdUserPays: 0, inputTokens: 0, outputTokens: 0, isFree: true }
  }
  const inputTokens  = 1500 + Math.ceil(promptText.length / 4)
  const outputTokens = Math.min(Math.ceil(inputTokens * 2.5), 4096)
  const usdCostToUs  = (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M
  const usdUserPays  = usdCostToUs * PROFIT_MULTIPLIER
  const credits      = Math.max(0.01, Math.round(usdUserPays * CREDITS_PER_USD * 100) / 100)
  return { credits, usdCostToUs, usdUserPays, inputTokens, outputTokens, isFree: false }
}

export function calculateExactCreditCost(modelApiId: string, promptTokens: number, completionTokens: number) {
  const pricing = MODEL_PRICING[modelApiId]
  if (!pricing || pricing.free) {
    return { credits: 0, usdCostToUs: 0, usdUserPays: 0, profitUsd: 0 }
  }
  const usdCostToUs = (promptTokens / 1_000_000) * pricing.inputPer1M + (completionTokens / 1_000_000) * pricing.outputPer1M
  const usdUserPays = usdCostToUs * PROFIT_MULTIPLIER
  const profitUsd   = usdUserPays - usdCostToUs
  const credits     = Math.max(0.01, Math.round(usdUserPays * CREDITS_PER_USD * 100) / 100)
  return { credits, usdCostToUs, usdUserPays, profitUsd }
}

export function formatCredits(n: number): string {
  if (n === 0) return "Free"
  if (n < 0.1) return n.toFixed(3)
  if (n < 10)  return n.toFixed(2)
  return n.toFixed(1)
}