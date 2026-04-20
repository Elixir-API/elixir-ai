"use client"

import { useEffect, useState } from "react"

type HeartbeatEntry = {
  id: string
  pluginVersion: string
  robloxUserId: string
  placeId: string
  timestamp: string
  latency: number
  status: "ok" | "late" | "offline"
}

type PluginMessage = {
  id: string
  direction: "incoming" | "outgoing"
  type: string
  payload: string
  timestamp: string
}

const MOCK_HEARTBEATS: HeartbeatEntry[] = [
  {
    id: "1",
    pluginVersion: "1.0.3",
    robloxUserId: "1682906375",
    placeId: "7364823401",
    timestamp: new Date(Date.now() - 1000 * 4).toISOString(),
    latency: 142,
    status: "ok",
  },
  {
    id: "2",
    pluginVersion: "1.0.2",
    robloxUserId: "9823741023",
    placeId: "1234567890",
    timestamp: new Date(Date.now() - 1000 * 18).toISOString(),
    latency: 3200,
    status: "late",
  },
  {
    id: "3",
    pluginVersion: "1.0.1",
    robloxUserId: "4827364910",
    placeId: "9876543210",
    timestamp: new Date(Date.now() - 1000 * 90).toISOString(),
    latency: 0,
    status: "offline",
  },
]

const MOCK_MESSAGES: PluginMessage[] = [
  {
    id: "1",
    direction: "incoming",
    type: "HEARTBEAT",
    payload: '{ "version": "1.0.3", "userId": "1682906375" }',
    timestamp: new Date(Date.now() - 1000 * 4).toISOString(),
  },
  {
    id: "2",
    direction: "outgoing",
    type: "ACK",
    payload: '{ "status": "ok", "serverTime": "..." }',
    timestamp: new Date(Date.now() - 1000 * 4).toISOString(),
  },
  {
    id: "3",
    direction: "incoming",
    type: "CHAT_REQUEST",
    payload: '{ "message": "How do I script a part?", "userId": "1682906375" }',
    timestamp: new Date(Date.now() - 1000 * 12).toISOString(),
  },
  {
    id: "4",
    direction: "outgoing",
    type: "CHAT_RESPONSE",
    payload: '{ "reply": "To script a part, insert a Script..." }',
    timestamp: new Date(Date.now() - 1000 * 12).toISOString(),
  },
  {
    id: "5",
    direction: "incoming",
    type: "STATUS_CHECK",
    payload: '{ "pluginId": "elixir-v1" }',
    timestamp: new Date(Date.now() - 1000 * 30).toISOString(),
  },
]

const STATUS_STYLES = {
  ok: "bg-green-500/10 text-green-400 border-green-500/20",
  late: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  offline: "bg-red-500/10 text-red-400 border-red-500/20",
}

const STATUS_DOT = {
  ok: "bg-green-400",
  late: "bg-yellow-400",
  offline: "bg-red-500",
}

export default function PluginPage() {
  const [heartbeats, setHeartbeats] = useState<HeartbeatEntry[]>(MOCK_HEARTBEATS)
  const [messages, setMessages] = useState<PluginMessage[]>(MOCK_MESSAGES)
  const [tab, setTab] = useState<"heartbeats" | "messages">("heartbeats")
  const [tick, setTick] = useState(0)

  // Re-render every second to update "X seconds ago"
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  function timeAgo(timestamp: string) {
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  const onlineCount = heartbeats.filter((h) => h.status === "ok").length
  const lateCount = heartbeats.filter((h) => h.status === "late").length
  const offlineCount = heartbeats.filter((h) => h.status === "offline").length

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Plugin Comms
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Live plugin connections and message traffic
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Online" value={onlineCount} color="text-green-400" />
        <StatCard label="Late" value={lateCount} color="text-yellow-400" />
        <StatCard label="Offline" value={offlineCount} color="text-red-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["heartbeats", "messages"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${
              tab === t
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Heartbeats Tab */}
      {tab === "heartbeats" && (
        <div className="space-y-3">
          {heartbeats.map((hb) => (
            <div
              key={hb.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 flex items-center gap-4"
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[hb.status]}`} />
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <p className="text-white/30 text-xs mb-0.5">User ID</p>
                  <p className="text-white text-sm font-mono">{hb.robloxUserId}</p>
                </div>
                <div>
                  <p className="text-white/30 text-xs mb-0.5">Place ID</p>
                  <p className="text-white text-sm font-mono">{hb.placeId}</p>
                </div>
                <div>
                  <p className="text-white/30 text-xs mb-0.5">Version</p>
                  <p className="text-white text-sm font-mono">{hb.pluginVersion}</p>
                </div>
                <div>
                  <p className="text-white/30 text-xs mb-0.5">Latency</p>
                  <p className="text-white text-sm font-mono">
                    {hb.status === "offline" ? "—" : `${hb.latency}ms`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded border font-medium uppercase ${STATUS_STYLES[hb.status]}`}
                >
                  {hb.status}
                </span>
                <span className="text-white/20 text-xs">{timeAgo(hb.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages Tab */}
      {tab === "messages" && (
        <div className="space-y-2 font-mono text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl border px-4 py-3 flex gap-4 items-start ${
                msg.direction === "incoming"
                  ? "border-blue-500/10 bg-blue-500/[0.03]"
                  : "border-purple-500/10 bg-purple-500/[0.03]"
              }`}
            >
              <span
                className={`shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  msg.direction === "incoming"
                    ? "text-blue-400 border-blue-500/20 bg-blue-500/10"
                    : "text-purple-400 border-purple-500/20 bg-purple-500/10"
                }`}
              >
                {msg.direction === "incoming" ? "IN" : "OUT"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/60 font-bold">{msg.type}</span>
                  <span className="text-white/20">{timeAgo(msg.timestamp)}</span>
                </div>
                <p className="text-white/30 truncate">{msg.payload}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4">
      <p className="text-white/30 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}