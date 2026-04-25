"use client"
import { useEffect, useState } from "react"
import type { HistoryEntry } from "@/app/api/history/route"

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#080808] px-6 py-8 overflow-y-auto">
      <h1 className="text-white font-semibold text-lg mb-6">Chat History</h1>

      {loading && <p className="text-white/30 text-sm">Loading...</p>}

      {!loading && history.length === 0 && (
        <p className="text-white/30 text-sm">No history yet — start a chat!</p>
      )}

      <div className="space-y-3 max-w-2xl">
        {history.map(entry => (
          <div key={entry.id} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
            <p className="text-white/70 text-sm font-medium truncate">{entry.prompt}</p>
            <p className="text-white/30 text-xs mt-1 line-clamp-2">{entry.response}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-purple-400/50 text-[10px]">{entry.modelId}</span>
              <span className="text-white/20 text-[10px]">
                {new Date(entry.ts).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}