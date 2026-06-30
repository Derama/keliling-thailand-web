-- Migration: editable transport route capital and selling prices.
-- Run once in the Supabase SQL Editor.

create table if not exists transport_rates (
  id text primary key,
  service_id text not null,
  fleet text not null check (fleet in ('altis', 'suv', 'van')),
  cost numeric not null default 0,
  sell numeric not null default 0,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

alter table transport_rates enable row level security;

drop policy if exists "team full access" on transport_rates;
create policy "team full access" on transport_rates
  for all to authenticated using (true) with check (true);
