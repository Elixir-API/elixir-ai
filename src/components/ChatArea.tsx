"use client"

import { useState, useRef, useEffect } from "react"
import ModelSelector, { MODELS, type AIModel } from "@/components/ModelSelector"
import ShopModal from "@/components/ShopModal"
import { estimateCreditCost, formatCredits } from "@/lib/pricing"

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = {
  id: string
  type: "create" | "modify" | "delete" | "test"
  description: string
  location: string | null
  status?: "pending" | "running" | "done" | "error"
}

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  steps?: Step[]
  phase?: "planning" | "executing" | "finalizing" | "done"
}

type RobloxUser = {
  id: string
  name: string
  avatarUrl?: string
}

// ── Fetch user ────────────────────────────────────────────────────────────────

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

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="w-3.5 h-3.5 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin block shrink-0" />
  )
}

// ── Step item ─────────────────────────────────────────────────────────────────

function StepItem({ step }: { step: Step }) {
  const isDone    = step.status === "done"
  const isRunning = step.status === "running"
  const isError   = step.status === "error"

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-white/[0.04] last:border-0">
      {/* Left indicator */}
      <div className="w-4 h-4 flex items-center justify-center shrink-0">
        {isDone    && <span className="text-emerald-400 text-sm font-bold">✓</span>}
        {isRunning && <Spinner />}
        {isError   && <span className="text-red-400 text-sm">✗</span>}
        {!isDone && !isRunning && !isError && (
          <span className="w-1.5 h-1.5 rounded-full bg-white/[0.12] block" />
        )}
      </div>

      {/* Text */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className={`text-sm leading-snug transition-all duration-300 ${
          isDone
            ? "line-through text-white/25"
            : isRunning
            ? "text-white/80"
            : "text-white/35"
        }`}>
          {step.description}
        </span>
        {step.location && !isDone && (
          <span className="text-white/15 text-[10px] font-mono mt-0.5 truncate">
            {step.location}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Step card (embedded block) ────────────────────────────────────────────────

function StepCard({ steps }: { steps: Step[] }) {
  return (
    <div className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden mt-2">
      {steps.map(step => (
        <StepItem key={step.id} step={step} />
      ))}
    </div>
  )
}

// ── Message content ───────────────────────────────────────────────────────────

function MessageContent({ content, phase }: { content: string; phase?: Message["phase"] }) {
  if (phase === "planning" && !content) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce [animation-delay:100ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce [animation-delay:200ms]" />
      </div>
    )
  }

  if (phase === "finalizing") {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <Spinner />
        <span>{content}</span>
      </div>
    )
  }

  if (phase === "done" && content.startsWith("Injected")) {
    return (
      <p className="text-emerald-400/80 text-sm font-medium">{content}</p>
    )
  }

  return (
    <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap break-words">
      {content}
    </p>
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
  const abortRef    = useRef(false)

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

  // ── Helpers ───────────────────────────────────────────────────────────────
  function updateMsg(id: string, patch: Partial<Message>) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  function updateStep(msgId: string, stepId: string, status: Step["status"]) {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId
          ? { ...m, steps: m.steps?.map(s => s.id === stepId ? { ...s, status } : s) }
          : m
      )
    )
  }

  // ── Build conversation context for AI memory ──────────────────────────────
  function buildContext(): string {
    return messages
      .filter(m => m.content && m.phase === "done" || m.role === "user")
      .slice(-6) // last 6 messages for context
      .map(m => `${m.role === "user" ? "User" : "Elixir"}: ${m.content}`)
      .join("\n")
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  async function send() {
    const content = input.trim()
    if (!content || loading) return

    setInput("")
    setLoading(true)
    abortRef.current = false

    const uMsg: Message = { id: `u-${Date.now()}`, role: "user", content }
    const aId = `a-${Date.now()}`
    const aMsg: Message = {
      id: aId,
      role: "assistant",
      content: "",
      phase: "planning",
      steps: [],
    }

    setMessages(prev => [...prev, uMsg, aMsg])

    try {
      // ── 1. Plan ───────────────────────────────────────────────────────────
      const planRes = await fetch("/api/chat/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          modelId: selectedModel.apiId,
          robloxId: user?.id ?? null,
          conversationContext: buildContext(),
        }),
      })

      const plan = await planRes.json()
      const steps: Step[] = (plan.steps ?? []).map((s: Step) => ({
        ...s,
        status: "pending" as const,
      }))

      updateMsg(aId, {
        content: plan.thinking ?? "Here's what I'll build:",
        phase: "executing",
        steps,
      })

      // ── 2. Execute each step ──────────────────────────────────────────────
      const completedSteps: Step[] = []

      for (const step of steps) {
        if (abortRef.current) break

        updateStep(aId, step.id, "running")

        if (step.type === "test") {
          await new Promise(r => setTimeout(r, 800))
          updateStep(aId, step.id, "done")
          completedSteps.push(step)
          continue
        }

        const execRes = await fetch("/api/chat/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            step,
            modelId: selectedModel.apiId,
            robloxId: user?.id ?? null,
            conversationContext: plan.thinking ?? "",
          }),
        })

        const execData = await execRes.json()

        if (!execRes.ok || !execData.ok) {
          updateStep(aId, step.id, "error")
          updateMsg(aId, {
            content: execData.error ?? "Something went wrong.",
            phase: "done",
          })
          setLoading(false)
          return
        }

        updateStep(aId, step.id, "done")
        completedSteps.push(step)

        // Small pause so user can see the checkmark animate
        await new Promise(r => setTimeout(r, 300))
      }

      // ── 3. Finalizing ─────────────────────────────────────────────────────
      updateMsg(aId, { content: "Finalizing...", phase: "finalizing" })
      await new Promise(r => setTimeout(r, 900))

      updateMsg(aId, { content: "Injected! ✓", phase: "done" })
      await new Promise(r => setTimeout(r, 700))

      // ── 4. Summary ────────────────────────────────────────────────────────
      const sumRes = await fetch("/api/chat/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRequest: content,
          completedSteps,
          robloxId: user?.id ?? null,
        }),
      })

      const sumData = await sumRes.json()

      updateMsg(aId, {
        content: sumData.summary || "All done! Check Studio.",
        phase: "done",
      })

      // ── Refresh credits ───────────────────────────────────────────────────
      if (user?.id) {
        try {
          const cr = await fetch(`/api/credits?robloxId=${user.id}`)
          if (cr.ok) { const d = await cr.json(); setUserCredits(d.credits ?? 0) }
        } catch {}
      }

    } catch (e: any) {
      updateMsg(aId, {
        content: `⚠ ${e?.message ?? "Something went wrong."}`,
        phase: "done",
      })
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

                <div className={`flex flex-col gap-1 min-w-0 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start w-full"}`}>
                  {msg.role === "user" ? (
                    <div className="bg-white/[0.05] border border-white/[0.07] text-white/80 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <>
                      {/* Steps card first */}
                      {msg.steps && msg.steps.length > 0 && (
                        <StepCard steps={msg.steps} />
                      )}
                      {/* Then status/summary below */}
                      {msg.content && (
                        <div className="mt-2 w-full">
                          <MessageContent content={msg.content} phase={msg.phase} />
                        </div>
                      )}
                    </>
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
                  onClick={() => { abortRef.current = true; setLoading(false) }}
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