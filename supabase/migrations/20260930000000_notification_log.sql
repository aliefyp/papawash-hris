-- Dedupe log for the Telegram bot: one row per message already sent (or Telegram update already handled).
-- No policies on purpose: only the server (service role) reads or writes it.
create table notification_log (
  key text primary key,
  sent_at timestamptz not null default now()
);
alter table notification_log enable row level security;
