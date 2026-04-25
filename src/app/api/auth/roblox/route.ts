import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const state = nanoid();
  const cookieStore = await cookies();

  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
  });

  // ✅ Use env var — req.nextUrl.protocol returns "http:" on Vercel
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ?? `https://${req.nextUrl.host}`;

  const params = new URLSearchParams({
    client_id: process.env.ROBLOX_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/auth/roblox/callback`,
    response_type: "code",
    scope: "openid profile",
    state,
  });

  return NextResponse.redirect(
    `https://apis.roblox.com/oauth/v1/authorize?${params.toString()}`
  );
}