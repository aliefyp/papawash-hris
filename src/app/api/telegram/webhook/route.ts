import { sendMessage } from "@/lib/telegram/api";
import { safeEqual } from "@/lib/telegram/auth";
import { handleUpdate, type Update } from "@/lib/telegram/commands";
import { claim } from "@/lib/telegram/data";

// Telegram posts every message here. Answers 200 quickly even when something fails (a non-200 makes Telegram
// retry the same update again and again); failures are logged and reported to the owner instead.
export async function POST(req: Request) {
  if (!safeEqual(req.headers.get("x-telegram-bot-api-secret-token"), process.env.TELEGRAM_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return new Response("ok");
  }

  try {
    // Telegram may deliver the same update twice; handle each update_id once.
    if (!(await claim(`update:${update.update_id}`))) return new Response("ok");
    await handleUpdate(update);
  } catch (e) {
    console.error("telegram webhook failed", e);
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId) await sendMessage(chatId, "⚠️ Terjadi kesalahan. Coba lagi sebentar lagi.").catch(() => {});
  }
  return new Response("ok");
}

export const dynamic = "force-dynamic";
