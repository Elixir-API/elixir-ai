"use client"

import { useState, useRef, useEffect } from "react"
import ModelSelector, { MODELS, type AIModel } from "@/components/ModelSelector"
import ShopModal from "@/components/ShopModal"
import { estimateCreditCost, formatCredits } from "@/lib/pricing"

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  streaming?: boolean
  creditsUsed?: number
}

type RobloxUser = {
  id: string
  name: string
  avatarUrl?: string
}

// ── Fetch user from server (reads HttpOnly cookie) ────────────────────────────

async function fetchUser(): Promise<RobloxUser | null> {
  try {
    const res = await fetch("/api/user/me")
    if (!res.ok) return null
    const d = await res.json()
    if (!d.loggedIn) return null
    return {
      id: String(d.user.id),
      name: d.user.name ?? "User",
      avatarUrl: d.user.avatarUrl ?? undefined,
    }
  } catch {
    return null
  }
}

// ── Code block with copy ──────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#09090f] overflow-hidden my-2.5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] bg-white/[0.02]">
        <span className="text-white/20 text-[10px] font-mono uppercase tracking-widest">
          {lang && lang !== "lua" && lang !== "luau" ? lang : "lua"}
        </span>
        <button
          onClick={handleCopy}
          className="text-white/25 hover:text-white/60 text-xs transition-colors flex items-center gap-1"
        >
          {copied ? "✓ Copied" : "⧉ Copy"}
        </button>
      </div>
      {/* Code */}
      <pre className="p-4 text-[13px] font-mono text-emerald-300/75 overflow-x-auto leading-relaxed whitespace-pre">
        <code>{code.trim()}</code>
      </pre>
    </div>
  )
}

// ── Render message text + code blocks ────────────────────────────────────────

function MessageContent({
  content,
  streaming,
}: {
  content: string
  streaming?: boolean
}) {
  // Strip injection headers + convert [CODE_LUA] tags before display
  const clean = content
    .replace(/\[CODE_LUA\]/g, "```lua")
    .replace(/\[\/CODE_LUA\]/g, "```")
    .replace(/^--\s*Folder:[^\n]*\n?/gm, "")
    .replace(/^--\s*Type:[^\n]*\n?/gm, "")
    .replace(/^--\s*Place:[^\n]*\n?/gm, "")
    .trim()

  const segments = clean.split(/(```(?:[a-z]*)?\n?[\s\S]*?```)/g)

  return (
    <div className="w-full min-w-0">
      {/* Show dots while waiting for first token */}
      {streaming && !content && (
        <div className="flex items-center gap-1 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce [animation-delay:100ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce [animation-delay:200ms]" />
        </div>
      )}

      {segments.map((seg, i) => {
        // Code block
        const codeMatch = seg.match(/^```([a-z]*)?\n?([\s\S]*?)```$/)
        if (codeMatch) {
          return (
            <CodeBlock
              key={i}
              code={codeMatch[2] ?? ""}
              lang={codeMatch[1] || "lua"}
            />
          )
        }
        // Empty
        if (!seg.trim()) return null
        // Plain text
        const isLast = i === segments.length - 1
        return (
          <p
            key={i}
            className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap break-words"
          >
            {seg}
            {/* Blinking cursor on last segment while streaming */}
            {streaming && isLast && (
              <span className="inline-block w-[2px] h-[14px] bg-purple-400/60 animate-pulse ml-[2px] align-middle rounded-sm" />
            )}
          </p>
        )
      })}
    </div>
  )
}

// ── Main ChatArea ─────────────────────────────────────────────────────────────

