-- Rent Tracker schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

-- Tenants / units
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_address text not null,
  monthly_rent numeric(10, 2) not null check (monthly_rent > 0),
  due_day integer not null check (due_day >= 1 and due_day <= 31),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Payments linked to tenants
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  paid_on date not null default current_date,
  status text not null check (status in ('Paid', 'Partial')),
  created_at timestamptz not null default now()
);

-- Expenses linked to tenants (repairs, fees, etc.)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  description text not null,
  incurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists payments_tenant_id_idx on public.payments (tenant_id);
create index if not exists payments_paid_on_idx on public.payments (paid_on);
create index if not exists expenses_tenant_id_idx on public.expenses (tenant_id);
create index if not exists expenses_incurred_on_idx on public.expenses (incurred_on);
create index if not exists tenants_archived_idx on public.tenants (archived);

-- Single-user v1: permissive RLS so the anon key can read/write everything.
-- Do not use this pattern if the project URL/key will be shared publicly beyond yourself.
alter table public.tenants enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "anon_all_tenants" on public.tenants;
create policy "anon_all_tenants"
  on public.tenants
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "anon_all_payments" on public.payments;
create policy "anon_all_payments"
  on public.payments
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "anon_all_expenses" on public.expenses;
create policy "anon_all_expenses"
  on public.expenses
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- --- Migration for existing projects (safe to re-run) ---
alter table public.tenants
  add column if not exists archived boolean not null default false;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  description text not null,
  incurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists expenses_tenant_id_idx on public.expenses (tenant_id);
create index if not exists expenses_incurred_on_idx on public.expenses (incurred_on);

alter table public.expenses enable row level security;

drop policy if exists "anon_all_expenses" on public.expenses;
create policy "anon_all_expenses"
  on public.expenses
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Refresh PostgREST schema cache so new columns/tables are visible immediately
notify pgrst, 'reload schema';
