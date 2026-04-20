// components/ModelSelector.tsx
"use client"
import { useState, useRef, useEffect } from "react"
import { estimateCreditCost, formatCredits } from "@/lib/pricing"

export type AIModel = {
  id: string
  label: string
  apiId: string
  badge: string
  badgeColor: string
  free: boolean
  tier: "free" | "pro" | "elite"
}

export const MODELS: AIModel[] = [
  {
    id: "qwen-coder",
    label: "Qwen 2.5 Coder 32B",
    apiId: "qwen/qwen-2.5-coder-32b-instruct:free",
    badge: "FREE", badgeColor: "#4ade80", free: true, tier: "free",
  },
  {
    id: "gemini-flash-free",
    label: "Gemini 2.0 Flash",
    apiId: "google/gemini-2.0-flash-exp:free",
    badge: "FREE", badgeColor: "#4ade80", free: true, tier: "free",
  },
  {
    id: "deepseek-free",
    label: "DeepSeek R1",
    apiId: "deepseek/deepseek-r1:free",
    badge: "FREE · SLOW", badgeColor: "#4ade80", free: true, tier: "free",
  },
  {
    id: "gemini-pro",
    label: "Gemini Flash Pro",
    apiId: "google/gemini-2.0-flash-001",
    badge: "PRO", badgeColor: "#60a5fa", free: false, tier: "pro",
  },
  {
    id: "deepseek-r1",
    label: "DeepSeek R1 Pro",
    apiId: "deepseek/deepseek-r1",
    badge: "PRO", badgeColor: "#60a5fa", free: false, tier: "pro",
  },
  {
    id: "claude-sonnet",
    label: "Claude Sonnet 4.5",
    apiId: "anthropic/claude-sonnet-4-5",
    badge: "ELITE", badgeColor: "#f59e0b", free: false, tier: "elite",
  },
]

interface Props {
  value: string
  onChange: (model: AIModel) => void
  userCredits: number
  currentPrompt?: string
}

export default function ModelSelector({ value, onChange, userCredits, currentPrompt = "" }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = MODELS.find((m) => m.id === value) ?? MODELS[0]
  const estimate = estimateCreditCost(selected.apiId, currentPrompt || "make a spinning part")

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const freeModels = MODELS.filter((m) => m.free)
  const paidModels = MODELS.filter((m) => !m.free)

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs rounded-lg pl-3 pr-2 py-1.5 hover:border-white/20 transition-all w-full"
      >
        <span>{selected.label}</span>
        <span className="text-white/30 text-[10px] ml-2">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-8 w-56 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {/* Free section */}
          <div className="px-3 py-1.5 text-[9px] text-white/20 tracking-widest uppercase font-semibold border-b border-white/5">
            Free
          </div>
          {freeModels.map((m) => (
            <ModelOption
              key={m.id}
              model={m}
              selected={m.id === value}
              canAfford={true}
              prompt={currentPrompt}
              onClick={() => { onChange(m); setOpen(false) }}
            />
          ))}

          {/* Paid section */}
          <div className="px-3 py-1.5 text-[9px] text-white/20 tracking-widest uppercase font-semibold border-b border-white/5 border-t border-white/5 mt-1">
            Paid · Credits
          </div>
          {paidModels.map((m) => {
            const est = estimateCreditCost(m.apiId, currentPrompt || "make a spinning part")
            return (
              <ModelOption
                key={m.id}
                model={m}
                selected={m.id === value}
                canAfford={userCredits >= est.credits}
                prompt={currentPrompt}
                onClick={() => { onChange(m); setOpen(false) }}
              />
            )
          })}
        </div>
      )}

      {/* Cost pill */}
      <div className="flex items-center gap-1.5">
        <span
          className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full"
          style={{ color: selected.badgeColor, background: selected.badgeColor + "18" }}
        >
          {selected.badge}
        </span>
        {estimate.isFree ? (
          <span className="text-[10px] text-green-400/60">No credits used</span>
        ) : (
          <span className="text-[10px] text-white/30">
            ~<span className="text-white/55 font-medium">{formatCredits(estimate.credits)}</span> credits this request
          </span>
        )}
        {!estimate.isFree && userCredits < estimate.credits && (
          <span className="text-[9px] text-red-400/70 ml-auto">⚠ low credits</span>
        )}
      </div>
    </div>
  )
}

// Sub-component for each row
function ModelOption({
  model, selected, canAfford, prompt, onClick,
}: {
  model: AIModel
  selected: boolean
  canAfford: boolean
  prompt: string
  onClick: () => void
}) {
  const est = estimateCreditCost(model.apiId, prompt || "make a spinning part")
  return (
    <button
      onClick={onClick}
      disabled={!canAfford}
      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-all
        ${selected ? "bg-purple-500/20 text-white" : "text-white/70 hover:bg-white/5"}
        ${!canAfford ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span>{model.label}</span>
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-2"
        style={{ color: model.badgeColor, background: model.badgeColor + "18" }}
      >
        {est.isFree ? "FREE" : `~${formatCredits(est.credits)} cr`}
      </span>
    </button>
  )
}