import { NextRequest, NextResponse } from "next/server"
import { pushLog, getLogs, clearLogs, heartbeat } from "@/lib/inject-store"

export const dynamic = "force-dynamic"

// Plugin → server: report what happened after injection
export async function POST(req: NextRequest) {
  try {
    const { robloxId, success, scriptName, message } = await req.json()
    if (!robloxId) return NextResponse.json({ ok: false }, { status: 400 })

    heartbeat(String(robloxId))
    pushLog(String(robloxId), {
      success: Boolean(success),
      scriptName: String(scriptName ?? "Unknown"),
      message: String(message ?? ""),
    })

    console.log(
      `[Elixir] Plugin output | ${robloxId} | ${success ? "✓" : "✗"} ${scriptName}: ${message}`
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}

// Web app → get real logs from Studio
export async function GET(req: NextRequest) {
  const robloxId = req.nextUrl.searchParams.get("robloxId")
  if (!robloxId) return NextResponse.json({ logs: [] })

  const logs = getLogs(robloxId)
  return NextResponse.json({ logs })
}

export async function DELETE(req: NextRequest) {
  const robloxId = req.nextUrl.searchParams.get("robloxId")
  if (robloxId) clearLogs(robloxId)
  return NextResponse.json({ ok: true })
}