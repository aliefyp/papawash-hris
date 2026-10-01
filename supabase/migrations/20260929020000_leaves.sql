-- Manual leave (izin) records. Deducted leave becomes an automatic deduction item when payroll is generated.
create table leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  outlet_id uuid not null references outlets (id),
  leave_date date not null,
  minutes int not null check (minutes > 0 and minutes <= 1440),
  deducted boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
create index leaves_outlet_date_idx on leaves (outlet_id, leave_date);
create index leaves_employee_date_idx on leaves (employee_id, leave_date);

alter table leaves enable row level security;
create policy admin_all on leaves for all to authenticated using (is_admin()) with check (is_admin());
