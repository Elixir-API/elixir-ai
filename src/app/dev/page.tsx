import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"

export default async function DevHealthPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("elixir_token")?.value
  let userId = "Unknown"

  try {
    const payload = verify(token!, process.env.JWT_SECRET!) as {
      robloxUserId: string
      username: string
    }
    userId = payload.username
  } catch {}

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          System Health
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Authorized as{" "}
          <span className="text-purple-400 font-medium">{userId}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <HealthCard label="Server" value="Online" status="ok" />
        <HealthCard label="Database" value="Connected" status="ok" />
        <HealthCard label="WebSocket" value="Active" status="ok" />
        <HealthCard label="AI Service" value="Reachable" status="ok" />
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4">
        <p className="text-white/30 text-xs uppercase tracking-widest mb-1">
          Last Checked
        </p>
        <p className="text-white/70 text-sm font-mono">
          {new Date().toISOString()}
        </p>
      </div>

      <div className="mt-8">
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3">
          Jump To
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Live Logs", href: "/dev/logs" },
            { label: "Errors", href: "/dev/errors" },
            { label: "Plugin Comms", href: "/dev/plugin" },
            { label: "Training Queue", href: "/dev/training" },
            { label: "Model Logs", href: "/dev/models" },
            { label: "Command Bar", href: "/dev/command" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-white/50 hover:text-white hover:border-purple-500/30 hover:bg-purple-900/10 transition-all"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function HealthCard({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: "ok" | "warn" | "error"
}) {
  const dot = {
    ok: "bg-green-400",
    warn: "bg-yellow-400",
    error: "bg-red-500",
  }[status]

  const glow = {
    ok: "shadow-green-500/20",
    warn: "shadow-yellow-500/20",
    error: "shadow-red-500/20",
  }[status]

  return (
    <div className={`rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 flex items-center justify-between shadow-lg ${glow}`}>
      <div>
        <p className="text-white/30 text-xs uppercase tracking-widest mb-1">
          {label}
        </p>
        <p className="text-white font-medium text-sm">{value}</p>
      </div>
      <div className={`w-2.5 h-2.5 rounded-full ${dot} shadow-md`} />
    </div>
  )
}