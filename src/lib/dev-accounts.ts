// Add your Roblox user IDs here for unlimited credits
const DEV_IDS = new Set([
  "1682906375", // your ID from the logs
])

const DEV_USERNAMES = new Set([
  "0NBLAZE", // replace with your actual username
])

export function isDev(robloxId?: string | null, username?: string | null): boolean {
  if (robloxId && DEV_IDS.has(String(robloxId))) return true
  if (username && DEV_USERNAMES.has(username)) return true
  return false
}

export const DEV_CREDIT_BALANCE = 999_999