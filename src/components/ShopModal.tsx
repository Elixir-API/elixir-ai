"use client"

import { useState } from "react"

const MONTHLY_PLANS = [
  {
    name: "Starter",
    credits: 100,
    price: "CA$7.99",
    period: "/mo",
    color: "border-white/10",
    badge: null,
    perks: ["100 prompts / month", "Llama & Gemini models", "Basic support"],
  },
  {
    name: "Builder",
    credits: 300,
    price: "CA$13.99",
    period: "/mo",
    color: "border-purple-500/40",
    badge: "Best Value",
    perks: ["300 prompts / month", "All models incl. Claude", "Priority support"],
  },
  {
    name: "Studio",
    credits: 1000,
    price: "CA$29.99",
    period: "/mo",
    color: "border-violet-500/30",
    badge: null,
    perks: ["1000 prompts / month", "All models + early access", "Discord role"],
  },
]

const CREDIT_PACKS = [
  {
    name: "Small Pack",
    credits: 20,
    price: "CA$4.99",
    color: "border-white/10",
    badge: null,
    note: "CA$0.25 per prompt",
  },
  {
    name: "Medium Pack",
    credits: 75,
    price: "CA$14.99",
    color: "border-white/10",
    badge: null,
    note: "CA$0.20 per prompt",
  },
  {
    name: "Large Pack",
    credits: 200,
    price: "CA$34.99",
    color: "border-purple-500/20",
    badge: null,
    note: "CA$0.17 per prompt",
  },
]

export default function ShopModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState(1)
  const [tab, setTab] = useState<"monthly" | "credits">("monthly")

  const plans = tab === "monthly" ? MONTHLY_PLANS : CREDIT_PACKS

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold text-base">Upgrade Elixir</h2>
            <p className="text-white/30 text-xs mt-0.5">More prompts, more power</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-lg transition-colors">✕</button>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-5">
          <button
            onClick={() => { setTab("monthly"); setSelected(1) }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === "monthly"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-white/30 hover:text-white/60"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => { setTab("credits"); setSelected(0) }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === "credits"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-white/30 hover:text-white/60"
            }`}
          >
            Credit Packs
          </button>
        </div>

        {tab === "monthly" && (
          <p className="text-green-400/60 text-[11px] text-center mb-3 bg-green-500/5 border border-green-500/10 rounded-lg py-1.5">
            ✓ Monthly saves up to 68% vs credit packs
          </p>
        )}

        {/* Plans */}
        <div className="space-y-3 mb-5">
          {tab === "monthly" ? (
            MONTHLY_PLANS.map((plan, i) => (
              <button
                key={plan.name}
                onClick={() => setSelected(i)}
                className={`w-full flex items-start gap-4 px-4 py-3 rounded-xl border transition-all text-left ${
                  selected === i
                    ? "bg-purple-500/10 border-purple-500/40"
                    : `bg-white/[0.02] ${plan.color} hover:bg-white/[0.04]`
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/80 text-sm font-medium">{plan.name}</span>
                    {plan.badge && (
                      <span className="text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {plan.perks.map((p) => (
                      <li key={p} className="text-white/30 text-xs flex items-center gap-1.5">
                        <span className="text-purple-400/60">✓</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-white/80 text-sm font-semibold">{plan.price}</span>
                  <span className="text-white/30 text-xs">{plan.period}</span>
                </div>
              </button>
            ))
          ) : (
            CREDIT_PACKS.map((pack, i) => (
              <button
                key={pack.name}
                onClick={() => setSelected(i)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition-all text-left ${
                  selected === i
                    ? "bg-purple-500/10 border-purple-500/40"
                    : `bg-white/[0.02] ${pack.color} hover:bg-white/[0.04]`
                }`}
              >
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">{pack.name}</p>
                  <p className="text-white/30 text-xs mt-0.5">{pack.credits} prompts · {pack.note}</p>
                </div>
                <span className="text-white/80 text-sm font-semibold shrink-0">{pack.price}</span>
              </button>
            ))
          )}
        </div>

        <button className="w-full py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-medium text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.2)]">
          {tab === "monthly"
            ? `Subscribe to ${MONTHLY_PLANS[selected]?.name} →`
            : `Buy ${CREDIT_PACKS[selected]?.name} →`}
        </button>
        <p className="text-white/15 text-[10px] text-center mt-3">
          {tab === "monthly" ? "Cancel anytime · " : "One-time purchase · "}
          Prices in CAD · Powered by Stripe
        </p>
      </div>
    </div>
  )
}