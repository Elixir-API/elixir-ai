"use client"

import { useState } from "react"

type ErrorEntry = {
  id: string
  message: string
  stack?: string
  source: string
  timestamp: string
  resolved: boolean
}

const MOCK_ERRORS: ErrorEntry[] = [
  {
    id: "1",
    message: "Failed to reach AI service endpoint",
    stack: "Error: fetch failed\n  at fetchAI (lib/ai.ts:42)\n  at POST (api/chat/route.ts:18)",
    source: "api/chat",
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    resolved: false,
  },
  {
    id: "2",
    message: "JWT verification failed: invalid signature",
    stack: "JsonWebTokenError: invalid signature\n  at verify (jsonwebtoken/index.js:84)\n  at DevLayout (app/dev/layout.tsx:22)",
    source: "auth",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    resolved: false,
  },
  {
    id: "3",
    message: "Plugin heartbeat timeout after 10s",
    stack: "Error: Timeout\n  at checkHeartbeat (api/plugin/heartbeat/route.ts:31)",
    source: "plugin",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    resolved: true,
  },
  {
    id: "4",
    message: "Database connection pool exhausted",
    stack: "Error: Pool limit reached\n  at getConnection (lib/db.ts:17)",
    source: "database",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    resolved: true,
  },
]

export default function ErrorsPage() {
  const [errors, setErrors] = useState<ErrorEntry[]>(MOCK_ERRORS)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("all")

  const filtered = errors.filter((e) => {
    if (filter === "unresolved") return !e.resolved
    if (filter === "resolved") return e.resolved
    return true
  })

  const unresolvedCount = errors.filter((e) => !e.resolved).length

  function toggleResolved(id: string) {
    setErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, resolved: !e.resolved } : e))
    )
  }

  function dismissError(id: string) {
    setErrors((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Error Console
          </h1>
          {unresolvedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              {unresolvedCount} unresolved
            </span>
          )}
        </div>
        <p className="text-white/40 text-sm mt-1">
          Caught runtime and API errors
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(["all", "unresolved", "resolved"] as const).map((f) => (
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
        <button
          onClick={() => setErrors([])}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all"
        >
          Clear All
        </button>
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-white/20 text-sm">
            No errors to show 🎉
          </div>
        )}
        {filtered.map((error) => (
          <div
            key={error.id}
            className={`rounded-xl border transition-all ${
              error.resolved
                ? "border-white/5 bg-white/[0.01] opacity-50"
                : "border-red-500/20 bg-red-500/[0.03]"
            }`}
          >
            {/* Top Row */}
            <div className="flex items-start gap-3 px-4 py-3">
              {/* Status dot */}
              <div
                className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                  error.resolved ? "bg-white/20" : "bg-red-500"
                }`}
              />

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    error.resolved ? "text-white/30" : "text-red-300"
                  }`}
                >
                  {error.message}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-white/20 text-xs font-mono">
                    [{error.source}]
                  </span>
                  <span className="text-white/20 text-xs">
                    {new Date(error.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {error.stack && (
                  <button
                    onClick={() =>
                      setExpanded(expanded === error.id ? null : error.id)
                    }
                    className="text-xs text-white/30 hover:text-white/60 transition-all"
                  >
                    {expanded === error.id ? "Hide" : "Stack"}
                  </button>
                )}
                <button
                  onClick={() => toggleResolved(error.id)}
                  className={`px-2 py-1 rounded text-xs border transition-all ${
                    error.resolved
                      ? "border-white/10 text-white/30 hover:border-red-500/30 hover:text-red-400"
                      : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                  }`}
                >
                  {error.resolved ? "Unresolve" : "Resolve"}
                </button>
                <button
                  onClick={() => dismissError(error.id)}
                  className="text-white/20 hover:text-red-400 transition-all text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Stack Trace */}
            {expanded === error.id && error.stack && (
              <div className="px-4 pb-3">
                <pre className="text-xs text-white/30 font-mono bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap border border-white/5">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}