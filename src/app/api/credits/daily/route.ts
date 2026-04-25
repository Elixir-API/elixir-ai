import { NextRequest, NextResponse } from "next/server"
import { claimDailyCredits } from "@/lib/credits"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { robloxId } = await req.json()

    if (!robloxId) {
      return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 400 })
    }

    const result = await claimDailyCredits(String(robloxId))

    return NextResponse.json(result, { status: result.ok ? 200 : 200 }) // always 200, ok flag tells frontend
  } catch (err: any) {
    console.error("[Daily Credits Error]", err)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}