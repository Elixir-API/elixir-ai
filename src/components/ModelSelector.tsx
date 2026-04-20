"use client"

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
  // ── Free ──────────────────────────────────────────────────────────────────
  {
    id: "qwen-coder",
    label: "Qwen 2.5 Coder 32B",
    apiId: "qwen/qwen-2.5-coder-32b-instruct:free",
    badge: "FREE",
    badgeColor: "#4ade80",
    free: true,
    tier: "free",
  },
  {
    id: "gemini-flash-free",
    label: "Gemini 2.0 Flash",
    apiId: "google/gemini-2.0-flash-exp:free",
    badge: "FREE",
    badgeColor: "#4ade80",
    free: true,
    tier: "free",
  },
  {
    id: "deepseek-free",
    label: "DeepSeek R1",
    apiId: "deepseek/deepseek-r1:free",
    badge: "FREE · SLOW",
    badgeColor: "#4ade80",
    free: true,
    tier: "free",
  },
  // ── Pro ───────────────────────────────────────────────────────────────────
  {
    id: "gemini-pro",
    label: "Gemini Flash Pro",
    apiId: "google/gemini-2.0-flash-001",
    badge: "PRO",
    badgeColor: "#60a5fa",
    free: false,
    tier: "pro",
  },
  {
    id: "deepseek-r1",
    label: "DeepSeek R1 Pro",
    apiId: "deepseek/deepseek-r1",
    badge: "PRO",
    badgeColor: "#60a5fa",
    free: false,
    tier: "pro",
  },
  // ── Elite ─────────────────────────────────────────────────────────────────
  {
    id: "claude-sonnet",
    label: "Claude Sonnet 4.5",
    apiId: "anthropic/claude-sonnet-4-5",
    badge: "ELITE",
    badgeColor: "#f59e0b",
    free: false,
    tier: "elite",
  },
]

interface Props {
  value: string
  onChange: (model: AIModel) => void
  userCredits: number
  currentPrompt?: string // passed from ChatArea so we can estimate cost live
}

export default function ModelSelector({
  value,
  onChange,
  userCredits,
  currentPrompt = "",
}: Props) {
  const selected = MODELS.find((m) => m.id === value) ?? MODELS[0]
  const estimate = estimateCreditCost(selected.apiId, currentPrompt || "make a spinning part")

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const m = MODELS.find((x) => x.id === e.target.value)
            if (m) onChange(m)
          }}
          className="appearance-none bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-purple-500/40 hover:border-white/20 transition-all cursor-pointer w-full"
        >
          <optgroup label="── Free ─────────────">
            {MODELS.filter((m) => m.free).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="── Paid (credits) ───">
            {MODELS.filter((m) => !m.free).map((m) => {
              const est = estimateCreditCost(m.apiId, currentPrompt || "make a spinning part")
              return (
                <option
                  key={m.id}
                  value={m.id}
                  disabled={!m.free && userCredits < est.credits}
                >
                  {m.label}  (~{formatCredits(est.credits)} cr)
                </option>
              )
            })}
          </optgroup>
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-[10px]">▾</span>
      </div>

      {/* Live cost estimate pill */}
      <div className="flex items-center gap-1.5">
        <span
          className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full"
          style={{
            color: selected.badgeColor,
            background: selected.badgeColor + "18",
          }}
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