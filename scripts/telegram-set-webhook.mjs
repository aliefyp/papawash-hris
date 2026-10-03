// Points the Telegram bot at the app and sets the command menu. Run once after deploying (and again if the URL changes):
//   node --env-file=.env.local scripts/telegram-set-webhook.mjs https://papawash-hris.vercel.app
// Needs TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in .env.local (the same values as in Vercel).
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!token || !secret || !base.startsWith("https://")) {
  console.error("Pakai: node --env-file=.env.local scripts/telegram-set-webhook.mjs https://alamat-aplikasi\nDan isi TELEGRAM_BOT_TOKEN + TELEGRAM_WEBHOOK_SECRET di .env.local.");
  process.exit(1);
}

const call = async (method, body) => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
};

await call("setWebhook", {
  url: `${base}/api/telegram/webhook`,
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
});
await call("setMyCommands", {
  commands: [
    { command: "status", description: "Siapa yang di toko sekarang" },
    { command: "rekap", description: "Rekap bulan ini (atau: bulan lalu, 2026-09)" },
    { command: "izin", description: "Catat izin karyawan" },
    { command: "help", description: "Bantuan" },
  ],
});
const info = await call("getWebhookInfo");
console.log("Webhook aktif:", info.url);
console.log("Menunggu:", info.pending_update_count, "| error terakhir:", info.last_error_message ?? "-");
