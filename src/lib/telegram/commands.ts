import "server-only";
import { loadMonthRecap } from "@/lib/attendance-month";
import { fmtShortDate, todayWib } from "@/lib/format";
import { adminClient } from "@/lib/supabase/admin";
import { answerCallback, editMessage, sendMessage } from "./api";
import { isOwner } from "./auth";
import { activeEmployees, appUrl, isMonthLocked, sessionsForStatus } from "./data";
import {
  helpMessage,
  izinErrorMessage,
  izinSavedMessage,
  izinUsage,
  rekapMessage,
  statusMessage,
  unknownOwnerMessage,
} from "./messages";
import { parseIzin } from "./parse-izin";
import { parseRekapMonth } from "./parse-rekap";
import { fmtLeave } from "@/lib/leave";

type TgUser = { id: number };
type TgChat = { id: number };
export type Update = {
  update_id: number;
  message?: { message_id: number; text?: string; from?: TgUser; chat: TgChat };
  callback_query?: { id: string; data?: string; from: TgUser; message?: { message_id: number; chat: TgChat } };
};

export async function handleUpdate(update: Update) {
  if (update.callback_query) return handleCallback(update.callback_query);

  const msg = update.message;
  if (!msg?.text) return;
  const chatId = msg.chat.id;
  const [rawCommand, ...words] = msg.text.trim().split(/\s+/);
  const command = rawCommand.toLowerCase().replace(/@\w+$/, "");

  if (!isOwner(msg.from?.id, chatId)) {
    // Anyone else only gets their own ID back, so the owner can copy it into the settings.
    if (command === "/start") await sendMessage(chatId, unknownOwnerMessage(msg.from?.id ?? chatId));
    return;
  }

  const args = words.join(" ");
  switch (command) {
    case "/start":
    case "/help":
      return void (await sendMessage(chatId, helpMessage()));
    case "/status":
      return void (await sendMessage(chatId, await buildStatus()));
    case "/rekap":
      return void (await sendMessage(chatId, await buildRekap(args)));
    case "/izin":
      return void (await handleIzin(chatId, args));
    default:
      return void (await sendMessage(chatId, helpMessage()));
  }
}

async function buildStatus() {
  const now = new Date();
  const [employees, sessions] = await Promise.all([activeEmployees(), sessionsForStatus(todayWib(), now)]);
  return statusMessage({ now: now.toISOString(), employees, sessions });
}

async function buildRekap(arg: string) {
  const parsed = parseRekapMonth(arg, todayWib().slice(0, 7));
  if (!parsed.ok) return "⚠️ Bulan tidak dikenali. Contoh: /rekap, /rekap bulan lalu, atau /rekap 2026-09";
  const recap = await loadMonthRecap(parsed.month, adminClient());
  return rekapMessage(recap, parsed.month, appUrl());
}

async function handleIzin(chatId: number, args: string) {
  const employees = await activeEmployees();
  if (!employees.length) return void (await sendMessage(chatId, "Belum ada karyawan aktif."));
  if (!args.trim()) return void (await sendMessage(chatId, izinUsage()));

  const parsed = parseIzin(args, employees, todayWib());
  if (!parsed.ok) return void (await sendMessage(chatId, izinErrorMessage(parsed)));

  const outletId = employees.find((e) => e.id === parsed.employee.id)!.outlet_id;
  const { data, error } = await adminClient()
    .from("leaves")
    .insert({
      employee_id: parsed.employee.id,
      outlet_id: outletId,
      leave_date: parsed.date,
      minutes: parsed.minutes,
      deducted: parsed.deducted,
      note: parsed.note ? `${parsed.note} (via Telegram)` : "Dicatat via Telegram",
    })
    .select("id")
    .single();
  if (error || !data) {
    const missing = error?.code === "PGRST205" || error?.code === "42P01";
    return void (await sendMessage(chatId, missing ? "⚠️ Tabel izin belum dibuat di database." : "⚠️ Gagal menyimpan izin. Coba lagi."));
  }

  const locked = await isMonthLocked(outletId, parsed.date);
  await sendMessage(
    chatId,
    izinSavedMessage({ name: parsed.employee.name, date: parsed.date, minutes: parsed.minutes, deducted: parsed.deducted, locked }),
    { reply_markup: { inline_keyboard: [[{ text: "↩️ Batalkan", callback_data: `undo:${data.id}` }]] } },
  );
}

async function handleCallback(cb: NonNullable<Update["callback_query"]>) {
  if (!isOwner(cb.from.id, cb.message?.chat.id)) return void (await answerCallback(cb.id));
  const [action, id] = (cb.data ?? "").split(":");
  if (action !== "undo" || !id) return void (await answerCallback(cb.id));

  const db = adminClient();
  const { data: leave } = await db.from("leaves").select("leave_date, minutes, employees(name)").eq("id", id).maybeSingle();
  if (!leave) return void (await answerCallback(cb.id, "Sudah dibatalkan."));

  const { error } = await db.from("leaves").delete().eq("id", id);
  if (error) return void (await answerCallback(cb.id, "Gagal membatalkan. Coba lagi."));

  const name = (leave.employees as unknown as { name: string } | null)?.name ?? "?";
  await answerCallback(cb.id, "Dibatalkan.");
  if (cb.message) {
    await editMessage(cb.message.chat.id, cb.message.message_id, `↩️ Dibatalkan: ${name} · ${fmtShortDate(`${leave.leave_date}T12:00:00+07:00`)} · ${fmtLeave(leave.minutes)}`);
  }
}
