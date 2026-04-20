 import { RobloxUser } from "@/types";

export function getRobloxUserFromCookie(): RobloxUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("roblox_user="));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

export function clearRobloxUser(): void {
  document.cookie = "roblox_user=; Max-Age=0; path=/";
}
