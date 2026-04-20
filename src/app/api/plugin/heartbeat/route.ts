import { NextRequest, NextResponse } from "next/server"
import { heartbeat, isConnected } from "@/lib/inject-store"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { robloxId } = await req.json()
    if (!robloxId) return NextResponse.json({ error: "Missing robloxId" }, { status: 400 })

    heartbeat(String(robloxId))
    console.log(`[Elixir] Heartbeat ✓ | ${robloxId}`)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const robloxId = req.nextUrl.searchParams.get("robloxId")
  if (robloxId) {
    return NextResponse.json({ connected: isConnected(robloxId) })
  }
  // Fallback: check any connected
  const { anyConnected } = await import("@/lib/inject-store")
  return NextResponse.json({ connected: anyConnected() })
}