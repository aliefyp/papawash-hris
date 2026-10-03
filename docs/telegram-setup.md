# Setup bot Telegram (owner)

Rancangan: lihat bagian "Bot Telegram" di `docs/design.md`. Jangan tempel token atau kunci apa pun di chat; masukkan lewat terminal.

## 1. Buat bot
1. Di Telegram buka **@BotFather** → `/newbot` → isi nama (mis. "Papawash") dan username (berakhiran `bot`).
2. Salin **token** yang diberikan. Simpan rapi, ini kunci bot Anda.

## 2. Siapkan variabel
Buat dua kunci acak dulu:
```bash
openssl rand -hex 32   # untuk TELEGRAM_WEBHOOK_SECRET
openssl rand -hex 32   # untuk TICK_SECRET
```
Isi di **Vercel** (tiap perintah akan meminta nilainya; tandai sensitif):
```bash
vercel env add TELEGRAM_BOT_TOKEN production
vercel env add TELEGRAM_WEBHOOK_SECRET production
vercel env add TICK_SECRET production
```
Isi juga `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_WEBHOOK_SECRET` di `.env.local` (dipakai skrip webhook).

## 3. Migration database
Jalankan `supabase/migrations/20260930000000_notification_log.sql` di Supabase SQL Editor.

## 4. Deploy lalu pasang webhook
```bash
vercel --prod
node --env-file=.env.local scripts/telegram-set-webhook.mjs https://papawash-hris.vercel.app
```
Hasilnya harus menampilkan alamat webhook dan "error terakhir: -".

## 5. Daftarkan akun Anda sebagai owner
1. Buka bot Anda di Telegram dan tekan **/start**. Bot membalas "Telegram ID Anda: 123456789".
2. `vercel env add TELEGRAM_OWNER_CHAT_ID production` (isi angka itu), lalu `vercel --prod` lagi.
   Untuk **lebih dari satu owner**, tiap orang menekan /start di bot untuk mendapat ID-nya, lalu semua ID diisi dipisah koma, mis. `123456789,987654321`. Masing-masing menerima semua pesan terjadwal dan bisa memakai semua perintah.
3. Tekan **/start** lagi: sekarang bot membalas daftar perintah. Coba `/status`.

## 6. Jadwal tiap menit
1. Supabase → Database → Extensions: aktifkan **pg_cron** dan **pg_net**.
2. Buka `supabase/telegram-cron.sql`, ganti `PASTE_TICK_SECRET` dengan nilai `TICK_SECRET`, jalankan di SQL Editor.
3. Cek: `select status_code, created from net._http_response order by created desc limit 5;` (kode 200 berarti jalan).

## Uji tanpa mengirim pesan
```bash
curl -s -H "Authorization: Bearer <TICK_SECRET>" "https://papawash-hris.vercel.app/api/telegram/tick?dry=1&now=2026-10-01T14:30:00Z"
```
`now` memakai waktu UTC (21:30 WIB = 14:30Z). Hasilnya menampilkan pesan yang *akan* dikirim.

## Jadwal dan aturannya
| Waktu (WIB) | Pesan |
|---|---|
| 07:05 | Peringatan jika belum ada satu pun absen masuk hari itu |
| 21:30 | Ringkasan harian |
| Hari terakhir bulan, 09:00 | Pengingat payroll (tidak dikirim jika payroll bulan itu sudah terkunci) |

Pesan yang terlewat karena tick terlambat tetap dikirim dalam 30 menit, setelah itu dilewati. Tiap pesan hanya terkirim sekali (tabel `notification_log`).
