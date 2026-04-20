import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"

const AUTHORIZED_ROBLOX_IDS = ["1682906375"]

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const raw = cookieStore.get("roblox_user")?.value

  if (!raw) redirect("/auth")

  try {
    const user = JSON.parse(decodeURIComponent(raw))
    if (!AUTHORIZED_ROBLOX_IDS.includes(user.id)) {
      redirect("/chat")
    }
  } catch {
    redirect("/auth")
  }

  return (
    <div className="flex min-h-screen bg-[#080808] text-white">
      <aside className="w-56 border-r border-white/[0.05] bg-[#080808] flex flex-col py-6 px-3 gap-1 fixed h-full">
        <div className="text-purple-400 font-bold text-xs mb-6 px-2 tracking-widest uppercase">
          Dev Console
        </div>
        <NavItem href="/dev" label="System Health" />
        <NavItem href="/dev/logs" label="Live Logs" />
        <NavItem href="/dev/plugin" label="Plugin Comms" />
        <NavItem href="/dev/errors" label="Errors" />
        <NavItem href="/dev/training" label="Training Queue" />
        <NavItem href="/dev/models" label="Model Logs" />
        <NavItem href="/dev/command" label="Command Bar" />
        <div className="mt-auto">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 transition-all"
          >
            ← Back to Chat
          </Link>
        </div>
      </aside>
      <main className="flex-1 ml-56 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-purple-900/20 transition-all"
    >
      {label}
    </Link>
  )
}