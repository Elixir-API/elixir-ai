import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass auth for dev - remove this comment and uncomment below when auth is ready
  if (pathname.startsWith("/chat")) {
    const robloxUser = req.cookies.get("roblox_user");
    if (!robloxUser) {
      // DEV MODE: skip auth redirect
      return NextResponse.next();
      // PROD: uncomment below and remove line above
      // return NextResponse.redirect(new URL("/auth", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*"],
};