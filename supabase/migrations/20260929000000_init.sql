-- Papawash HRIS: initial schema (stage 1)
-- Money is stored as integer rupiah (bigint). Times are timestamptz (UTC); display in Asia/Jakarta.

create extension if not exists pgcrypto;

-- Owners with dashboard access. Anyone else who signs up gets no data (see is_admin()).
create table admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create table outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id),
  name text not null,
  base_salary bigint not null default 0 check (base_salary >= 0),
  overtime_rate_per_hour bigint not null default 0 check (overtime_rate_per_hour >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index employees_outlet_idx on employees (outlet_id);

-- Store phones. Only the SHA-256 hash of the device token is kept.
create table devices (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id),
  label text,
  token_hash text unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  pairing_code_hash text unique,
  pairing_expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index devices_outlet_idx on devices (outlet_id);

create table attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  outlet_id uuid not null references outlets (id),
  device_id uuid references devices (id),
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  clock_in_photo text,
  clock_out_photo text,
  status text not null default 'ok' check (status in ('ok', 'perlu_koreksi', 'dikoreksi')),
  corrected_by uuid references auth.users (id),
  corrected_at timestamptz,
  correction_note text,
  created_at timestamptz not null default now(),
  check (clock_out_at is null or clock_out_at > clock_in_at)
);
create index attendance_employee_in_idx on attendance_sessions (employee_id, clock_in_at);
create index attendance_outlet_in_idx on attendance_sessions (outlet_id, clock_in_at);
-- At most one open session per employee.
create unique index attendance_one_open_per_employee
  on attendance_sessions (employee_id) where clock_out_at is null;

create table payroll_periods (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id),
  month date not null check (month = date_trunc('month', month)::date),
  status text not null default 'draft' check (status in ('draft', 'final')),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (outlet_id, month)
);

create table payslips (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references payroll_periods (id) on delete cascade,
  employee_id uuid not null references employees (id),
  employee_name text not null,
  total_earnings bigint not null default 0,
  total_deductions bigint not null default 0,
  net_pay bigint not null default 0,
  share_token_hash text unique,
  share_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (period_id, employee_id)
);

create table payslip_items (
  id uuid primary key default gen_random_uuid(),
  payslip_id uuid not null references payslips (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('earning', 'deduction')),
  amount bigint not null check (amount >= 0),
  source text not null default 'manual' check (source in ('auto', 'manual')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index payslip_items_payslip_idx on payslip_items (payslip_id);

create table loans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  total_amount bigint not null check (total_amount > 0),
  monthly_installment bigint not null check (monthly_installment > 0),
  remaining bigint not null check (remaining >= 0),
  note text,
  created_at timestamptz not null default now()
);
create index loans_employee_idx on loans (employee_id);

-- Row Level Security: dashboard tables are readable/writable only by admins.
-- Device attendance endpoints use the server-side service role and bypass RLS.
alter table admins enable row level security;
alter table outlets enable row level security;
alter table employees enable row level security;
alter table devices enable row level security;
alter table attendance_sessions enable row level security;
alter table payroll_periods enable row level security;
alter table payslips enable row level security;
alter table payslip_items enable row level security;
alter table loans enable row level security;

create policy admins_self on admins for select to authenticated using (user_id = auth.uid());

create policy admin_all on outlets for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on employees for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on devices for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on attendance_sessions for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on payroll_periods for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on payslips for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on payslip_items for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on loans for all to authenticated using (is_admin()) with check (is_admin());

-- Private bucket for selfies; only admins can read (via signed URLs). Uploads happen server-side.
insert into storage.buckets (id, name, public) values ('attendance-photos', 'attendance-photos', false)
  on conflict (id) do nothing;

create policy admin_read_photos on storage.objects for select to authenticated
  using (bucket_id = 'attendance-photos' and is_admin());
