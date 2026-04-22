let _mem: Map<string, number> | null = null
const mem = () => { if (!_mem) _mem = new Map(); return _mem! }

let _dailyMem: Map<string, number> | null = null
const dailyMem = () => { if (!_dailyMem) _dailyMem = new Map(); return _dailyMem! }

const KEY       = (id: string) => `elixir:credits:${id}`
const DAILY_KEY = (id: string) => `elixir:daily:${id}`

const STARTING_CREDITS = 3
const DAILY_CREDITS    = 1
const DAILY_MS         = 24 * 60 * 60 * 1000
const OWNER_CREDITS    = 999_999

export const OWNER_IDS = new Set(["1682906375"])

async function getKV() {
  if (!process.env.KV_REST_API_URL) return null
  try {
    const { kv } = await import("@vercel/kv")
    return kv
  } catch {
    return null
  }
}

// ── Auto-grant 1 credit every 24h ─────────────────────────────────────────────
async function applyDailyIfReady(robloxId: string): Promise<void> {
  if (OWNER_IDS.has(robloxId)) return

  const kv  = await getKV()
  const now = Date.now()

  if (kv) {
    const last = await kv.get<number>(DAILY_KEY(robloxId))
    if (!last || now - last >= DAILY_MS) {
      const current = (await kv.get<number>(KEY(robloxId))) ?? STARTING_CREDITS
      await kv.set(KEY(robloxId), Math.round((current + DAILY_CREDITS) * 100) / 100)
      await kv.set(DAILY_KEY(robloxId), now)
    }
  } else {
    const dm   = dailyMem()
    const last = dm.get(robloxId)
    if (!last || now - last >= DAILY_MS) {
      const current = mem().get(robloxId) ?? STARTING_CREDITS
      mem().set(robloxId, Math.round((current + DAILY_CREDITS) * 100) / 100)
      dm.set(robloxId, now)
    }
  }
}

// ── Get ───────────────────────────────────────────────────────────────────────
export async function getCredits(robloxId: string): Promise<number> {
  if (OWNER_IDS.has(robloxId)) return OWNER_CREDITS

  await applyDailyIfReady(robloxId)

  const kv = await getKV()
  if (kv) {
    const val = await kv.get<number>(KEY(robloxId))
    if (val === null || val === undefined) {
      await kv.set(KEY(robloxId), STARTING_CREDITS)
      return STARTING_CREDITS
    }
    return val
  }

  const m = mem()
  if (!m.has(robloxId)) m.set(robloxId, STARTING_CREDITS)
  return m.get(robloxId)!
}

// ── Deduct ────────────────────────────────────────────────────────────────────
export async function deductCredits(
  robloxId: string,
  amount: number,
): Promise<{ ok: boolean; remaining: number; deducted: number; error?: string }> {
  // Owner never gets charged
  if (OWNER_IDS.has(robloxId)) {
    return { ok: true, remaining: OWNER_CREDITS, deducted: amount }
  }

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

// ── Add ───────────────────────────────────────────────────────────────────────
export async function addCredits(
  robloxId: string,
  amount: number,
): Promise<{ newBalance: number }> {
  if (OWNER_IDS.has(robloxId)) return { newBalance: OWNER_CREDITS }

  const current    = await getCredits(robloxId)
  const newBalance = Math.round((current + amount) * 100) / 100
  const kv         = await getKV()

  if (kv) {
    await kv.set(KEY(robloxId), newBalance)
  } else {
    mem().set(robloxId, newBalance)
  }

  return { newBalance }
}

// ── Log ───────────────────────────────────────────────────────────────────────
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
    ex: 60 * 60 * 24 * 30,
  })
}