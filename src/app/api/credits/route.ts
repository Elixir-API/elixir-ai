import { NextRequest, NextResponse } from "next/server"
import { getCredits } from "@/lib/credits"

export async function GET(req: NextRequest) {
  const robloxId = req.nextUrl.searchParams.get("robloxId")
  if (!robloxId) {
    return NextResponse.json({ error: "Missing robloxId" }, { status: 400 })
  }
  try {
    const credits = await getCredits(robloxId)
    return NextResponse.json({ credits })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}