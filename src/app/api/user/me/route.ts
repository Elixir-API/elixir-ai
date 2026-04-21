import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const raw = req.cookies.get("roblox_user")?.value
    if (!raw) return NextResponse.json({ loggedIn: false, user: null })
    const obj = JSON.parse(decodeURIComponent(raw))
    const id = obj?.id ?? obj?.robloxId ?? obj?.userId
    if (!id) return NextResponse.json({ loggedIn: false, user: null })
    return NextResponse.json({
      loggedIn: true,
      user: {
        id: String(id),
        name: obj?.name ?? obj?.username ?? "User",
        displayName: obj?.displayName ?? obj?.name ?? "User",
        avatarUrl: obj?.avatarUrl ?? obj?.avatar ?? null,
      },
    })
  } catch {
    return NextResponse.json({ loggedIn: false, user: null })
  }
}