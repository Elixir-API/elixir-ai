// lib/pricing.ts

// ── Global pricing config ────────────────────────────────────────────────────
export const PROFIT_MULTIPLIER = 5    // 5x markup over real API cost
export const CREDITS_PER_USD   = 200  // 200 credits = $1.00 user-side

// ── Model pricing interface ──────────────────────────────────────────────────
export interface ModelPricing {
  apiId:       string
  name:        string
  inputPer1M:  number   // USD per 1M input tokens
  outputPer1M: number   // USD per 1M output tokens
  free:        boolean
}

// ── Model pricing table ──────────────────────────────────────────────────────
// apiId MUST match the apiId used in ModelSelector.tsx exactly
export const MODEL_PRICING: Record<string, ModelPricing> = {

  // FREE ─────────────────────────────────────────────────────────────────────
  "google/gemini-2.0-flash-exp:free": {
    apiId:       "google/gemini-2.0-flash-exp:free",
    name:        "Gemini 2.0 Flash (Free)",
    inputPer1M:  0,
    outputPer1M: 0,
    free:        true,
  },

  // LOW TIER (~0.2–0.3 cr / msg) ─────────────────────────────────────────────
  "google/gemini-2.0-flash-001": {
    apiId:       "google/gemini-2.0-flash-001",
    name:        "Gemini 2.0 Flash",
    inputPer1M:  0.075,
    outputPer1M: 0.30,
    free:        false,
  },
  "meta-llama/llama-3.3-70b-instruct": {
    apiId:       "meta-llama/llama-3.3-70b-instruct",
    name:        "Llama 3.3 70B",
    inputPer1M:  0.12,
    outputPer1M: 0.30,
    free:        false,
  },

  // MID TIER (~0.4–1.5 cr / msg) ─────────────────────────────────────────────
  "openai/gpt-4o-mini": {
    apiId:       "openai/gpt-4o-mini",
    name:        "GPT-4o Mini",
    inputPer1M:  0.15,
    outputPer1M: 0.60,
    free:        false,
  },
  "deepseek/deepseek-r1": {
    apiId:       "deepseek/deepseek-r1",
    name:        "DeepSeek R1",
    inputPer1M:  0.55,
    outputPer1M: 2.19,
    free:        false,
  },

  // HIGH TIER (~7–10 cr / msg) ───────────────────────────────────────────────
  "openai/gpt-4o": {
    apiId:       "openai/gpt-4o",
    name:        "GPT-4o",
    inputPer1M:  2.50,
    outputPer1M: 10.00,
    free:        false,
  },
  "anthropic/claude-sonnet-4-5": {
    apiId:       "anthropic/claude-sonnet-4-5",
    name:        "Claude Sonnet",
    inputPer1M:  3.00,
    outputPer1M: 15.00,
    free:        false,
  },
}

// ── Estimate result type ─────────────────────────────────────────────────────
export interface CreditEstimate {
  credits:      number
  usdCostToUs:  number
  usdUserPays:  number
  inputTokens:  number
  outputTokens: number
  isFree:       boolean
}

// ── Main estimate function ───────────────────────────────────────────────────
export function estimateCreditCost(
  modelApiId: string,
  promptText: string
): CreditEstimate {
  const pricing = MODEL_PRICING[modelApiId]

  // Unknown or free model — no charge
  if (!pricing || pricing.free) {
    return {
      credits:      0,
      usdCostToUs:  0,
      usdUserPays:  0,
      inputTokens:  0,
      outputTokens: 0,
      isFree:       true,
    }
  }

  // Token estimation
  // - System prompt is ~300 tokens (lean constant, not 1500)
  // - User prompt scales with actual message length
  // - Output is proportional but capped at 2000
  const SYSTEM_TOKENS  = 300
  const promptTokens   = Math.max(10, Math.ceil(promptText.length / 4))
  const inputTokens    = SYSTEM_TOKENS + promptTokens
  const outputTokens   = Math.min(Math.max(150, promptTokens * 3), 2000)

  const usdCostToUs =
    (inputTokens  / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M

  const usdUserPays = usdCostToUs * PROFIT_MULTIPLIER
  const credits     = Math.max(0.01, Math.round(usdUserPays * CREDITS_PER_USD * 100) / 100)

  return {
    credits,
    usdCostToUs,
    usdUserPays,
    inputTokens,
    outputTokens,
    isFree: false,
  }
}

// ── Helper — lookup model by apiId ───────────────────────────────────────────
export function getModelPricing(modelApiId: string): ModelPricing | null {
  return MODEL_PRICING[modelApiId] ?? null
}

// ── Helper — check if a model is free ───────────────────────────────────────
export function isModelFree(modelApiId: string): boolean {
  const pricing = MODEL_PRICING[modelApiId]
  return !pricing || pricing.free || modelApiId.endsWith(":free")
}

// ── Helper — format credits for display ──────────────────────────────────────
export function formatCredits(credits: number): string {
  if (credits === 0) return "Free"
  if (credits < 0.01) return "<0.01 cr"
  if (credits < 1) return `${credits.toFixed(2)} cr`
  return `${credits.toFixed(1)} cr`
}