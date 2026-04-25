"use client"

import { useState, useRef, useEffect } from "react"
import ModelSelector, { MODELS, type AIModel } from "@/components/ModelSelector"
import ShopModal from "@/components/ShopModal"
import { estimateCreditCost, formatCredits } from "@/lib/pricing"

// ── Constants ─────────────────────────────────────────────────────────────────

const OWNER_PHRASE = "ELX-9xK2mP7vQn"

const VISION_MODELS = new Set([
  "google/gemini-2.0-flash-001",
  "google/gemini-2.0-flash-lite-001",
  "google/gemini-1.5-pro",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.5-sonnet:beta",
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-3-opus",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4-turbo",
])

const UI_STYLES = [
  { id: "minimal",  label: "Minimal"  },
  { id: "modern",   label: "Modern"   },
  { id: "sleek",    label: "Sleek"    },
  { id: "cartoony", label: "Cartoony" },
  { id: "neon",     label: "Neon"     },
] as const
type UIStyle = typeof UI_STYLES[number]["id"]

const SUGGESTIONS = [
  "Make a spinning part",
  "Build a leaderboard",
  "Add a kill brick",
  "Create a DataStore system",
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = {
  id: string
  type: "create" | "modify" | "delete" | "test"
  description: string
  location: string | null
  status?: "pending" | "running" | "done" | "error"
}

type Phase = "planning" | "executing" | "finalizing" | "injected" | "done"

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  thinking?: string
  steps?: Step[]
  phase?: Phase
  imageDataUrl?: string
  scanning?: boolean
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
      id:        String(d.user.id),
      name:      d.user.name      ?? "User",
      avatarUrl: d.user.avatarUrl ?? undefined,
    }
  } catch { return null }
}

// ── Location sanitizer ────────────────────────────────────────────────────────

function sanitizeLocation(location: string | null): string | null {
  if (!location) return null
  const parts = location.split("/")
  if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts[parts.length - 1] = parts[parts.length - 1] + "Handler"
  }
  return parts.join("/")
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="w-3 h-3 border-[1.5px] border-purple-400/20 border-t-purple-400 rounded-full animate-spin block shrink-0" />
  )
}

// ── Typewriter ────────────────────────────────────────────────────────────────

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone]           = useState(false)

  useEffect(() => {
    setDisplayed("")
    setDone(false)
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); setDone(true) }
    }, 12)
    return () => clearInterval(id)
  }, [text])

  return (
    <span>
      {displayed}
      {!done && (
        <span className="inline-block w-[2px] h-[13px] ml-[1px] bg-purple-400/60 align-middle animate-pulse" />
      )}
    </span>
  )
}

// ── Thought bubble ────────────────────────────────────────────────────────────

