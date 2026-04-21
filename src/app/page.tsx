"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LANDING_MODELS = [
  { name: "Qwen 2.5 Coder", tier: "Free",  color: "from-green-500 to-emerald-500",  credits: "Free",       badge: "FREE"  },
  { name: "Llama 3.3 70B",  tier: "Low",   color: "from-sky-400 to-blue-600",       credits: "~0.2 cr/msg", badge: null   },
  { name: "GPT-4o Mini",    tier: "Mid",   color: "from-teal-400 to-cyan-600",      credits: "~0.4 cr/msg", badge: null   },
  { name: "Claude Sonnet",  tier: "High",  color: "from-orange-400 to-red-500",     credits: "~10 cr/msg",  badge: null   },
]

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true) }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden relative">

      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-700/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[100px] animate-pulse delay-500" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-sm font-bold">E</div>
            <span className="text-lg font-semibold tracking-tight">Elixir AI</span>
          </div>
          <a
            href="https://www.roblox.com/library/YOUR_PLUGIN_ID"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-white/70 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
          >
            <span>🔌</span> Get Plugin
          </a>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/auth")} className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">
            Sign In
          </button>
          <button onClick={() => router.push("/auth")} className="text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-4 py-2 rounded-lg transition-all font-medium">
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 pt-24 pb-10 text-center">
        <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            AI assistant built directly into Roblox Studio
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            The AI that{" "}
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              builds with you
            </span>
          </h1>
          <p className="text-white/50 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Elixir brings 7 of the world's best AI models straight into Roblox Studio.
            Link your account, install the plugin, and start building smarter.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <button
              onClick={() => router.push("/auth")}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-purple-900/40 hover:scale-105"
            >
              Connect Roblox & Start →
            </button>
            <a
              href="https://www.roblox.com/library/YOUR_PLUGIN_ID"
              target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 text-white/80 font-medium px-8 py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              <span>🔌</span> Get the Studio Plugin
            </a>
          </div>
        </div>

        {/* How it works */}
        <div className={`mt-20 flex flex-col md:flex-row items-center justify-center gap-4 text-sm transition-all duration-1000 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {[
            { step: "1", label: "Connect Roblox",  icon: "🎮", desc: "Link via OAuth2" },
            { step: "2", label: "Install Plugin",   icon: "🔌", desc: "Add to Studio" },
            { step: "3", label: "Plugin Goes Live", icon: "✅", desc: "Auto-unlocks chat" },
            { step: "4", label: "Build with AI",    icon: "💬", desc: "Ask anything" },
          ].map((item, i) => (
            <div key={item.step} className="flex items-center gap-4">
              <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-6 py-4 w-44 hover:border-purple-500/30 transition-all hover:bg-white/[0.08]">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-semibold text-white text-sm mb-0.5">{item.label}</div>
                <div className="text-white/40 text-xs text-center">{item.desc}</div>
              </div>
              {i < 3 && <div className="hidden md:block text-white/20 text-xl">→</div>}
            </div>
          ))}
        </div>

        {/* Model cards — REAL models */}
        <div className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl w-full transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {LANDING_MODELS.map((m) => (
            <div
              key={m.name}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.08] transition-all hover:border-white/20 hover:scale-105 cursor-default"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`text-xs font-semibold bg-gradient-to-r ${m.color} bg-clip-text text-transparent`}>
                  {m.tier}
                </div>
                {m.badge && (
                  <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1 py-0.5 rounded">
                    {m.badge}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-white/90 mb-1">{m.name}</div>
              <div className="text-xs text-white/40">{m.credits}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-white/25 text-xs">
          + 3 more models available · Qwen, DeepSeek R1, GPT-4o
        </p>
      </section>

      {/* Features */}
      <section className="relative z-10 px-8 py-16 max-w-5xl mx-auto w-full">
        <h2 className="text-center text-2xl font-bold mb-10 text-white/90">Everything you need, inside Studio</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "🔐", title: "Roblox-Linked Auth",    desc: "Your account is tied to your Roblox User ID. No email needed." },
            { icon: "🔌", title: "Plugin Required",        desc: "Chat only works when your Studio plugin is live. Keeps everything secure." },
            { icon: "⚡", title: "Streaming Responses",    desc: "Answers appear word by word in real time. Fast and never laggy." },
            { icon: "🧠", title: "7 Powerful Models",      desc: "From quick questions to deep reasoning — pick the right model for the job." },
            { icon: "💎", title: "Credit System",          desc: "Start with 50 free credits. Buy more when you need them." },
            { icon: "🎮", title: "Built for Builders",     desc: "Scripting help, game design, Lua debugging — Elixir knows Roblox." },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all hover:bg-white/[0.08]">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold text-white mb-1">{f.title}</div>
              <div className="text-sm text-white/50 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-8 pb-20 max-w-3xl mx-auto w-full">
        <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-2xl font-bold mb-3">Ready to build smarter?</h3>
          <p className="text-white/50 text-sm mb-6">Connect your Roblox account, install the plugin, and start chatting in under 2 minutes.</p>
          <button
            onClick={() => router.push("/auth")}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-purple-900/40 hover:scale-105"
          >
            Get Started Free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-5 flex items-center justify-between text-xs text-white/30">
        <span>© 2026 Elixir AI</span>
        <div className="flex items-center gap-4">
          <a href="https://www.roblox.com/library/YOUR_PLUGIN_ID" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
            Get Plugin
          </a>
          <span>Built with OpenRouter</span>
        </div>
      </footer>
    </main>
  );
}