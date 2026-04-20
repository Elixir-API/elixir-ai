"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "invalid_state") setError("Authentication failed. Please try again.");
    if (err === "oauth_failed") setError("Roblox login failed. Please try again.");
  }, [searchParams]);

  const handleConnect = () => {
    setLoading(true);
    window.location.href = "/api/auth/roblox";
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden relative">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-700/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
            E
          </div>
          <span className="text-lg font-semibold tracking-tight">Elixir AI</span>
        </button>
      </nav>

      {/* Main */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 border border-purple-500/30 flex items-center justify-center text-3xl">
                🎮
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-2">
              Connect Your Roblox Account
            </h1>
            <p className="text-white/50 text-sm text-center mb-8 leading-relaxed">
              Elixir requires your Roblox account to link with the Studio plugin.
              Your chat access is tied to your unique Roblox User ID.
            </p>

            {/* How it works */}
            <div className="space-y-3 mb-8">
              {[
                { icon: "🔗", text: "Link your Roblox account securely via OAuth2" },
                { icon: "🔌", text: "Install the Elixir plugin in Roblox Studio" },
                { icon: "✅", text: "Plugin goes online — chat unlocks automatically" },
                { icon: "💬", text: "Ask Elixir anything without leaving Studio" },
              ].map((step) => (
                <div
                  key={step.text}
                  className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
                >
                  <span className="text-lg">{step.icon}</span>
                  <span className="text-sm text-white/70">{step.text}</span>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4 text-center">
                {error}
              </div>
            )}

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-purple-900/40 hover:shadow-purple-800/50 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Redirecting to Roblox...
                </>
              ) : (
                <>
                  <span>🎮</span>
                  Connect with Roblox
                </>
              )}
            </button>

            {/* Fine print */}
            <p className="text-white/30 text-xs text-center mt-4">
              We only access your username and User ID. Nothing else.
            </p>
          </div>

          {/* Plugin note */}
          <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 text-center">
            <p className="text-yellow-400/70 text-xs">
              ⚠️ After linking, you must have the{" "}
              <span className="text-yellow-400 font-semibold">Elixir Studio Plugin</span>{" "}
              running — chat is disabled without it.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}