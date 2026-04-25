"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

type NavItem = { label: string; href: string; icon: string }

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/chat", icon: "⌂" },
  { label: "History", href: "/chat/history", icon: "◷" },
]
const RESOURCE_ITEMS: NavItem[] = [
  { label: "Best Practices", href: "/docs", icon: "✦" },
  { label: "Get Plugin", href: "/plugin", icon: "↓" },
  { label: "Community", href: "/community", icon: "◎" },
]
const DEV_ITEMS: NavItem[] = [
  { label: "Model Logs", href: "/dev/models", icon: "◈" },
  { label: "Error Logs", href: "/dev/errors", icon: "⚠" },
  { label: "Training", href: "/dev/training", icon: "⟳" },
  { label: "Command", href: "/dev/command", icon: "›" },
]

const DEV_MOCK_USER =
  process.env.NODE_ENV === "development"
    ? { id: "dev-1", name: "DevUser", displayName: "Dev User", avatarUrl: "" }
    : null

type RobloxUser = {
  id: string
  name: string
  displayName: string
  avatarUrl: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const [devOpen, setDevOpen] = useState(false)
  const [user, setUser] = useState<RobloxUser | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [serverOk, setServerOk] = useState(true)
  const [pluginStatus, setPluginStatus] = useState<"connected" | "waiting" | "disconnected">("waiting")

  // ── Load user via server API (reads HttpOnly cookie — document.cookie can't) ──
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/user/me")
        if (res.ok) {
          const data = await res.json()
          if (data.loggedIn && data.user?.id) {
            setUser(data.user)
            return
          }
        }
      } catch {}
      if (DEV_MOCK_USER) setUser(DEV_MOCK_USER)
    }
    loadUser()
  }, [])

  // ── Fetch real credits from KV ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    async function fetchCredits() {
      try {
        const res = await fetch(`/api/credits?robloxId=${user!.id}`)
        if (res.ok) {
          const data = await res.json()
          setCredits(data.credits ?? 0)
        }
      } catch {}
    }
    fetchCredits()
    const id = setInterval(fetchCredits, 15_000)
    return () => clearInterval(id)
  }, [user?.id])

  // ── Plugin status ───────────────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      try {
        const url = user?.id ? `/api/plugin/status?robloxId=${user.id}` : `/api/plugin/status`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setPluginStatus(data.connected ? "connected" : "waiting")
          setServerOk(true)
        } else {
          setServerOk(false)
        }
      } catch {
        setServerOk(false)
      }
    }
    check()
    const id = setInterval(check, 5_000)
    return () => clearInterval(id)
  }, [user?.id])

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
          active
            ? "bg-purple-500/15 text-white border border-purple-500/20"
            : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
        }`}
      >
        <span className="text-[13px] w-4 text-center">{item.icon}</span>
        {item.label}
      </Link>
    )
  }

  return (
    <div className="w-[200px] shrink-0 h-screen flex flex-col bg-[#080808] border-r border-white/[0.05]">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
          🧪
        </div>
        <div className="leading-tight">
          <span className="text-white font-semibold text-sm tracking-tight">Elixir</span>
          <span className="text-purple-400 font-semibold text-sm tracking-tight"> AI</span>
        </div>
      </div>

     {/* New Chat */}
<div className="px-3 mb-3">
  <button
    onClick={() => { window.location.href = "/chat" }}
    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 text-purple-300 text-sm font-medium transition-all"
  >
    <span>+</span> New Chat
  </button>
</div>

      {/* Nav */}
      <div className="px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
      </div>

      {/* Resources */}
      <div className="px-3 mt-5">
        <p className="text-white/20 text-[10px] uppercase tracking-widest px-3 mb-1.5">Resources</p>
        <div className="space-y-0.5">
          {RESOURCE_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
        </div>
      </div>

      <div className="flex-1" />

      {/* Dev Console */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setDevOpen((o) => !o)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] text-xs transition-all"
        >
          <span>⌘</span><span>Dev Console</span>
          <span className="ml-auto">{devOpen ? "▴" : "▾"}</span>
        </button>
        {devOpen && (
          <div className="mt-1 space-y-0.5">
            {DEV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  pathname === item.href
                    ? "text-purple-300 bg-purple-500/10"
                    : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
                }`}
              >
                <span className="w-3 text-center">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="px-5 mb-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-white/25 text-[10px]">Server</span>
          <span className={`text-[10px] font-medium ${serverOk ? "text-green-400" : "text-red-400"}`}>
            {serverOk ? "Online" : "Error"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/25 text-[10px]">Plugin</span>
          <span className={`text-[10px] font-medium ${
            pluginStatus === "connected" ? "text-green-400" :
            pluginStatus === "waiting"   ? "text-yellow-400" : "text-red-400"
          }`}>
            {pluginStatus === "connected" ? "Connected" : pluginStatus === "waiting" ? "Waiting" : "Off"}
          </span>
        </div>
      </div>

      {/* User — bottom left */}
      <div className="px-3 pb-4 border-t border-white/[0.05] pt-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs text-purple-300 font-bold shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="pfp" className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0]?.toUpperCase() ?? "?"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs font-medium truncate">
              {user?.displayName ?? user?.name ?? "Not signed in"}
            </p>
            <p className="text-purple-400/60 text-[10px]">
              {credits === null ? "loading..." : `${credits} credits`}
            </p>
          </div>
          <button className="text-[10px] text-purple-400/60 hover:text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded transition-all shrink-0">
            Pro
          </button>
        </div>
      </div>
    </div>
  )
}