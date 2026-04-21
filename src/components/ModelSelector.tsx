"use client"

import { useState, useRef, useEffect } from "react"

export type AIModel = {
  id: string
  name: string
  provider: string
  apiId: string
  tier: "free" | "low" | "mid" | "high"
  speed: "FAST" | "SLOW" | "SMART"
  badge?: string
  creditCostPerMsg: string
  simpleTasks: number
  complexTasks: number
  free?: boolean
  minCredits?: number
}

export const MODELS: AIModel[] = [
  // ── FREE ──────────────────────────────────────────────────────────────────
  {
    id: "qwen-coder",
    name: "Qwen 2.5 Coder 32B",
    provider: "qwen",
    apiId: "qwen/qwen-2.5-coder-32b-instruct:free",
    tier: "free",
    speed: "SLOW",
    badge: "FREE",
    creditCostPerMsg: "Free",
    simpleTasks: 4,
    complexTasks: 3,
    free: true,
  },
  // ── LOW ───────────────────────────────────────────────────────────────────
  {
    id: "gemini-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    apiId: "google/gemini-2.0-flash-001",
    tier: "low",
    speed: "FAST",
    creditCostPerMsg: "~0.3 cr",
    simpleTasks: 5,
    complexTasks: 3,
  },
  {
    id: "llama-70b",
    name: "Llama 3.3 70B",
    provider: "meta",
    apiId: "meta-llama/llama-3.3-70b-instruct",
    tier: "low",
    speed: "FAST",
    badge: "BASIC",
    creditCostPerMsg: "~0.2 cr",
    simpleTasks: 4,
    complexTasks: 3,
  },
  // ── MID ───────────────────────────────────────────────────────────────────
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "deepseek",
    apiId: "deepseek/deepseek-r1",
    tier: "mid",
    speed: "SMART",
    creditCostPerMsg: "~1.5 cr",
    simpleTasks: 5,
    complexTasks: 5,
  },
  {
    id: "gpt4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    apiId: "openai/gpt-4o-mini",
    tier: "mid",
    speed: "FAST",
    creditCostPerMsg: "~0.4 cr",
    simpleTasks: 5,
    complexTasks: 4,
  },
  // ── HIGH ──────────────────────────────────────────────────────────────────
  {
    id: "claude-sonnet",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    apiId: "anthropic/claude-sonnet-4-5",
    tier: "high",
    speed: "SMART",
    creditCostPerMsg: "~10 cr",
    simpleTasks: 5,
    complexTasks: 5,
    minCredits: 10,
  },
  {
    id: "gpt4o",
    name: "GPT-4o",
    provider: "openai",
    apiId: "openai/gpt-4o",
    tier: "high",
    speed: "FAST",
    creditCostPerMsg: "~7 cr",
    simpleTasks: 5,
    complexTasks: 5,
    minCredits: 7,
  },
]

const TIER_LABEL: Record<string, string> = {
  free: "FREE",
  low:  "LOW TIER · CREDITS",
  mid:  "MID TIER · CREDITS",
  high: "HIGH TIER · CREDITS",
}

const TIER_ORDER = ["free", "low", "mid", "high"] as const

const SPEED_COLOR: Record<string, string> = {
  FAST:  "text-green-400",
  SLOW:  "text-yellow-400",
  SMART: "text-blue-400",
}

const PROVIDER_ICON: Record<string, { letter: string; color: string }> = {
  qwen:      { letter: "Q", color: "text-green-400" },
  google:    { letter: "G", color: "text-blue-400" },
  meta:      { letter: "M", color: "text-purple-400" },
  deepseek:  { letter: "D", color: "text-cyan-400" },
  openai:    { letter: "⊕", color: "text-emerald-400" },
  anthropic: { letter: "A", color: "text-orange-400" },
}

function MiniBar({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`w-2 h-1 rounded-sm ${i < value ? "bg-purple-400" : "bg-white/10"}`} />
      ))}
    </div>
  )
}

export default function ModelSelector({
  value,
  onChange,
  userCredits = 0,
}: {
  value: string
  onChange: (model: AIModel) => void
  userCredits?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = MODELS.find((m) => m.id === value) ?? MODELS[0]
  const icon = PROVIDER_ICON[selected.provider] ?? { letter: "?", color: "text-white/40" }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const grouped = TIER_ORDER.reduce<Record<string, AIModel[]>>((acc, tier) => {
    acc[tier] = MODELS.filter((m) => m.tier === tier)
    return acc
  }, {} as Record<string, AIModel[]>)

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
      >
        <div className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
          <span className={icon.color}>{icon.letter}</span>
        </div>
        <span className="text-white/70 text-sm">{selected.name}</span>
        {selected.badge && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
            selected.badge === "FREE"
              ? "text-green-400 bg-green-500/10 border-green-500/20"
              : "text-blue-400 bg-blue-500/10 border-blue-500/20"
          }`}>{selected.badge}</span>
        )}
        <span className={`text-[9px] font-medium ${SPEED_COLOR[selected.speed]}`}>
          {selected.speed}
        </span>
        <span className="text-white/20 text-xs">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-80 rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl z-50 overflow-hidden">
          {TIER_ORDER.map((tier) => {
            const tierModels = grouped[tier]
            if (!tierModels?.length) return null
            return (
              <div key={tier}>
                <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.05]">
                  <span className="text-[9px] font-bold text-white/25 tracking-widest uppercase">
                    {TIER_LABEL[tier]}
                  </span>
                </div>
                {tierModels.map((model) => {
                  const isLocked = !model.free && model.minCredits !== undefined && userCredits < model.minCredits
                  const isSelected = model.id === selected.id
                  const pIcon = PROVIDER_ICON[model.provider] ?? { letter: "?", color: "text-white/40" }
                  return (
                    <button
                      key={model.id}
                      disabled={isLocked}
                      onClick={() => { if (!isLocked) { onChange(model); setOpen(false) } }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                        isSelected ? "bg-purple-500/10"
                        : isLocked ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                        <span className={pIcon.color}>{pIcon.letter}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-white/80 text-xs font-medium truncate">{model.name}</span>
                          {model.badge && (
                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded border shrink-0 ${
                              model.badge === "FREE"
                                ? "text-green-400 bg-green-500/10 border-green-500/20"
                                : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                            }`}>{model.badge}</span>
                          )}
                          <span className={`text-[9px] font-medium shrink-0 ${SPEED_COLOR[model.speed]}`}>
                            {model.speed}
                          </span>
                          {isLocked && (
                            <span className="text-[9px] text-white/25 ml-auto shrink-0">
                              🔒 need {model.minCredits} cr
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/30">
                          {model.free ? "No credits used" : model.creditCostPerMsg + " / msg"}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <MiniBar value={model.simpleTasks} />
                        <MiniBar value={model.complexTasks} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}