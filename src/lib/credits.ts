import { kv } from "@vercel/kv"

// ─── CAD Config ───────────────────────────────────────────────────────────────
export const USD_TO_CAD          = 1.38
export const CREDIT_CAD_VALUE    = 4.99 / 25   // CA$0.1996 per credit
export const MARKUP_MULTIPLIER   = 3.5
export const DAILY_FREE_CREDITS  = 2
export const STARTING_CREDITS    = 2

// ─── Owner IDs (free usage) ───────────────────────────────────────────────────
export const OWNER_IDS = new Set([
  "YOUR_ROBLOX_ID_HERE", // replace with your actual Roblox ID
])

// ─── Credit Packs (CAD) ───────────────────────────────────────────────────────
export const CREDIT_PACKS = [
  { id: "small",  credits: 25,  priceCAD: 4.99,  bonusPct: 0, popular: false },
  { id: "medium", credits: 100, priceCAD: 19.99, bonusPct: 1, popular: true  },
  { id: "large",  credits: 500, priceCAD: 99.99, bonusPct: 3, popular: false },
] as const

// ─── KV Helpers ───────────────────────────────────────────────────────────────

export async function getCredits(robloxId: string): Promise<number> {
  const credits = await kv.get<number>(`credits:${robloxId}`)
  return credits ?? STARTING_CREDITS
}

export async function setCredits(robloxId: string, amount: number): Promise<void> {
  await kv.set(`credits:${robloxId}`, Math.max(0, amount))
}

export async function addCredits(robloxId: string, amount: number): Promise<number> {
  const current    = await getCredits(robloxId)
  const newBalance = current + amount
  await setCredits(robloxId, newBalance)
  return newBalance
}

// ─── Deduct Credits ───────────────────────────────────────────────────────────

export async function deductCredits(
  robloxId: string,
  amount: number
): Promise<{ ok: boolean; error?: string; remaining?: number }> {
  const current = await getCredits(robloxId)

  if (current < amount) {
    return {
      ok: false,
      error: `Not enough credits. You have ${current.toFixed(2)} cr, need ${amount.toFixed(2)} cr.`,
    }
  }

  const newBalance = current - amount
  await setCredits(robloxId, newBalance)
  return { ok: true, remaining: newBalance }
}

// ─── Log Transaction ──────────────────────────────────────────────────────────

export async function logTransaction(
  robloxId: string,
  type: "deduct" | "add" | "daily" | "purchase",
  amount: number,
  meta?: Record<string, any>
): Promise<void> {
  const entry = JSON.stringify({ type, amount, meta, timestamp: Date.now() })
  await kv.lpush(`transactions:${robloxId}`, entry)
  await kv.ltrim(`transactions:${robloxId}`, 0, 99) // keep last 100
}

// ─── Daily Credits ────────────────────────────────────────────────────────────

export async function claimDailyCredits(robloxId: string): Promise<{
  ok: boolean
  granted: number
  balance: number
  message: string
  nextGrant?: number
}> {
  const key       = `daily:${robloxId}`
  const lastGrant = await kv.get<number>(key)

  if (lastGrant) {
    const hoursSince = (Date.now() - lastGrant) / 36e5
    if (hoursSince < 24) {
      const nextGrant = lastGrant + 24 * 60 * 60 * 1000
      const balance   = await getCredits(robloxId)
      return { ok: false, granted: 0, balance, message: "Already claimed today!", nextGrant }
    }
  }

  const balance = await addCredits(robloxId, DAILY_FREE_CREDITS)
  await kv.set(key, Date.now())
  await logTransaction(robloxId, "daily", DAILY_FREE_CREDITS)

  return {
    ok:      true,
    granted: DAILY_FREE_CREDITS,
    balance,
    message: `+${DAILY_FREE_CREDITS} daily credits added!`,
  }
}

// ─── Calculate Credits From OpenRouter USD Cost ───────────────────────────────
//
// "I am [model]. OpenRouter charges $X USD.
//  Convert to CAD: × 1.38
//  Apply 3.5× markup
//  Divide by credit value → N credits to deduct"

export function calcCreditsFromUSD(openRouterCostUSD: number): number {
  if (openRouterCostUSD === 0) return 0
  const costCAD   = openRouterCostUSD * USD_TO_CAD
  const chargeCAD = costCAD * MARKUP_MULTIPLIER
  const credits   = chargeCAD / CREDIT_CAD_VALUE
  return Math.round(credits * 100) / 100
}