export default function ChatArea() {
  const [messages, setMessages]               = useState<Message[]>([])
  const [input, setInput]                     = useState("")
  const [loading, setLoading]                 = useState(false)
  const [selectedModel, setSelectedModel]     = useState<AIModel>(MODELS[0])
  const [pluginConnected, setPluginConnected] = useState(false)
  const [showShop, setShowShop]               = useState(false)
  const [user, setUser]                       = useState<RobloxUser | null>(null)
  const [userCredits, setUserCredits]         = useState(0)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef    = useRef<AbortController | null>(null)

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUser().then(u => { if (u) setUser(u) })
  }, [])

  // ── Credits polling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const res = await fetch(`/api/credits?robloxId=${user.id}`)
        if (res.ok) { const d = await res.json(); setUserCredits(d.credits ?? 0) }
      } catch {}
    }
    load()
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [user?.id])

  // ── Plugin status polling ─────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const url = user?.id
          ? `/api/plugin/status?robloxId=${user.id}`
          : "/api/plugin/status"
        const res = await fetch(url)
        if (res.ok) { const d = await res.json(); setPluginConnected(d.connected === true) }
      } catch {}
    }
    check()
    const id = setInterval(check, 4_000)
    return () => clearInterval(id)
  }, [user?.id])

  // ── Auto scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Auto resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 160) + "px"
  }, [input])

  // ── Push code to plugin inject queue ─────────────────────────────────────
  async function pushToPlugin(code: string) {
    if (!pluginConnected || !user?.id || !code.trim()) return
    try {
      await fetch("/api/plugin/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robloxId: user.id, code }),
      })
    } catch {}
  }

  // ── Extract lua blocks from response ─────────────────────────────────────
  function extractLuaBlocks(content: string): string[] {
    const blocks: string[] = []
    const re = /```(?:lua|luau)?\n?([\s\S]*?)```/g
    let m
    while ((m = re.exec(content)) !== null) {
      if (m[1]?.trim()) blocks.push(m[1].trim())
    }
    return blocks
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  async function send() {
    const content = input.trim()
    if (!content || loading) return

    setInput("")
    setLoading(true)

    const uMsg: Message = { id: `u-${Date.now()}`, role: "user", content }
    const aId = `a-${Date.now()}`
    const aMsg: Message = { id: aId, role: "assistant", content: "", streaming: true }

    setMessages(prev => [...prev, uMsg, aMsg])

    const estimate = estimateCreditCost(selectedModel.apiId, content)

    try {
      abortRef.current = new AbortController()

      const history = messages
        .filter(m => !m.streaming && m.content)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content }],
          modelId: selectedModel.apiId,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? `Error ${res.status}`)
      }

      // ── Parse SSE stream ─────────────────────────────────────────────────
      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf  = ""
      let full = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const raw = line.slice(6).trim()
          if (raw === "[DONE]") continue
          try {
            const chunk = JSON.parse(raw)?.choices?.[0]?.delta?.content ?? ""
            if (chunk) {
              full += chunk
              setMessages(prev =>
                prev.map(m => m.id === aId ? { ...m, content: full } : m)
              )
            }
          } catch {}
        }
      }

      // ── Mark complete ────────────────────────────────────────────────────
      setMessages(prev =>
        prev.map(m =>
          m.id === aId
            ? { ...m, streaming: false, creditsUsed: estimate.isFree ? 0 : estimate.credits }
            : m
        )
      )

      // ── Auto-inject lua blocks ────────────────────────────────────────────
      const blocks = extractLuaBlocks(full)
      for (const block of blocks) {
        await pushToPlugin(block)
      }

      // ── Refresh credits ───────────────────────────────────────────────────
      if (!estimate.isFree && user?.id) {
        try {
          const cr = await fetch(`/api/credits?robloxId=${user.id}`)
          if (cr.ok) { const d = await cr.json(); setUserCredits(d.credits ?? 0) }
        } catch {}
      }

    } catch (e: any) {
      if (e?.name === "AbortError") {
        setMessages(prev =>
          prev.map(m => m.id === aId ? { ...m, streaming: false } : m)
        )
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === aId
              ? { ...m, content: `⚠ ${e?.message ?? "Something went wrong."}`, streaming: false }
              : m
          )
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const SUGGESTIONS = [
    "Make a spinning part",
    "Build a leaderboard",
    "Add a kill brick",
    "Create a DataStore system",
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#080808] relative">
      {showShop && <ShopModal onClose={() => setShowShop(false)} />}

      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-5%] left-[15%] w-[600px] h-[500px] rounded-full bg-purple-600/[0.055] blur-[130px]" />
        <div className="absolute bottom-0 right-[5%] w-[380px] h-[280px] rounded-full bg-violet-700/[0.04] blur-[100px]" />
      </div>

      {/* Plugin warning */}
      {!pluginConnected && (
        <div className="relative z-10 mx-4 mt-4 px-4 py-2.5 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex items-center gap-3 shrink-0">
          <span className="text-yellow-400">⚡</span>
          <p className="text-yellow-400/70 text-xs flex-1">
            Plugin not connected — open Studio and click{" "}
            <strong className="text-yellow-400/90">Connect</strong>.
          </p>
          <a
            href="/plugin"
            className="text-yellow-400/60 hover:text-yellow-300 text-xs border border-yellow-500/20 hover:border-yellow-500/40 px-2.5 py-1 rounded-lg transition-all whitespace-nowrap"
          >
            Get Plugin
          </a>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative z-10 px-4 py-6">
        {messages.length === 0 ? (

          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-3xl shadow-[0_0_50px_rgba(139,92,246,0.12)]">
              🧪
            </div>
            <div className="space-y-1">
              <h2 className="text-white font-semibold text-xl tracking-tight">Start building</h2>
              <p className="text-white/30 text-sm max-w-xs leading-relaxed">
                Ask Elixir to script, build, or create anything in Roblox Studio.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs text-white/30 hover:text-white/60 border border-white/[0.06] hover:border-white/15 px-3 py-2 rounded-full transition-all hover:bg-white/[0.02]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

        ) : (

          /* ── Messages ── */
          <div className="max-w-2xl mx-auto space-y-5 pb-2">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Elixir avatar */}
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-[15px] shrink-0 mt-0.5">
                    🧪
                  </div>
                )}

                <div className={`flex flex-col gap-1 min-w-0 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  {msg.role === "user" ? (
                    <div className="bg-white/[0.05] border border-white/[0.07] text-white/80 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <MessageContent content={msg.content} streaming={msg.streaming} />
                  )}

                  {/* Credits used */}
                  {msg.role === "assistant" && !msg.streaming && msg.creditsUsed !== undefined && (
                    <span className="text-white/[0.17] text-[10px] mt-0.5">
                      {msg.creditsUsed === 0
                        ? "Free · no credits used"
                        : `${formatCredits(msg.creditsUsed)} credits used`}
                    </span>
                  )}
                </div>

                {/* User pfp */}
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 mt-0.5 border border-white/[0.08] bg-white/[0.04] flex items-center justify-center">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="pfp" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white/40 text-[11px] font-semibold">
                        {user?.name?.[0]?.toUpperCase() ?? "U"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 pb-5 pt-1 max-w-2xl mx-auto w-full shrink-0">
        {/* Estimate preview */}
        {input.trim() && !selectedModel.free && (
          <p className="text-[10px] text-white/[0.18] mb-1.5 px-1">
            ~{formatCredits(estimateCreditCost(selectedModel.apiId, input).credits)} credits estimated
          </p>
        )}

        <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] hover:border-white/[0.12] focus-within:border-purple-500/35 focus-within:shadow-[0_0_25px_rgba(139,92,246,0.07)] transition-all duration-300">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={
              pluginConnected
                ? "Describe what you want to build..."
                : "Connect the plugin in Studio first..."
            }
            rows={1}
            className="w-full bg-transparent text-white/80 placeholder-white/[0.18] text-sm resize-none focus:outline-none px-5 pt-4 pb-14 max-h-40 overflow-y-auto leading-relaxed"
          />

          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
            {/* Credits button */}
            <button
              onClick={() => setShowShop(true)}
              className="shrink-0 flex items-center gap-1.5 text-xs text-white/[0.18] hover:text-purple-400/60 border border-white/[0.06] hover:border-purple-500/20 px-2.5 py-1 rounded-lg transition-all"
            >
              <span className="text-purple-400/50">✦</span>
              <span>{userCredits} cr</span>
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <ModelSelector
                value={selectedModel.id}
                onChange={setSelectedModel}
                userCredits={userCredits}
              />

              {loading ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400/75 text-xs font-medium transition-all"
                >
                  <span className="w-2 h-2 bg-red-400/60 rounded-sm shrink-0" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/35 text-purple-200/90 text-xs font-medium disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                >
                  ↑
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-white/[0.10] text-[10px] mt-2">
          Elixir may make mistakes — always review code before running.
        </p>
      </div>
    </div>
  )
}