// ── Inject queue ──────────────────────────────────────────────────────────────
function getInjectStore(): Map<string, string[]> {
  if (!(globalThis as any).__elixir_inject)
    (globalThis as any).__elixir_inject = new Map<string, string[]>()
  return (globalThis as any).__elixir_inject
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────
function getHeartbeatStore(): Map<string, number> {
  if (!(globalThis as any).__elixir_heartbeat)
    (globalThis as any).__elixir_heartbeat = new Map<string, number>()
  return (globalThis as any).__elixir_heartbeat
}

// ── Output log (plugin reports back) ─────────────────────────────────────────
interface PluginLog {
  success: boolean
  scriptName: string
  message: string
  timestamp: number
}

function getOutputStore(): Map<string, PluginLog[]> {
  if (!(globalThis as any).__elixir_output)
    (globalThis as any).__elixir_output = new Map<string, PluginLog[]>()
  return (globalThis as any).__elixir_output
}

// ── Exports ───────────────────────────────────────────────────────────────────
export function pushCode(robloxId: string, code: string) {
  const store = getInjectStore()
  const q = store.get(robloxId) ?? []
  q.push(code)
  store.set(robloxId, q)
  console.log(`[Elixir] ✓ Queued injection for ${robloxId} | queue: ${q.length} | chars: ${code.length}`)
}

export function popCode(robloxId: string): string | null {
  const store = getInjectStore()
  const q = store.get(robloxId) ?? []
  if (!q.length) return null
  const code = q.shift()!
  store.set(robloxId, q)
  console.log(`[Elixir] → Sent to plugin ${robloxId} | remaining: ${q.length}`)
  return code
}

export function queueLength(robloxId: string): number {
  return (getInjectStore().get(robloxId) ?? []).length
}

export function heartbeat(robloxId: string) {
  getHeartbeatStore().set(robloxId, Date.now())
}

export function disconnect(robloxId: string) {
  getHeartbeatStore().set(robloxId, 0)
  getInjectStore().delete(robloxId)
  console.log(`[Elixir] Plugin disconnected: ${robloxId}`)
}

export function isConnected(robloxId: string): boolean {
  const ts = getHeartbeatStore().get(robloxId)
  return !!ts && ts > 0 && Date.now() - ts < 10_000
}

export function anyConnected(): boolean {
  const now = Date.now()
  for (const [, ts] of getHeartbeatStore())
    if (ts > 0 && now - ts < 10_000) return true
  return false
}

export function pushLog(robloxId: string, log: Omit<PluginLog, "timestamp">) {
  const store = getOutputStore()
  const logs = store.get(robloxId) ?? []
  logs.push({ ...log, timestamp: Date.now() })
  if (logs.length > 100) logs.splice(0, logs.length - 100)
  store.set(robloxId, logs)
}

export function getLogs(robloxId: string): PluginLog[] {
  return getOutputStore().get(robloxId) ?? []
}

export function clearLogs(robloxId: string) {
  getOutputStore().delete(robloxId)
}