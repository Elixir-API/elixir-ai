import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code             = searchParams.get("code");
  const state            = searchParams.get("state");
  const cookieStore      = await cookies();
  const savedState       = cookieStore.get("oauth_state")?.value;

  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", req.url));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ?? `https://${req.nextUrl.host}`;

  const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.ROBLOX_CLIENT_ID!,
      client_secret: process.env.ROBLOX_CLIENT_SECRET!,
      code:          code!,
      grant_type:    "authorization_code",
      redirect_uri:  `${baseUrl}/api/auth/roblox/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=token_failed", req.url));
  }

  const { access_token } = await tokenRes.json();

  const userRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/login?error=userinfo_failed", req.url));
  }

  const user = await userRes.json();

  cookieStore.delete("oauth_state");

  cookieStore.set("roblox_user", JSON.stringify({
    id:      user.sub,
    name:    user.name ?? user.preferred_username,
    picture: user.picture,
  }), {
    httpOnly: true,
    maxAge:   60 * 60 * 24 * 7,
    path:     "/",
  });

  return NextResponse.redirect(new URL("/", req.url));
}