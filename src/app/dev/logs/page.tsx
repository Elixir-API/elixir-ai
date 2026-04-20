"use client"

import { useEffect, useRef, useState } from "react"

type LogLevel = "info" | "warn" | "error" | "debug"

type LogEntry = {
  id: string
  level: LogLevel
  message: string
  timestamp: string
  source?: string
}

const COLORS: Record<LogLevel, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  debug: "text-white/30",
}

const BADGES: Record<LogLevel, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warn: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  debug: "bg-white/5 text-white/30 border-white/10",
}

// Simulated logs — replace with real API fetch later
const MOCK_LOGS: LogEntry[] = [
  { id: "1", level: "info", message: "Server started on port 3000", timestamp: new Date().toISOString(), source: "server" },
  { id: "2", level: "debug", message: "JWT_SECRET loaded from env", timestamp: new Date().toISOString(), source: "auth" },
  { id: "3", level: "info", message: "Roblox OAuth callback received", timestamp: new Date().toISOString(), source: "api/auth" },
  { id: "4", level: "warn", message: "Plugin heartbeat delayed by 2s", timestamp: new Date().toISOString(), source: "plugin" },
  { id: "5", level: "info", message: "Chat message processed", timestamp: new Date().toISOString(), source: "api/chat" },
  { id: "6", level: "error", message: "Failed to reach AI service endpoint", timestamp: new Date().toISOString(), source: "ai" },
  { id: "7", level: "debug", message: "Token verified for user 1682906375", timestamp: new Date().toISOString(), source: "auth" },
  { id: "8", level: "info", message: "Plugin status check OK", timestamp: new Date().toISOString(), source: "plugin" },
]

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS)
  const [filter, setFilter] = useState<LogLevel | "all">("all")
  const [paused, setPaused] = useState(false)
  const [search, setSearch] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, paused])

  // Simulate live log stream
  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      const levels: LogLevel[] = ["info", "debug", "warn", "error"]
      const sources = ["server", "auth", "plugin", "api/chat", "ai"]
      const messages = [
        "Heartbeat received from plugin",
        "Token refresh attempted",
        "Chat stream completed",
        "WebSocket ping sent",
        "Model response generated",
        "Rate limit check passed",
      ]
      const newLog: LogEntry = {
        id: Math.random().toString(36).slice(2),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: new Date().toISOString(),
        source: sources[Math.floor(Math.random() * sources.length)],
      }
      setLogs((prev) => [...prev.slice(-200), newLog])
    }, 3000)
    return () => clearInterval(interval)
  }, [paused])

  const filtered = logs.filter((log) => {
    const matchLevel = filter === "all" || log.level === filter
    const matchSearch =
      search === "" ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.source?.toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchSearch
  })

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Live Logs</h1>
        <p className="text-white/40 text-sm mt-1">Real-time system log stream</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Filter buttons */}
        {(["all", "info", "debug", "warn", "error"] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
              filter === level
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
            }`}
          >
            {level}
          </button>
        ))}

        {/* Search */}
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 w-48"
        />

        {/* Pause button */}
        <button
          onClick={() => setPaused((p) => !p)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            paused
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
          }`}
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>

        {/* Clear */}
        <button
          onClick={() => setLogs([])}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all"
        >
          Clear
        </button>
      </div>

      {/* Log Window */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-white/5 bg-black/60 p-4 font-mono text-xs space-y-1">
        {filtered.length === 0 && (
          <p className="text-white/20 text-center mt-8">No logs match your filter.</p>
        )}
        {filtered.map((log) => (
          <div key={log.id} className="flex items-start gap-3 hover:bg-white/[0.02] px-2 py-1 rounded">
            <span className="text-white/20 shrink-0 w-[180px]">
              {new Date(log.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </span>
            <span
              className={`shrink-0 uppercase text-[10px] font-bold border px-1.5 py-0.5 rounded ${BADGES[log.level]}`}
            >
              {log.level}
            </span>
            {log.source && (
              <span className="text-purple-400/60 shrink-0">[{log.source}]</span>
            )}
            <span className={COLORS[log.level]}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Footer count */}
      <div className="mt-2 text-white/20 text-xs text-right">
        {filtered.length} log{filtered.length !== 1 ? "s" : ""} shown
      </div>
    </div>
  )
}