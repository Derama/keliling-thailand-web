-- Migration: user-defined transport routes and per-fleet prices.
-- Run once in the Supabase SQL Editor.

create table if not exists custom_transport_routes (
  id uuid primary key,
  group_name text not null check (char_length(trim(group_name)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  altis_cost numeric not null default 0 check (altis_cost >= 0),
  altis_sell numeric not null default 0 check (altis_sell >= 0),
  suv_cost numeric not null default 0 check (suv_cost >= 0),
  suv_sell numeric not null default 0 check (suv_sell >= 0),
  van_cost numeric not null default 0 check (van_cost >= 0),
  van_sell numeric not null default 0 check (van_sell >= 0),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_transport_routes_sort_idx
  on custom_transport_routes (sort, created_at);

alter table custom_transport_routes enable row level security;

drop policy if exists "team full access" on custom_transport_routes;
create policy "team full access" on custom_transport_routes
  for all to authenticated using (true) with check (true);
