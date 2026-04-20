"use client"

import { useState } from "react"

type ModelLog = {
  id: string
  model: string
  prompt: string
  response: string
  tokens: {
    prompt: number
    completion: number
    total: number
  }
  latency: number
  cost: number
  status: "success" | "error" | "timeout"
  timestamp: string
  userId?: string
}

const MOCK_LOGS: ModelLog[] = [
  {
    id: "1",
    model: "gemini-flash",
    prompt: "How do I create a part in Roblox Studio?",
    response: "To create a part in Roblox Studio, go to the Home tab and click the Part button...",
    tokens: { prompt: 24, completion: 118, total: 142 },
    latency: 834,
    cost: 0.000071,
    status: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    userId: "1682906375",
  },
  {
    id: "2",
    model: "step-flash",
    prompt: "Write a Luau script to make a part spin",
    response: "Here's a simple Luau script to make a part spin:\n\nlocal part = script.Parent...",
    tokens: { prompt: 18, completion: 204, total: 222 },
    latency: 1243,
    cost: 0,
    status: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    userId: "1682906375",
  },
  {
    id: "3",
    model: "claude-sonnet",
    prompt: "Explain RemoteEvents vs RemoteFunctions",
    response: "",
    tokens: { prompt: 12, completion: 0, total: 12 },
    latency: 10001,
    cost: 0,
    status: "timeout",
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    userId: "9823741023",
  },
  {
    id: "4",
    model: "claude-opus",
    prompt: "What is the difference between a Script and LocalScript?",
    response: "A Script runs on the server side while a LocalScript runs on the client side...",
    tokens: { prompt: 20, completion: 156, total: 176 },
    latency: 712,
    cost: 0.000088,
    status: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    userId: "4827364910",
  },
  {
    id: "5",
    model: "gemini-flash",
    prompt: "Debug this script: [malformed input]",
    response: "",
    tokens: { prompt: 8, completion: 0, total: 8 },
    latency: 420,
    cost: 0,
    status: "error",
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    userId: "9823741023",
  },
]

const STATUS_STYLES = {
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  timeout: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
}

export default function ModelsPage() {
  const [logs] = useState<ModelLog[]>(MOCK_LOGS)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "success" | "error" | "timeout">("all")
  const [modelFilter, setModelFilter] = useState<string>("all")

  const models = ["all", ...Array.from(new Set(logs.map((l) => l.model)))]

  const filtered = logs.filter((l) => {
    const matchStatus = filter === "all" || l.status === filter
    const matchModel = modelFilter === "all" || l.model === modelFilter
    return matchStatus && matchModel
  })

  const totalTokens = logs.reduce((a, b) => a + b.tokens.total, 0)
  const totalCost = logs.reduce((a, b) => a + b.cost, 0)
  const avgLatency = Math.round(
    logs.reduce((a, b) => a + b.latency, 0) / logs.length
  )

  function timeAgo(timestamp: string) {
    const diff = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000
    )
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Model Logs
        </h1>
        <p className="text-white/40 text-sm mt-1">
          AI inference calls, tokens, latency and cost
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Calls" value={String(logs.length)} />
        <StatCard label="Total Tokens" value={totalTokens.toLocaleString()} />
        <StatCard
          label="Est. Cost"
          value={`$${totalCost.toFixed(5)}`}
          highlight
        />
        <StatCard label="Avg Latency" value={`${avgLatency}ms`} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["all", "success", "error", "timeout"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
              filter === f
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/50 focus:outline-none focus:border-purple-500/50"
          >
            {models.map((m) => (
              <option key={m} value={m} className="bg-black">
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Log Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-white/20 text-sm">
            No logs match your filter.
          </div>
        )}
        {filtered.map((log) => (
          <div
            key={log.id}
            className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden"
          >
            {/* Top Row */}
            <div className="px-5 py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-white/60 text-xs font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {log.model}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLES[log.status]}`}
                  >
                    {log.status}
                  </span>
                  {log.userId && (
                    <span className="text-purple-400/50 text-xs font-mono">
                      uid:{log.userId}
                    </span>
                  )}
                </div>
                <p className="text-white/70 text-sm truncate">{log.prompt}</p>
              </div>

              {/* Metrics */}
              <div className="flex gap-4 shrink-0 text-right">
                <div>
                  <p className="text-white/20 text-xs">Tokens</p>
                  <p className="text-white/60 text-sm font-mono">
                    {log.tokens.total.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-white/20 text-xs">Latency</p>
                  <p className="text-white/60 text-sm font-mono">
                    {log.latency}ms
                  </p>
                </div>
                <div>
                  <p className="text-white/20 text-xs">Cost</p>
                  <p className="text-white/60 text-sm font-mono">
                    ${log.cost.toFixed(5)}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-2">
                <span className="text-white/20 text-xs">
                  {timeAgo(log.timestamp)}
                </span>

                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="text-white/20 hover:text-white/60 text-xs transition-colors"
                >
                  {expanded === log.id ? "▲ hide" : "▼ show"}
                </button>
              </div>
            </div>

            {/* Expanded Detail */}
            {expanded === log.id && (
              <div className="px-5 pb-4 border-t border-white/5 pt-4 space-y-3">
                <div>
                  <p className="text-white/20 text-xs mb-1">Prompt</p>
                  <p className="text-white/60 text-sm bg-white/5 rounded-lg px-3 py-2">
                    {log.prompt}
                  </p>
                </div>
                {log.response && (
                  <div>
                    <p className="text-white/20 text-xs mb-1">Response</p>
                    <p className="text-white/60 text-sm bg-white/5 rounded-lg px-3 py-2 whitespace-pre-wrap">
                      {log.response}
                    </p>
                  </div>
                )}
                <div className="flex gap-4 text-xs text-white/30 font-mono">
                  <span>prompt: {log.tokens.prompt}tk</span>
                  <span>completion: {log.tokens.completion}tk</span>
                  <span>total: {log.tokens.total}tk</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <p className="text-white/30 text-xs mb-1">{label}</p>
      <p
        className={`text-lg font-bold font-mono ${
          highlight ? "text-purple-400" : "text-white/70"
        }`}
      >
        {value}
      </p>
    </div>
  )
}