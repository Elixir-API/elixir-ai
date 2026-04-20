import { NextRequest, NextResponse } from "next/server"
import { heartbeat, disconnect, isConnected, anyConnected } from "@/lib/inject-store"

export const dynamic = "force-dynamic"

// Return connected robloxId so client can use it even if cookie fails
function getFirstConnected(): string | null {
  const store: Map<string, number> = (globalThis as any).__elixir_heartbeat
  if (!store) return null
  const now = Date.now()
  for (const [id, ts] of store) {
    if (ts > 0 && now - ts < 10_000) return id
  }
  return null
}

export async function GET(req: NextRequest) {
  const robloxId = req.nextUrl.searchParams.get("robloxId")

  if (robloxId) {
    return NextResponse.json({
      connected: isConnected(robloxId),
      robloxId,
    })
  }

  // No robloxId given — return whichever user is connected
  const connectedId = getFirstConnected()
  return NextResponse.json({
    connected: !!connectedId,
    robloxId: connectedId ?? null,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { robloxId, action } = await req.json()
    if (!robloxId) return NextResponse.json({ ok: false }, { status: 400 })

    const id = String(robloxId)

    if (action === "disconnect") {
      disconnect(id)
      return NextResponse.json({ ok: true, connected: false })
    }

    heartbeat(id)
    return NextResponse.json({ ok: true, connected: true, robloxId: id })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}