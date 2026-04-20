"use client"

import { useState, useRef, useEffect } from "react"
import ModelSelector, { MODELS, type AIModel } from "@/components/ModelSelector"
import ShopModal from "@/components/ShopModal"

// ── Types ──────────────────────────────────────────────────────────────────────

type StepType = "create" | "modify" | "delete" | "test" | "fix"
type StepStatus = "pending" | "running" | "done" | "error"

type PlanStep = {
  id: string
  type: StepType
  description: string
  location?: string | null
  status: StepStatus
  code?: string
}

type AssistantMsg = {
  id: string
  role: "assistant"
  thinking: string
  steps: PlanStep[]
  summary: string
  phase: "thinking" | "executing" | "done" | "error"
  errorText?: string
}

type UserMsg = {
  id: string
  role: "user"
  content: string
}

type ChatMessage = AssistantMsg | UserMsg

type RobloxUser = {
  id: string
  name: string
  avatarUrl?: string
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

// Try reading cookie — may fail if HttpOnly
function getRobloxUserFromCookie(): RobloxUser | null {
  try {
    const cookieNames = ["roblox_user", "user", "session", "__session", "auth"]
    for (const name of cookieNames) {
      const raw = document.cookie
        .split("; ")
        .find((r) => r.startsWith(`${name}=`))
        ?.substring(`${name}=`.length)
      if (!raw) continue
      const obj = JSON.parse(decodeURIComponent(raw))
      const id = obj?.id ?? obj?.robloxId ?? obj?.userId ?? obj?.user?.id
      const uname =
        obj?.name ?? obj?.username ?? obj?.displayName ?? obj?.user?.name ?? "User"
      const avatarUrl = obj?.avatarUrl ?? obj?.avatar ?? obj?.thumbnailUrl ?? null
      if (id) return { id: String(id), name: String(uname), avatarUrl }
    }
    return null
  } catch {
    return null
  }
}

// Server fetch — bypasses HttpOnly restriction
async function fetchUserFromServer(): Promise<RobloxUser | null> {
  try {
    const res = await fetch("/api/user/me")
    if (!res.ok) return null
    const data = await res.json()
    if (!data.loggedIn || !data.user?.id) return null
    return {
      id: String(data.user.id),
      name: data.user.name ?? "User",
      avatarUrl: data.user.avatar ?? undefined,
    }
  } catch {
    return null
  }
}

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return (
            <strong key={i} className="text-white/85 font-semibold">
              {p.slice(2, -2)}
            </strong>
          )
        if (p.startsWith("`") && p.endsWith("`"))
          return (
            <code
              key={i}
              className="bg-white/10 text-purple-300 px-1 rounded text-[11px] font-mono"
            >
              {p.slice(1, -1)}
            </code>
          )
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const STEP_ICON: Record<StepType, string> = {
  create: "📄",
  modify: "✏️",
  delete: "🗑️",
  test: "👁",
  fix: "🔧",
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 h-4">
      <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:120ms]" />
      <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:240ms]" />
    </div>
  )
}

