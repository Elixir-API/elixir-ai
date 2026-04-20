import { NextRequest, NextResponse } from "next/server"
import { pushCode, popCode, heartbeat, queueLength } from "@/lib/inject-store"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { robloxId, code } = await req.json()
    if (!robloxId || !code)
      return NextResponse.json({ ok: false, error: "Missing robloxId or code" }, { status: 400 })
    pushCode(String(robloxId), code)
    return NextResponse.json({ ok: true, queued: queueLength(String(robloxId)) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const robloxId = req.nextUrl.searchParams.get("robloxId")
  if (!robloxId) return NextResponse.json({ code: null, remaining: 0 })

  heartbeat(robloxId)
  const code = popCode(robloxId)
  const remaining = queueLength(robloxId)

  return NextResponse.json({ code: code ?? null, remaining })
}