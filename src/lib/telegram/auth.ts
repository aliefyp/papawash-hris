import "server-only";
import { timingSafeEqual } from "node:crypto";
import { parseOwnerIds } from "./owners";

// Constant-time string comparison for secrets.
export function safeEqual(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const ownerIds = () => parseOwnerIds(process.env.TELEGRAM_OWNER_CHAT_ID);

// Only owners' private chats are served (the chat id equals the user id there). If the variable is unset nobody is an owner.
export function isOwner(userId: number | undefined, chatId: number | undefined) {
  return userId !== undefined && String(userId) === String(chatId) && ownerIds().includes(String(userId));
}
