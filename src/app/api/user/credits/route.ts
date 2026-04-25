import { NextRequest, NextResponse } from "next/server"
import { getCredits, addCredits } from "@/lib/credits"

export const dynamic = "force-dynamic"

function getRobloxId(req: NextRequest): string | null {
  for (const name of ["roblox_user", "user", "session", "__session", "auth"]) {
    try {
      const raw = req.cookies.get(name)?.value
      if (!raw) continue
      const obj = JSON.parse(decodeURIComponent(raw))
      const id = obj?.id ?? obj?.robloxId ?? obj?.userId ?? obj?.user?.id
      if (id) return String(id)
    } catch {}
  }
  return null
}

// GET /api/user/credits — returns balance
export async function GET(req: NextRequest) {
  const robloxId =
    req.nextUrl.searchParams.get("robloxId") ?? getRobloxId(req)

  if (!robloxId) {
    return NextResponse.json({ credits: 0, error: "Not logged in" }, { status: 401 })
  }

  const credits = await getCredits(robloxId)
  return NextResponse.json({ credits, robloxId })
}

// POST /api/user/credits — add credits (called by your payment webhook)
export async function POST(req: NextRequest) {
  try {
    const { robloxId, amount, secret } = await req.json()

    // Basic secret so random people can't give themselves credits
    if (secret !== process.env.CREDITS_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    if (!robloxId || !amount || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Bad params" }, { status: 400 })
    }

    const newBalance = await addCredits(String(robloxId), Number(amount))
    return NextResponse.json({ ok: true, newBalance })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}