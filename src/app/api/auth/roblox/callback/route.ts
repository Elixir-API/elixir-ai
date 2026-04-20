 
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/auth?error=invalid_state`);
  }

  try {
    const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${appUrl}/api/auth/roblox/callback`,
        client_id: process.env.ROBLOX_CLIENT_ID!,
        client_secret: process.env.ROBLOX_CLIENT_SECRET!,
      }),
    });

  if (!tokenRes.ok) {
  const errBody = await tokenRes.text()
  console.error("Token exchange error:", errBody)
  throw new Error("Token exchange failed")
}

    const tokens = await tokenRes.json();

    const userRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) throw new Error("User info failed");

    const info = await userRes.json();

    const user = {
      id: String(info.sub),
      name: info.preferred_username ?? "RobloxUser",
      displayName: info.name ?? info.preferred_username ?? "RobloxUser",
      avatarUrl: info.picture ?? "",
      pluginToken: nanoid(32),
    };

    cookieStore.set("roblox_user", encodeURIComponent(JSON.stringify(user)), {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });

    cookieStore.delete("oauth_state");

    return NextResponse.redirect(`${appUrl}/chat`);
  } catch (err) {
    console.error("OAuth error:", err);
    return NextResponse.redirect(`${appUrl}/auth?error=oauth_failed`);
  }
}