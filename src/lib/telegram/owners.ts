// TELEGRAM_OWNER_CHAT_ID holds one or more Telegram IDs separated by commas: "123456789,987654321".
export function parseOwnerIds(raw: string | undefined): string[] {
  return [...new Set((raw ?? "").split(",").map((s) => s.trim()).filter((s) => /^-?\d+$/.test(s)))];
}
