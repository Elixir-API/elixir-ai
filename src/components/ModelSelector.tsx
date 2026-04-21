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
  tier: "free" | "low" | "mid" | "high"
  descriptor: string
  stats: { coding: number; modeling: number; ui: number }
}

export const MODELS: AIModel[] = [
  // ── FREE ──────────────────────────────────────────────────────────────
  {
    id: "qwen-coder",
    label: "Qwen 2.5 Coder 32B",
    apiId: "qwen/qwen-2.5-coder-32b-instruct:free",
    badge: "FREE", badgeColor: "#4ade80", free: true, tier: "free",
    descriptor: "SLOW",
    stats: { coding: 1, modeling: 2, ui: 2 },
  },

  // ── LOW TIER ──────────────────────────────────────────────────────────
  {
    id: "gemini-flash",
    label: "Gemini 2.0 Flash",
    apiId: "google/gemini-2.0-flash-001",
    badge: "LOW", badgeColor: "#86efac", free: false, tier: "low",
    descriptor: "FAST",
    stats: { coding: 2, modeling: 3, ui: 4 },
  },
  {
    id: "llama-70b",
    label: "Llama 3.3 70B",
    apiId: "meta-llama/llama-3.3-70b-instruct",
    badge: "LOW", badgeColor: "#86efac", free: false, tier: "low",
    descriptor: "FAST · BASIC",
    stats: { coding: 2, modeling: 2, ui: 3 },
  },

  // ── MID TIER ──────────────────────────────────────────────────────────
  {
    id: "deepseek-r1",
    label: "DeepSeek R1",
    apiId: "deepseek/deepseek-r1",
    badge: "MID", badgeColor: "#60a5fa", free: false, tier: "mid",
    descriptor: "SMART · SLOW",
    stats: { coding: 3, modeling: 3, ui: 3 },
  },
  {
    id: "gpt4o-mini",
    label: "GPT-4o Mini",
    apiId: "openai/gpt-4o-mini",
    badge: "MID", badgeColor: "#60a5fa", free: false, tier: "mid",
    descriptor: "SMART · FAST",
    stats: { coding: 3, modeling: 3, ui: 4 },
  },

  // ── HIGH TIER ─────────────────────────────────────────────────────────
  {
    id: "claude-sonnet",
    label: "Claude Sonnet 4.5",
    apiId: "anthropic/claude-sonnet-4-5",
    badge: "ELITE", badgeColor: "#f59e0b", free: false, tier: "high",
    descriptor: "SMART · FAST",
    stats: { coding: 5, modeling: 5, ui: 5 },
  },
  {
    id: "gpt4o",
    label: "GPT-4o",
    apiId: "openai/gpt-4o",
    badge: "ELITE", badgeColor: "#f59e0b", free: false, tier: "high",
    descriptor: "SMART · FAST",
    stats: { coding: 5, modeling: 4, ui: 5 },
  },
]

const TIER_META: Record<AIModel["tier"], { label: string; color: string }> = {
  free: { label: "Free",               color: "#4ade80" },
  low:  { label: "Low Tier · Credits", color: "#86efac" },
  mid:  { label: "Mid Tier · Credits", color: "#60a5fa" },
  high: { label: "High Tier · Credits",color: "#f59e0b" },
}

// ── Mini 3-bar stat chart ──────────────────────────────────────────────
function StatBars({ stats }: { stats: AIModel["stats"] }) {
  const bars = [
    { label: "C", value: stats.coding,   color: "#a78bfa" },
    { label: "M", value: stats.modeling, color: "#60a5fa" },
    { label: "U", value: stats.ui,       color: "#34d399" },
  ]
  return (
    <div className="flex flex-col gap-[3px] w-16 shrink-0">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-1">
          <span className="text-[7px] text-white/20 w-2 shrink-0">{bar.label}</span>
          <div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(bar.value / 5) * 100}%`,
                backgroundColor: bar.color + "aa",
              }}
            />
          </div>
          <span className="text-[7px] text-white/25 w-2 text-right shrink-0">{bar.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────
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

  const TIERS: AIModel["tier"][] = ["free", "low", "mid", "high"]

  return (
    <div className="relative flex flex-col gap-1" ref={ref}>

      {/* ── Trigger button ────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs rounded-lg pl-3 pr-2 py-1.5 hover:border-white/20 transition-all w-full"
      >
        <div className="flex items-center gap-2">
          <span>{selected.label}</span>
          <span
            className="text-[8px] font-bold tracking-wider"
            style={{ color: selected.badgeColor }}
          >
            {selected.descriptor}
          </span>
        </div>
        {/* ✅ Arrow rotates up when open */}
        <span
          className={`text-white/30 text-[10px] ml-2 inline-block transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          ▾
        </span>
      </button>

      {/* ── Dropdown — opens UPWARD ───────────────────────────────────── */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-[300px] bg-[#0f0f0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {TIERS.map((tier) => {
            const tierModels = MODELS.filter((m) => m.tier === tier)
            if (!tierModels.length) return null
            const { label, color } = TIER_META[tier]

            return (
              <div key={tier}>
                {/* Section header */}
                <div
                  className="px-3 py-1.5 text-[9px] tracking-widest uppercase font-semibold border-b border-white/[0.05]"
                  style={{ color: color + "70" }}
                >
                  {label}
                </div>

                {tierModels.map((m) => {
                  const est = estimateCreditCost(m.apiId, currentPrompt || "make a spinning part")
                  const canAfford = m.free || userCredits >= est.credits

                  return (
                    <button
                      key={m.id}
                      onClick={() => { onChange(m); setOpen(false) }}
                      disabled={!canAfford}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all text-left
                        ${value === m.id ? "bg-purple-500/15 text-white" : "text-white/70 hover:bg-white/[0.04]"}
                        ${!canAfford ? "opacity-35 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      {/* Left: name + descriptor + cost */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium truncate">{m.label}</span>
                          <span
                            className="text-[8px] font-bold tracking-wider shrink-0"
                            style={{ color: m.badgeColor }}
                          >
                            {m.descriptor}
                          </span>
                        </div>
                        <span className="text-[9px] text-white/25 mt-0.5 block">
                          {est.isFree
                            ? "No credits used"
                            : `~${formatCredits(est.credits)} credits / req`}
                        </span>
                      </div>

                      {/* Right: stat bars */}
                      <StatBars stats={m.stats} />
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Cost pill ─────────────────────────────────────────────────── */}
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