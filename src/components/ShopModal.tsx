"use client"

import { useState } from "react"

const MONTHLY_PLANS = [
  {
    name: "Starter",
    credits: 80,
    price: "CA$4.99",
    period: "/mo",
    color: "border-white/10",
    badge: null,
    // Monthly shows EXACTLY how many prompts per model
    prompts: [
      { model: "Llama 3.3 / Gemini Flash", count: "~160 msgs", color: "text-blue-400"   },
      { model: "GPT-4o Mini",              count: "~88 msgs",  color: "text-teal-400"   },
      { model: "DeepSeek R1",              count: "~26 msgs",  color: "text-yellow-400" },
      { model: "GPT-4o",                   count: "~5 msgs",   color: "text-orange-400" },
      { model: "Claude Sonnet 4.5",        count: "~3 msgs",   color: "text-red-400"    },
    ],
    extras: ["Free models always unlimited", "Basic support"],
  },
  {
    name: "Builder",
    credits: 200,
    price: "CA$11.99",
    period: "/mo",
    color: "border-purple-500/40",
    badge: "Best Value",
    prompts: [
      { model: "Llama 3.3 / Gemini Flash", count: "~400 msgs", color: "text-blue-400"   },
      { model: "GPT-4o Mini",              count: "~222 msgs", color: "text-teal-400"   },
      { model: "DeepSeek R1",              count: "~66 msgs",  color: "text-yellow-400" },
      { model: "GPT-4o",                   count: "~13 msgs",  color: "text-orange-400" },
      { model: "Claude Sonnet 4.5",        count: "~9 msgs",   color: "text-red-400"    },
    ],
    extras: ["Free models always unlimited", "Priority support"],
  },
  {
    name: "Studio",
    credits: 400,
    price: "CA$24.99",
    period: "/mo",
    color: "border-violet-500/30",
    badge: null,
    prompts: [
      { model: "Llama 3.3 / Gemini Flash", count: "~800 msgs", color: "text-blue-400"   },
      { model: "GPT-4o Mini",              count: "~444 msgs", color: "text-teal-400"   },
      { model: "DeepSeek R1",              count: "~133 msgs", color: "text-yellow-400" },
      { model: "GPT-4o",                   count: "~26 msgs",  color: "text-orange-400" },
      { model: "Claude Sonnet 4.5",        count: "~18 msgs",  color: "text-red-400"    },
    ],
    extras: ["Free models always unlimited", "Discord role + early access + priority"],
  },
]

const CREDIT_PACKS = [
  { name: "Small Pack",  credits: 20,  price: "CA$1.99",  badge: null,      color: "border-white/10"       },
  { name: "Medium Pack", credits: 60,  price: "CA$4.99",  badge: "Popular", color: "border-white/10"       },
  { name: "Large Pack",  credits: 150, price: "CA$10.99", badge: null,      color: "border-purple-500/20"  },
]

export default function ShopModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState(1)
  const [tab, setTab] = useState<"monthly" | "credits">("monthly")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold text-base">Get Credits</h2>
            <p className="text-white/30 text-xs mt-0.5">
              Credits charge based on model + script length
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white text-lg transition-colors w-7 h-7 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl mb-4">
          {(["monthly", "credits"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected(t === "monthly" ? 1 : 0) }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {t === "monthly" ? "Monthly" : "Credit Packs"}
            </button>
          ))}
        </div>

        {/* Monthly plans */}
        {tab === "monthly" && (
          <>
            <p className="text-white/25 text-[11px] text-center mb-3 bg-white/[0.02] border border-white/[0.06] rounded-lg py-1.5 px-3">
              Monthly credits renew every 30 days · unused credits don't roll over
            </p>

            <div className="space-y-2.5 mb-5">
              {MONTHLY_PLANS.map((plan, i) => (
                <button
                  key={plan.name}
                  onClick={() => setSelected(i)}
                  className={`w-full flex items-start gap-4 px-4 py-3.5 rounded-xl border transition-all text-left ${
                    selected === i
                      ? "bg-purple-500/10 border-purple-500/40"
                      : `bg-white/[0.02] ${plan.color} hover:bg-white/[0.03]`
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    {/* Name + credits + badge */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-white/80 text-sm font-semibold">{plan.name}</span>
                      <span className="text-white/20 text-xs font-mono">{plan.credits} cr</span>
                      {plan.badge && (
                        <span className="text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 rounded-full ml-auto">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    {/* Per-model prompt counts */}
                    <div className="space-y-1 mb-2">
                      {plan.prompts.map(p => (
                        <div key={p.model} className="flex items-center justify-between gap-2">
                          <span className="text-white/30 text-[11px] truncate">{p.model}</span>
                          <span className={`text-[11px] font-mono font-medium shrink-0 ${p.color}`}>
                            {p.count}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Extras */}
                    <div className="border-t border-white/[0.05] pt-2 space-y-0.5">
                      {plan.extras.map(e => (
                        <p key={e} className="text-white/25 text-[11px] flex items-center gap-1.5">
                          <span className="text-purple-400/40 shrink-0">✓</span> {e}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <div className="text-white/80 text-sm font-semibold">{plan.price}</div>
                    <div className="text-white/25 text-xs">{plan.period}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Credit packs */}
        {tab === "credits" && (
          <>
            {/* Key difference from monthly — spelled out clearly */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 mb-4 space-y-1">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold mb-1.5">
                How packs work
              </p>
              <p className="text-white/50 text-xs leading-relaxed">
                Buy credits once — spend them on{" "}
                <span className="text-white/80 font-medium">any model you want</span>,
                whenever you want. No monthly limit, no expiry.
              </p>
              <p className="text-white/30 text-xs leading-relaxed">
                High tier models (GPT-4o, Claude) just need ≥ 2 credits
                in your balance to unlock — any pack covers that.
              </p>
            </div>

            <div className="space-y-2.5 mb-5">
              {CREDIT_PACKS.map((pack, i) => (
                <button
                  key={pack.name}
                  onClick={() => setSelected(i)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all text-left ${
                    selected === i
                      ? "bg-purple-500/10 border-purple-500/40"
                      : `bg-white/[0.02] ${pack.color} hover:bg-white/[0.03]`
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white/80 text-sm font-semibold">{pack.name}</p>
                      {pack.badge && (
                        <span className="text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 rounded-full">
                          {pack.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-white/35 text-xs font-mono font-medium">
                      {pack.credits} credits
                    </p>
                    <p className="text-white/20 text-[11px] mt-0.5">
                      Use on any model · no expiry · no restrictions
                    </p>
                  </div>
                  <span className="text-white/80 text-sm font-semibold shrink-0">
                    {pack.price}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <button className="w-full py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-semibold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.15)]">
          {tab === "monthly"
            ? `Subscribe to ${MONTHLY_PLANS[selected]?.name} — ${MONTHLY_PLANS[selected]?.price}/mo →`
            : `Buy ${CREDIT_PACKS[selected]?.name} — ${CREDIT_PACKS[selected]?.price} →`}
        </button>

        <p className="text-white/15 text-[10px] text-center mt-3">
          {tab === "monthly"
            ? "Cancel anytime · credits reset every 30 days · "
            : "One-time purchase · credits never expire · "}
          Prices in CAD · Powered by Stripe
        </p>
      </div>
    </div>
  )
}