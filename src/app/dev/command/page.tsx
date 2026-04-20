"use client"

import { useState, useRef, useEffect } from "react"
import { useElixirStore } from "@/store/elixirStore"

type CommandResult = {
  id: string
  command: string
  output: string
  status: "success" | "error" | "info"
  timestamp: string
}

const COMMANDS: Record<string, { output: string; status: "success" | "error" | "info" }> = {
  help: {
    output: `Available commands:
  help          — Show this help message
  status        — Show system status
  clear         — Clear the console
  ping          — Ping the server
  version       — Show app version
  credits       — Gift credits: credits <userId> <amount>
  kick          — Kick a user: kick <userId>
  users         — Show active user count
  broadcast     — Send a message: broadcast <message>
  giveaway      — Run giveaway: giveaway run <amount> <duration>ms
  chat-on       — Enable public live chat
  chat-off      — Disable public live chat`,
    status: "info",
  },
  status: {
    output: `System Status:
  Server        ✓ Online
  AI Provider   OpenRouter
  Plugin API    Waiting for connection
  Supabase      Not connected yet`,
    status: "success",
  },
  ping: { output: "Pong!", status: "success" },
  version: {
    output: `Elixir AI v1.0.0
  Next.js       15.x
  React         19.x`,
    status: "info",
  },
  users: {
    output: "Active sessions: coming soon — connect Supabase to track real users.",
    status: "info",
  },
}

export default function CommandPage() {
  const setGiveaway = useElixirStore((s) => s.setGiveaway)
  const setChatOpen = useElixirStore((s) => s.setChatOpen)
  const [input, setInput] = useState("")
  const [results, setResults] = useState<CommandResult[]>([
    {
      id: "welcome",
      command: "",
      output: 'Elixir Dev Console — type "help" to see available commands.',
      status: "info",
      timestamp: new Date().toISOString(),
    },
  ])
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [results])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function runCommand(raw: string) {
    const cmd = raw.trim().toLowerCase()
    if (!cmd) return

    if (cmd === "clear") {
      setResults([])
      setHistory((h) => [cmd, ...h])
      setHistoryIndex(-1)
      setInput("")
      return
    }

    let output = ""
    let status: "success" | "error" | "info" = "info"

    if (cmd.startsWith("credits ")) {
      const parts = cmd.split(" ")
      const userId = parts[1]
      const amount = parts[2]
      if (!userId || !amount || isNaN(Number(amount))) {
        output = "Usage: credits <userId> <amount>"
        status = "error"
      } else {
        output = `✓ Gifted ${amount} credits to user ${userId}. (Needs Supabase to persist)`
        status = "success"
      }
    } else if (cmd.startsWith("kick ")) {
      const userId = cmd.split(" ")[1]
      if (!userId) {
        output = "Usage: kick <userId>"
        status = "error"
      } else {
        output = `✓ Kicked user ${userId}. (Needs Supabase to persist)`
        status = "success"
      }
    } else if (cmd.startsWith("broadcast ")) {
      const msg = raw.trim().substring(10)
      output = `✓ Broadcast sent: "${msg}" (Needs Supabase to persist)`
      status = "success"
    } else if (cmd.startsWith("giveaway run ")) {
      const parts = raw.trim().split(" ")
      const amount = parts[2]
      const duration = parts[3]
      if (!amount || !duration || isNaN(Number(amount))) {
        output = "Usage: giveaway run <amount> <duration>ms"
        status = "error"
      } else {
        const ms = parseInt(duration.replace("ms", ""))
        const secs = Math.round(ms / 1000)
        setGiveaway({ active: true, amount, secs, endsAt: Date.now() + ms })
        setTimeout(() => setGiveaway(null), ms)
        output = `🎉 GIVEAWAY FOR ${amount} CREDITS IN ${secs} SECONDS ON THE DISCORD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Prize:      ${amount} credits
  Duration:   ${secs} seconds
  Status:     ✓ Running
  Discord:    https://discord.gg/YOUR_INVITE_HERE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        status = "success"
      }
    } else if (cmd === "chat-on") {
      setChatOpen(true)
      output = "✓ Public chat enabled — visible on chat page."
      status = "success"
    } else if (cmd === "chat-off") {
      setChatOpen(false)
      output = "✓ Public chat disabled."
      status = "success"
    } else {
      const match = COMMANDS[cmd]
      output = match ? match.output : `Command not found: "${cmd}". Type "help" for available commands.`
      status = match ? match.status : "error"
    }

    const result: CommandResult = {
      id: Math.random().toString(36).slice(2),
      command: raw.trim(),
      output,
      status,
      timestamp: new Date().toISOString(),
    }

    setResults((prev) => [...prev, result])
    setHistory((h) => [raw.trim(), ...h])
    setHistoryIndex(-1)
    setInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      runCommand(input)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const next = Math.min(historyIndex + 1, history.length - 1)
      setHistoryIndex(next)
      setInput(history[next] ?? "")
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.max(historyIndex - 1, -1)
      setHistoryIndex(next)
      setInput(next === -1 ? "" : history[next])
    }
  }

  const OUTPUT_COLORS = {
    success: "text-green-400",
    error: "text-red-400",
    info: "text-white/50",
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Command Bar</h1>
        <p className="text-white/40 text-sm mt-1">Internal dev console — run system commands</p>
      </div>
      <div
        className="flex-1 overflow-y-auto rounded-t-xl border border-white/5 bg-black/70 p-4 font-mono text-sm space-y-3 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {results.map((r) => (
          <div key={r.id}>
            {r.command && (
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-white/20">
                  {new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                </span>
                <span className="text-purple-400">❯</span>
                <span className="text-white">{r.command}</span>
              </div>
            )}
            <pre className={`whitespace-pre-wrap text-xs leading-relaxed ${OUTPUT_COLORS[r.status]}`}>
              {r.output}
            </pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-3 border border-t-0 border-white/5 bg-black/80 rounded-b-xl px-4 py-3">
        <span className="text-purple-400 font-mono text-sm shrink-0">❯</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Type a command — "help" to start'
          className="flex-1 bg-transparent text-white text-sm font-mono placeholder-white/20 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={() => runCommand(input)}
          className="text-xs text-white/20 hover:text-purple-400 transition-all font-mono"
        >
          ENTER ↵
        </button>
      </div>
      <p className="text-white/10 text-xs mt-2 text-right font-mono">↑↓ to navigate history</p>
    </div>
  )
}