function PlanEmbed({ steps }: { steps: PlanStep[] }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] overflow-hidden w-full max-w-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
        <span className="text-white/20 text-[10px]">⚙</span>
        <span className="text-white/25 text-[10px] font-semibold uppercase tracking-widest">
          Plans
        </span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-500 ${
              step.status === "running" ? "bg-purple-500/5" : ""
            }`}
          >
            <div className="shrink-0 w-4 flex items-center justify-center">
              {step.status === "pending" && (
                <span className="text-white/20 text-xs">{STEP_ICON[step.type]}</span>
              )}
              {step.status === "running" && (
                <span className="w-3 h-3 rounded-full border border-purple-400/40 border-t-purple-400 animate-spin block" />
              )}
              {step.status === "done" && (
                <span className="text-green-400 text-xs font-bold">✓</span>
              )}
              {step.status === "error" && (
                <span className="text-red-400 text-xs">✗</span>
              )}
            </div>
            <span
              className={`text-xs leading-relaxed transition-all duration-500 ${
                step.status === "pending"
                  ? "text-white/30"
                  : step.status === "running"
                  ? "text-white/80"
                  : step.status === "done"
                  ? "line-through decoration-green-400/50 text-green-400/50"
                  : "text-red-400/70"
              }`}
            >
              {step.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryEmbed({ text }: { text: string }) {
  const lines = text.split("\n").filter(Boolean)
  return (
    <div className="space-y-2 max-w-md pt-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return null

        const bulletMatch = trimmed.match(/^[•\-*]\s*(🟢|🟡|🔴)\s*(.+)/)
        if (bulletMatch) {
          const [, emoji, rest] = bulletMatch
          const dotColor =
            emoji === "🟢"
              ? "bg-green-400"
              : emoji === "🟡"
              ? "bg-yellow-400"
              : "bg-red-400"
          const textColor =
            emoji === "🟢"
              ? "text-green-300/80"
              : emoji === "🟡"
              ? "text-yellow-300/80"
              : "text-red-300/80"
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0`} />
              <span className={`text-sm leading-relaxed ${textColor}`}>
                {renderMarkdown(rest)}
              </span>
            </div>
          )
        }

        if (/what changed/i.test(trimmed)) {
          return (
            <p key={i} className="text-white/70 text-sm font-semibold mt-2 mb-0.5">
              What changed:
            </p>
          )
        }

        return (
          <p key={i} className="text-white/65 text-sm leading-relaxed">
            {renderMarkdown(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

function AssistantBubble({
  msg,
  onRetry,
}: {
  msg: AssistantMsg
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col gap-4 max-w-sm">
      {msg.phase === "thinking" ? (
        <div className="flex items-center gap-2">
          <ThinkingDots />
          <span className="text-white/40 text-xs">Planning...</span>
        </div>
      ) : msg.thinking ? (
        <p className="text-white/65 text-sm leading-relaxed">{msg.thinking}</p>
      ) : null}

      {msg.steps.length > 0 && <PlanEmbed steps={msg.steps} />}

      {msg.phase === "error" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 max-w-sm">
          <p className="text-red-400 text-sm mb-1.5">⚠ {msg.errorText}</p>
          <button
            onClick={onRetry}
            className="text-red-400/50 hover:text-red-300 text-xs underline"
          >
            Retry
          </button>
        </div>
      )}

      {msg.phase === "done" && (
        <div className="pt-1">
          {msg.summary ? (
            <SummaryEmbed text={msg.summary} />
          ) : (
            <p className="text-white/40 text-sm">Task completed.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ChatArea() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<AIModel>(MODELS[0])
  const [pluginConnected, setPluginConnected] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [robloxUser, setRobloxUser] = useState<RobloxUser | null>(null)
  const [lastRequest, setLastRequest] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load user — server first (bypasses HttpOnly), cookie as fallback
  useEffect(() => {
    async function loadUser() {
      const serverUser = await fetchUserFromServer()
      if (serverUser) {
        setRobloxUser(serverUser)
        return
      }
      const cookieUser = getRobloxUserFromCookie()
      if (cookieUser) setRobloxUser(cookieUser)
    }
    loadUser()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Poll plugin status — also recovers robloxId if user fetch failed
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/plugin/status")
        if (!res.ok) return
        const d = await res.json()
        setPluginConnected(d.connected === true)

        // If plugin says connected and we have its robloxId, use it as fallback user
        if (d.connected && d.robloxId) {
          setRobloxUser((prev) => {
            if (prev?.id) return prev
            return { id: String(d.robloxId), name: "Studio User" }
          })
        }
      } catch {}
    }
    check()
    const id = setInterval(check, 4000)
    return () => clearInterval(id)
  }, [])

  // ── State helpers ────────────────────────────────────────────────────────────

  function patchAssistant(id: string, patch: Partial<AssistantMsg>) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id && m.role === "assistant"
          ? ({ ...m, ...patch } as AssistantMsg)
          : m
      )
    )
  }

  function patchStep(msgId: string, stepId: string, patch: Partial<PlanStep>) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || m.role !== "assistant") return m
        const am = m as AssistantMsg
        return {
          ...am,
          steps: am.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
        }
      })
    )
  }

  // ── Core workflow ────────────────────────────────────────────────────────────

  async function runWorkflow(content: string) {
    if (!content.trim() || loading) return

    if (!pluginConnected) {
      const id = `err-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id,
          role: "assistant",
          thinking: "",
          steps: [],
          summary: "",
          phase: "error",
          errorText:
            "Plugin not connected. Open Roblox Studio and click Connect on the Elixir panel.",
        } as AssistantMsg,
      ])
      return
    }

    // Snapshot user at time of send — won't go stale mid-workflow
    const user = robloxUser

    if (!user?.id) {
      const id = `err-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id,
          role: "assistant",
          thinking: "",
          steps: [],
          summary: "",
          phase: "error",
          errorText:
            "Not logged in. Please sign in with Roblox and refresh the page.",
        } as AssistantMsg,
      ])
      return
    }

    setLoading(true)
    setLastRequest(content)
    setInput("")

    const userMsg: UserMsg = { id: `u-${Date.now()}`, role: "user", content }
    setMessages((prev) => [...prev, userMsg])

    const aid = `a-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: aid,
        role: "assistant",
        thinking: "",
        steps: [],
        summary: "",
        phase: "thinking",
      } as AssistantMsg,
    ])

    try {
      // ── 1. Plan ────────────────────────────────────────────────────────────
      const planRes = await fetch("/api/chat/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          modelId: selectedModel.apiId,
          robloxId: user.id,
        }),
      })

      if (!planRes.ok) {
        const err = await planRes.json().catch(() => ({}))
        throw new Error(err?.error ?? `Plan failed (${planRes.status})`)
      }

      const planData = await planRes.json()
      const thinking: string =
        planData.thinking ?? planData.summary ?? "Here's my plan:"
      const steps: PlanStep[] = (planData.steps ?? []).map(
        (s: Omit<PlanStep, "status">) => ({
          ...s,
          status: "pending" as StepStatus,
        })
      )

      if (steps.length === 0) throw new Error("No steps returned — try again")

      patchAssistant(aid, { thinking, steps, phase: "executing" })
      await sleep(300)

      // ── 2. Execute each step ───────────────────────────────────────────────
      const completed: PlanStep[] = []

      for (const step of steps) {
        patchStep(aid, step.id, { status: "running" })

        // Test steps — no code to generate
        if (step.type === "test") {
          await sleep(1400)
          patchStep(aid, step.id, { status: "done" })
          completed.push({ ...step, status: "done" })
          await sleep(200)
          continue
        }

        // ── Real execute call ────────────────────────────────────────────────
        let execData: any = null

        try {
          const execRes = await fetch("/api/chat/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step,
              message: content,           // route reads "message"
              robloxId: user.id,          // required — pushCode needs this
              modelId: selectedModel.apiId,
              completedSteps: completed,
            }),
          })

          execData = await execRes.json()

          if (!execRes.ok || execData?.ok === false) {
            const errMsg =
              execData?.error ?? `Execute failed (${execRes.status})`
            console.error(`[Elixir] Step failed: "${step.description}" —`, errMsg)
            patchStep(aid, step.id, { status: "error" })
            completed.push({ ...step, status: "error" })
            await sleep(200)
            continue
          }
        } catch (networkErr) {
          console.error("[Elixir] Execute network error:", networkErr)
          patchStep(aid, step.id, { status: "error" })
          completed.push({ ...step, status: "error" })
          await sleep(200)
          continue
        }

        // execute route already called pushCode — don't inject again
        const code: string = execData.code ?? ""
        const location: string = execData.location ?? step.location ?? ""

        console.log(
          `[Elixir] ✓ "${step.description}" | ${execData.lines ?? "?"}L → ${location}`
        )

        await sleep(400)
        patchStep(aid, step.id, { status: "done", code })
        completed.push({ ...step, status: "done", code })
        await sleep(150)
      }

      // ── 3. Summary ─────────────────────────────────────────────────────────
      let summaryText = ""
      try {
        const sumRes = await fetch("/api/chat/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userRequest: content,
            completedSteps: completed,
          }),
        })
        if (sumRes.ok) {
          const sumData = await sumRes.json()
          summaryText = sumData.summary ?? ""
        }
      } catch {
        // Summary is optional — don't fail the workflow
      }

      // Fallback summary
      if (!summaryText.trim()) {
        const good = completed.filter(
          (s) => s.status === "done" && s.type !== "test"
        )
        const bad = completed.filter((s) => s.status === "error")
        summaryText = [
          bad.length > 0
            ? `${good.length} succeeded, ${bad.length} failed.`
            : "Task complete.",
          ...good.map(
            (s) => `• 🟢 \`${s.location ?? s.description}\` — ${s.description}`
          ),
          ...bad.map((s) => `• 🔴 \`${s.description}\` — failed`),
        ]
          .filter(Boolean)
          .join("\n")
      }

      patchAssistant(aid, { summary: summaryText, phase: "done" })
    } catch (e) {
      console.error("[Elixir] Workflow error:", e)
      patchAssistant(aid, {
        phase: "error",
        errorText:
          e instanceof Error ? e.message : "Something went wrong.",
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      runWorkflow(input)
    }
  }

  const suggestions = [
    "Make a part spin",
    "Add a leaderboard",
    "Create a door that opens",
    "Write a DataStore system",
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#080808] relative">
      {showShop && <ShopModal onClose={() => setShowShop(false)} />}

      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[700px] h-[500px] rounded-full bg-purple-600/8 blur-[130px]" />
        <div className="absolute bottom-0 right-[10%] w-[400px] h-[300px] rounded-full bg-violet-700/6 blur-[100px]" />
      </div>

      {/* Plugin warning */}
      {!pluginConnected && (
        <div className="relative z-10 mx-6 mt-4 px-4 py-2.5 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex items-center gap-3">
          <span className="text-yellow-400">⚡</span>
          <p className="text-yellow-400/70 text-xs flex-1">
            Plugin not connected — open Roblox Studio and click Connect.
          </p>
          <a
            href="/plugin"
            className="text-yellow-400/60 hover:text-yellow-300 text-xs border border-yellow-500/20 px-2 py-1 rounded-lg transition-all shrink-0"
          >
            Get Plugin
          </a>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 relative z-10">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[55vh] text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-3xl shadow-[0_0_40px_rgba(139,92,246,0.2)]">
              🧪
            </div>
            <div>
              <h2 className="text-white font-semibold text-xl tracking-tight">
                Start building your game
              </h2>
              <p className="text-white/30 text-sm mt-1.5 max-w-sm">
                Elixir will plan, build, test, and inject — automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => runWorkflow(s)}
                  className="text-xs text-white/35 hover:text-white/70 border border-white/[0.07] hover:border-white/20 px-4 py-2 rounded-full transition-all hover:bg-white/[0.03]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-sm shrink-0 mt-0.5">
                    🧪
                  </div>
                )}

                {msg.role === "user" ? (
                  <div className="bg-white/[0.05] border border-white/[0.08] text-white/80 px-4 py-3 rounded-2xl rounded-tr-sm text-sm max-w-sm leading-relaxed">
                    {(msg as UserMsg).content}
                  </div>
                ) : (
                  <AssistantBubble
                    msg={msg as AssistantMsg}
                    onRetry={() => runWorkflow(lastRequest)}
                  />
                )}

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs shrink-0 mt-0.5 overflow-hidden text-white/40 font-bold">
                    {robloxUser?.avatarUrl ? (
                      <img
                        src={robloxUser.avatarUrl}
                        alt="avatar"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      robloxUser?.name?.[0]?.toUpperCase() ?? "U"
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
      <div className="relative z-10 px-6 pb-6 max-w-2xl mx-auto w-full">
        <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-white/[0.12] focus-within:border-purple-500/40 focus-within:shadow-[0_0_30px_rgba(139,92,246,0.08)] transition-all duration-300">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              pluginConnected
                ? "Describe what you want to build..."
                : "Connect the plugin in Studio first..."
            }
            rows={1}
            className="w-full bg-transparent text-white/80 placeholder-white/20 text-sm resize-none focus:outline-none px-5 pt-4 pb-14 max-h-48 overflow-y-auto"
          />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setShowShop(true)}
              className="text-white/20 hover:text-purple-400/70 text-xs transition-colors border border-white/[0.06] hover:border-purple-500/20 px-2 py-1 rounded-lg"
            >
              ✦ Credits
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <ModelSelector
                value={selectedModel.id}
                onChange={setSelectedModel}
                userCredits={0}
              />
              <button
                onClick={() => runWorkflow(input)}
                disabled={loading || !input.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/25 hover:bg-purple-500/40 border border-purple-500/40 text-purple-200 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(139,92,246,0.25)]"
              >
                {loading ? (
                  <span className="w-3 h-3 rounded-full border border-purple-400/40 border-t-purple-400 animate-spin inline-block" />
                ) : (
                  "↑"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}