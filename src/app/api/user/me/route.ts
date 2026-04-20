import { NextRequest, NextResponse } from "next/server"
import { isDev, DEV_CREDIT_BALANCE } from "@/lib/dev-accounts"
import { isConnected, getLogs } from "@/lib/inject-store"

export const dynamic = "force-dynamic"

// Try every possible cookie / header format Roblox OAuth apps use
function extractUser(req: NextRequest) {
  const tryParse = (raw: string | undefined) => {
    if (!raw) return null
    try {
      const decoded = decodeURIComponent(raw)
      const obj = JSON.parse(decoded)
      // Support various shapes
      const id =
        obj?.id ?? obj?.robloxId ?? obj?.userId ?? obj?.user?.id ?? null
      const name =
        obj?.name ?? obj?.username ?? obj?.displayName ?? obj?.user?.name ?? null
      const avatar =
        obj?.avatar ?? obj?.avatarUrl ?? obj?.thumbnailUrl ?? obj?.user?.avatar ?? null
      if (!id) return null
      return { id: String(id), name: String(name ?? ""), avatar: avatar ?? null }
    } catch {
      return null
    }
  }

  // Try every common cookie name
  for (const cookieName of [
    "roblox_user",
    "user",
    "session",
    "__session",
    "roblox_session",
    "auth",
    "auth_user",
  ]) {
    const result = tryParse(req.cookies.get(cookieName)?.value)
    if (result) return result
  }

  return null
}

export async function GET(req: NextRequest) {
  const user = extractUser(req)

  if (!user) {
    return NextResponse.json({ loggedIn: false, user: null })
  }

  const dev = isDev(user.id, user.name)
  const connected = isConnected(user.id)
  const recentLogs = getLogs(user.id).slice(-5)

  return NextResponse.json({
    loggedIn: true,
    user: {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      isDev: dev,
      unlimited: dev,
      credits: dev ? DEV_CREDIT_BALANCE : null,
      pluginConnected: connected,
      recentLogs,
    },
  })
}