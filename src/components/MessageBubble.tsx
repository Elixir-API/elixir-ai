 "use client"

import { useState, useRef, useEffect } from "react"

export type AIModel = {
  id: string
  name: string
  subtitle?: string
  provider: string
  apiId: string
  creditCost: string
  simpleTasks: number
  complexTasks: number
  free?: boolean
  badge?: string
  locked?: boolean
  minCredits?: number
}

export const MODELS: AIModel[] = [
  {
    id: "gemini-flash",
    name: "Gemini 3 Flash",
    provider: "google",
    apiId: "google/gemini-flash-1.5",
    creditCost: "$",
    simpleTasks: 5,
    complexTasks: 3,
  },
  {
    id: "step-flash",
    name: "Step 3.5 Flash",
    subtitle: "Free model from StepFun via OpenRouter.",
    provider: "stepfun",
    apiId: "stepfun/step-2-16k",
    creditCost: "Free",
    simpleTasks: 4,
    complexTasks: 2,
    free: true,
    badge: "FREE",
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    apiId: "anthropic/claude-sonnet-4-5",
    creditCost: "$$$",
    simpleTasks: 5,
    complexTasks: 5,
    locked: true,
    minCredits: 2,
  },
  {
    id: "claude-opus",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    apiId: "anthropic/claude-opus-4",
    creditCost: "$$$$",
    simpleTasks: 5,
    complexTasks: 5,
    locked: true,
    minCredits: 2,
  },
]

const PROVIDER_LOGO: Record<string, { text: string; color: string }> = {
  google:    { text: "G",  color: "text-blue-400" },
  anthropic: { text: "A",  color: "text-orange-400" },
  stepfun:   { text: "⚗", color: "text-purple-400" },
}

function ProviderIcon({ provider }: { provider: string }) {
  const p = PROVIDER_LOGO[provider] ?? { text: "?", color: "text-white/40" }
  return (
    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold shrink-0">
      <span className={p.color}>{p.text}</span>
    </div>
  )
}

function StarBar({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < value ? "bg-purple-400" : "bg-white/10"
          }`}
        />
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

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all text-sm"
      >
        <ProviderIcon provider={selected.provider} />
        <span className="text-white/70">{selected.name}</span>
        {selected.badge && (
          <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">
            {selected.badge}
          </span>
        )}
        {selected.locked && (
          <span className="text-white/20 text-xs">🔒</span>
        )}
        <span className="text-white/20 text-xs ml-1">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-72 rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl z-50 overflow-hidden">
          {MODELS.map((model) => {
            const isLocked = model.locked && userCredits < (model.minCredits ?? 0)
            const isSelected = model.id === selected.id
            return (
              <button
                key={model.id}
                disabled={isLocked}
                onClick={() => {
                  if (!isLocked) {
                    onChange(model)
                    setOpen(false)
                  }
                }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all ${
                  isSelected
                    ? "bg-purple-500/10"
                    : isLocked
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-white/5"
                }`}
              >
                <ProviderIcon provider={model.provider} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white/80 text-sm font-medium">
                      {model.name}
                    </span>
                    {model.badge && (
                      <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">
                        {model.badge}
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-[10px] text-white/30 ml-auto">
                        🔒 min {model.minCredits} credits
                      </span>
                    )}
                  </div>
                  {model.subtitle && (
                    <p className="text-white/30 text-xs mb-1">{model.subtitle}</p>
                  )}
                  <div className="flex gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1">
                      Simple <StarBar value={model.simpleTasks} />
                    </span>
                    <span className="flex items-center gap-1">
                      Complex <StarBar value={model.complexTasks} />
                    </span>
                  </div>
                </div>
                <span className="text-white/20 text-xs font-mono shrink-0">
                  {model.creditCost}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
