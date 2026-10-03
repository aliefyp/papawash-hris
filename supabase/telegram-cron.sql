-- Jalankan SEKALI di Supabase SQL Editor (Database > Extensions: aktifkan pg_cron dan pg_net dulu bila perlu).
-- Ganti PASTE_TICK_SECRET dengan nilai TICK_SECRET yang sama persis dengan di Vercel.
-- Jangan commit berkas ini dengan rahasia yang sudah terisi.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'papawash-telegram-tick',
  '* * * * *', -- tiap menit
  $$
  select net.http_post(
    url := 'https://papawash-hris.vercel.app/api/telegram/tick',
    headers := jsonb_build_object('Authorization', 'Bearer PASTE_TICK_SECRET'),
    body := '{}'::jsonb
  );
  $$
);

-- Untuk menghentikan: select cron.unschedule('papawash-telegram-tick');
-- Untuk melihat hasil panggilan terakhir: select status_code, created from net._http_response order by created desc limit 5;
