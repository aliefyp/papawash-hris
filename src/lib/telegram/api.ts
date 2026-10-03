import "server-only";

const MAX_LENGTH = 4000; // Telegram's limit is 4096

// Cuts at a line boundary so the HTML tags of each line stay balanced.
const clip = (text: string) => {
  if (text.length <= MAX_LENGTH) return text;
  return `${text.slice(0, text.lastIndexOf("\n", MAX_LENGTH))}\n…`;
};

// Without a token (local development only) calls are printed instead of sent.
export async function tg(method: string, payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[telegram:no-token]", method, JSON.stringify(payload));
      return { ok: true };
    }
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { ok: boolean; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  return json;
}

export const sendMessage = (chatId: number | string, text: string, extra: Record<string, unknown> = {}) =>
  tg("sendMessage", { chat_id: chatId, text: clip(text), parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra });

export const answerCallback = (id: string, text?: string) => tg("answerCallbackQuery", { callback_query_id: id, text });

export const editMessage = (chatId: number | string, messageId: number, text: string) =>
  tg("editMessageText", { chat_id: chatId, message_id: messageId, text: clip(text), parse_mode: "HTML", reply_markup: { inline_keyboard: [] } });