function ThoughtBubble({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/18 hover:border-purple-500/35 transition-all group"
      >
        <span className="text-[11px]">💭</span>
        <span className="text-purple-300/55 text-[11px] group-hover:text-purple-300/80 transition-colors">
          {open ? "Hide thinking" : "See thinking"}
        </span>
        <span className={`text-purple-400/40 text-[9px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▲
        </span>
      </button>

      {open && (
        <div className="mt-1.5 px-4 py-3 rounded-xl bg-white/[0.015] border border-purple-500/10 text-purple-200/35 text-[11px] leading-relaxed italic font-mono tracking-wide">
          <TypewriterText text={thinking} />
        </div>
      )}
    </div>
  )
}

// ── Summary line (color coded) ────────────────────────────────────────────────

function SummaryLine({ line }: { line: string }) {
  const l = line.toLowerCase()

  // Dim section headers
  if (l.endsWith(":") && l.length < 60) {
    return (
      <p className="text-white/20 text-[10px] uppercase tracking-wider font-medium mt-1 mb-0.5">
        {line}
      </p>
    )
  }

  // Created / built / added / generated → emerald
  if (/\b(creat|built|added|generated|set up|insert|spawn|wrote)\w*\b/.test(l)) {
    return (
      <div className="flex items-start gap-2">
        <span className="text-emerald-400 text-xs mt-[3px] shrink-0">✦</span>
        <p className="text-emerald-300/85 text-sm leading-relaxed">{line}</p>
      </div>
    )
  }

  // Modified / updated / changed / fixed → sky blue
  if (/\b(modif|updat|chang|fix|patch|adjust|tweak|edit)\w*\b/.test(l)) {
    return (
      <div className="flex items-start gap-2">
        <span className="text-sky-400 text-xs mt-[3px] shrink-0">✦</span>
        <p className="text-sky-300/85 text-sm leading-relaxed">{line}</p>
      </div>
    )
  }

  // Deleted / removed → rose
  if (/\b(delet|remov|destroy|clear|wip)\w*\b/.test(l)) {
    return (
      <div className="flex items-start gap-2">
        <span className="text-rose-400 text-xs mt-[3px] shrink-0">✦</span>
        <p className="text-rose-300/80 text-sm leading-relaxed">{line}</p>
      </div>
    )
  }

  // Script / GUI mentions → purple
  if (/\b(script|localscript|modulescript|gui|screengui|remote)\w*\b/.test(l)) {
    return (
      <div className="flex items-start gap-2">
        <span className="text-purple-400 text-xs mt-[3px] shrink-0">✦</span>
        <p className="text-purple-300/85 text-sm leading-relaxed">{line}</p>
      </div>
    )
  }

  // Default
  return (
    <div className="flex items-start gap-2">
      <span className="text-white/20 text-xs mt-[3px] shrink-0">·</span>
      <p className="text-white/55 text-sm leading-relaxed">{line}</p>
    </div>
  )
}

// ── Step item ─────────────────────────────────────────────────────────────────

function StepItem({ step }: { step: Step }) {
  const isDone    = step.status === "done"
  const isRunning = step.status === "running"
  const isError   = step.status === "error"

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="w-4 h-4 flex items-center justify-center shrink-0">
        {isDone    && <span className="text-emerald-400 text-sm font-bold leading-none">✓</span>}
        {isRunning && <Spinner />}
        {isError   && <span className="text-red-400 text-sm leading-none">✗</span>}
        {!isDone && !isRunning && !isError && (
          <span className="w-1.5 h-1.5 rounded-full bg-white/[0.12] block" />
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className={`text-sm leading-snug transition-all duration-500 ${
          isDone    ? "line-through text-white/20" :
          isRunning ? "text-white/85" :
                      "text-white/30"
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

// ── Steps card ────────────────────────────────────────────────────────────────

function StepCard({ steps }: { steps: Step[] }) {
  return (
    <div className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
      {steps.map(s => <StepItem key={s.id} step={s} />)}
    </div>
  )
}

// ── Assistant message ─────────────────────────────────────────────────────────

function AssistantMessage({ msg }: { msg: Message }) {
  const { phase, content, steps, thinking } = msg
  const isBuild = steps && steps.length > 0

  return (
    <div className="w-full flex flex-col gap-2">

      {/* Thought bubble — appears once we have a plan */}
      {thinking && phase !== "planning" && (
        <ThoughtBubble thinking={thinking} />
      )}

      {/* Planning dots */}
      {phase === "planning" && (
        <div className="flex items-center gap-1.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce [animation-delay:100ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce [animation-delay:200ms]" />
        </div>
      )}

      {/* Steps card */}
      {isBuild && phase !== "planning" && (
        <StepCard steps={steps} />
      )}

      {/* Finalizing */}
      {phase === "finalizing" && (
        <div className="flex items-center gap-2 text-white/30 text-xs">
          <Spinner />
          <span>Finalizing...</span>
        </div>
      )}

      {/* Injected */}
      {phase === "injected" && (
        <p className="text-emerald-400/70 text-xs font-medium">Injected into Studio ✓</p>
      )}

      {/* Done */}
      {phase === "done" && content && (
        <div className="flex flex-col gap-1.5">
          {content
            .split("\n")
            .filter(Boolean)
            .map((line, i) => {
              const clean = line
                .replace(/^\*+\s*/g, "")
                .replace(/[🟢🟡🔵⚫🟠]/g, "")
                .trim()
              if (!clean) return null

              // Build → color coded summary
              if (isBuild) return <SummaryLine key={i} line={clean} />

              // Conversational → plain readable
              return (
                <p key={i} className="text-white/70 text-sm leading-relaxed">
                  {clean}
                </p>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ── System bubble ─────────────────────────────────────────────────────────────

function SystemBubble({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-center my-1">
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
        {msg.scanning && <Spinner />}
        <span className="text-white/30 text-xs">{msg.content}</span>
        {msg.scanning && (
          <span className="text-white/15 text-xs">· reading context...</span>
        )}
      </div>
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
  const [uiStyle, setUIStyle]                 = useState<UIStyle>("modern")
  const [attachedImage, setAttachedImage]     = useState<string | null>(null)
  const [ownerMode, setOwnerMode]             = useState(false)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef    = useRef(false)

  // ── Load user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUser().then(u => { if (u) setUser(u) })
    setOwnerMode(localStorage.getItem("elx_owner") === "true")
  }, [])

  // ── Credits polling ────────────────────────────────────────────────────────
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

  // ── Plugin polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const url = user?.id ? `/api/plugin/status?robloxId=${user.id}` : "/api/plugin/status"
        const res = await fetch(url)
        if (res.ok) { const d = await res.json(); setPluginConnected(d.connected === true) }
      } catch {}
    }
    check()
    const id = setInterval(check, 4_000)
    return () => clearInterval(id)
  }, [user?.id])

  // ── Auto scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Textarea resize ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 160) + "px"
  }, [input])

  // ── Image paste ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const onPaste = (e: ClipboardEvent) => {
      const img = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"))
      if (!img) return
      e.preventDefault()
      const file = img.getAsFile()
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        if (typeof ev.target?.result === "string") setAttachedImage(ev.target.result)
      }
      reader.readAsDataURL(file)
    }
    el.addEventListener("paste", onPaste)
    return () => el.removeEventListener("paste", onPaste)
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  function buildContext(msgs: Message[]): string {
    return msgs
      .filter(m =>
        (m.role === "user" && !!m.content) ||
        (m.role === "assistant" && m.phase === "done" && !!m.content)
      )
      .slice(-12)
      .map(m => {
        const text = m.content
          .replace(/^\*+\s*/gm, "")
          .replace(/[🟢🟡⚫🔵🟠]/g, "")
          .replace(/`/g, "")
          .slice(0, 400)
          .trim()
        return `${m.role === "user" ? "User" : "Elixir"}: ${text}`
      })
      .join("\n")
  }

  // ── Model switch ───────────────────────────────────────────────────────────
  function handleModelChange(newModel: AIModel) {
    if (newModel.id === selectedModel.id) return
    setSelectedModel(newModel)
    if (messages.length === 0) return

    const switchId = `sys-${Date.now()}`
    setMessages(prev => [...prev, {
      id: switchId, role: "system",
      content: `Switched to ${newModel.name}`,
      scanning: true,
    }])
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === switchId ? { ...m, scanning: false } : m))
    }, 1500)
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function send() {
    const content = input.trim()
    if (!content || loading) return

    // Owner passphrase
    if (content.includes(OWNER_PHRASE)) {
      setOwnerMode(true)
      localStorage.setItem("elx_owner", "true")
      setMessages(prev => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content },
        {
          id: `a-${Date.now()}`, role: "assistant",
          content: "✅ Owner control activated. Full access granted.",
          phase: "done",
        },
      ])
      setInput("")
      return
    }

    const imageToSend = attachedImage
    const contextSnap = buildContext(messages)

    // Vision gate
    if (imageToSend && !VISION_MODELS.has(selectedModel.apiId)) {
      setMessages(prev => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content, imageDataUrl: imageToSend },
        {
          id: `a-${Date.now()}`, role: "assistant", phase: "done",
          content: "Sorry, image input isn't supported with this model. Switch to Gemini Flash, GPT-4o, or Claude to use image references!",
        },
      ])
      setAttachedImage(null)
      setInput("")
      return
    }

    setInput("")
    setAttachedImage(null)
    setLoading(true)
    abortRef.current = false

    const uMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      imageDataUrl: imageToSend ?? undefined,
    }
    const aId  = `a-${Date.now() + 1}`
    const aMsg: Message = {
      id: aId, role: "assistant",
      content: "", phase: "planning", steps: [],
    }

    setMessages(prev => [...prev, uMsg, aMsg])

    try {
      // ── 1. Plan ────────────────────────────────────────────────────────────
      const planRes = await fetch("/api/chat/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          modelId: selectedModel.apiId,
          robloxId: user?.id ?? null,
          conversationContext: contextSnap,
          hasImage: !!imageToSend,
          ownerMode,
        }),
      })

      const plan = await planRes.json()

      // ── Conversational ─────────────────────────────────────────────────────
      if (plan.conversational === true) {
        updateMsg(aId, {
          content: plan.reply ?? "What can I help you with?",
          phase: "done",
          steps: [],
        })
        setLoading(false)
        return
      }

      // ── Build ──────────────────────────────────────────────────────────────
      const steps: Step[] = (plan.steps ?? []).map((s: Step) => ({
        ...s,
        location: sanitizeLocation(s.location),
        status: "pending" as const,
      }))

      updateMsg(aId, {
        thinking: plan.thinking ?? undefined,
        content: "",
        phase: "executing",
        steps,
      })

      // ── 2. Execute steps ───────────────────────────────────────────────────
      const completedSteps: Step[] = []

      for (const step of steps) {
        if (abortRef.current) break
        updateStep(aId, step.id, "running")

        if (step.type === "test") {
          await new Promise(r => setTimeout(r, 700))
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
            uiStyle,
            imageDataUrl: imageToSend ?? null,
            ownerMode,
          }),
        })

        const execData = await execRes.json()

        if (!execRes.ok || !execData.ok) {
          updateStep(aId, step.id, "error")
          updateMsg(aId, { content: execData.error ?? "Something went wrong.", phase: "done" })
          setLoading(false)
          return
        }

        updateStep(aId, step.id, "done")
        completedSteps.push(step)
        await new Promise(r => setTimeout(r, 350))
      }

      // ── 3. Finalizing ──────────────────────────────────────────────────────
      updateMsg(aId, { phase: "finalizing" })
      await new Promise(r => setTimeout(r, 900))

      // ── 4. Injected ────────────────────────────────────────────────────────
      updateMsg(aId, { phase: "injected" })
      await new Promise(r => setTimeout(r, 800))

      // ── 5. Summary ─────────────────────────────────────────────────────────
      const sumRes  = await fetch("/api/chat/summary", {
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
        content: sumData.summary || "Done! Check Studio.",
        phase: "done",
      })

      // Refresh credits
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#080808] relative">
      {showShop && <ShopModal onClose={() => setShowShop(false)} />}

      {/* Glows */}
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

          /* Empty state */
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

          /* Message list */
          <div className="max-w-2xl mx-auto space-y-4 pb-2">
            {messages.map(msg => {
              if (msg.role === "system") return <SystemBubble key={msg.id} msg={msg} />

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-[15px] shrink-0 mt-0.5">
                      🧪
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 min-w-0 ${
                    msg.role === "user"
                      ? "items-end max-w-[80%]"
                      : "items-start w-full max-w-[92%]"
                  }`}>
                    {msg.role === "user" ? (
                      <div className="flex flex-col gap-2 items-end">
                        {msg.imageDataUrl && (
                          <img
                            src={msg.imageDataUrl}
                            alt="reference"
                            className="max-w-[200px] max-h-[140px] rounded-xl border border-white/10 object-cover"
                          />
                        )}
                        <div className="bg-white/[0.05] border border-white/[0.07] text-white/80 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <AssistantMessage msg={msg} />
                    )}
                  </div>

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
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="relative z-10 px-4 pb-5 pt-1 max-w-2xl mx-auto w-full shrink-0">

        {/* UI Style selector */}
        <div className="flex items-center gap-1.5 mb-2 px-0.5">
          <span className="text-white/15 text-[9px] uppercase tracking-widest mr-0.5">Style</span>
          {UI_STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setUIStyle(s.id)}
              className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all ${
                uiStyle === s.id
                  ? "border-purple-500/40 bg-purple-500/15 text-purple-300/80"
                  : "border-white/[0.06] text-white/25 hover:text-white/50 hover:border-white/15"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Attached image preview */}
        {attachedImage && (
          <div className="relative inline-block mb-2">
            <img src={attachedImage} alt="attached" className="h-14 rounded-xl border border-white/10 object-cover" />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#111] border border-white/10 hover:bg-red-500/60 text-white/50 text-[9px] flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>
        )}

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
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder={
              pluginConnected
                ? "Describe what to build... (paste images too)"
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
                onChange={handleModelChange}
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