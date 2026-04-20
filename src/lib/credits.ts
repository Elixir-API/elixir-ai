// src/lib/credits.ts

let _mem: Map<string, number> | null = null
const mem = () => { if (!_mem) _mem = new Map(); return _mem! }
const KEY = (id: string) => `elixir:credits:${id}`
const STARTING_CREDITS = 50 // new users get 50 free credits ($0.50 worth)

// Lazy-load Vercel KV only when env vars exist
async function getKV() {
  if (!process.env.KV_REST_API_URL) return null
  try {
    const { kv } = await import("@vercel/kv")
    return kv
  } catch {
    return null
  }
}

export async function getCredits(robloxId: string): Promise<number> {
  const kv = await getKV()

  if (kv) {
    const val = await kv.get<number>(KEY(robloxId))
    if (val === null || val === undefined) {
      await kv.set(KEY(robloxId), STARTING_CREDITS)
      return STARTING_CREDITS
    }
    return val
  }

  // Local dev — in-memory
  const m = mem()
  if (!m.has(robloxId)) m.set(robloxId, STARTING_CREDITS)
  return m.get(robloxId)!
}

export async function deductCredits(
  robloxId: string,
  amount: number,
): Promise<{ ok: boolean; remaining: number; deducted: number; error?: string }> {
  const current = await getCredits(robloxId)

  if (current < amount) {
    return {
      ok: false,
      remaining: current,
      deducted: 0,
      error: `Not enough credits — need ${amount.toFixed(2)}, have ${current.toFixed(2)}`,
    }
  }

  const newBalance = Math.round((current - amount) * 100) / 100
  const kv = await getKV()

  if (kv) {
    await kv.set(KEY(robloxId), newBalance)
  } else {
    mem().set(robloxId, newBalance)
  }

  return { ok: true, remaining: newBalance, deducted: amount }
}

export async function addCredits(
  robloxId: string,
  amount: number,
): Promise<{ newBalance: number }> {
  const current = await getCredits(robloxId)
  const newBalance = Math.round((current + amount) * 100) / 100
  const kv = await getKV()

  if (kv) {
    await kv.set(KEY(robloxId), newBalance)
  } else {
    mem().set(robloxId, newBalance)
  }

  return { newBalance }
}

// Log every transaction for your records
export async function logTransaction(
  robloxId: string,
  type: "deduct" | "add" | "purchase",
  amount: number,
  meta: Record<string, any>,
) {
  const kv = await getKV()
  if (!kv) return

  const logKey = `elixir:log:${robloxId}:${Date.now()}`
  await kv.set(logKey, JSON.stringify({ type, amount, meta, ts: Date.now() }), {
    ex: 60 * 60 * 24 * 30, // keep logs 30 days
  })
}