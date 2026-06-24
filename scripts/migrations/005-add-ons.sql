-- Migration: editable additional charges (Biaya Tambahan).
-- Run once in the Supabase SQL Editor.

create table add_ons (
  id text primary key,
  name text not null,
  price numeric,
  unit text,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

alter table add_ons enable row level security;

create policy "team full access" on add_ons
  for all to authenticated using (true) with check (true);

-- Built-in items (Extra hours, Extra bed, …) live in code (BASE_ADD_ONS).
-- This table only stores price/unit overrides for them + user-added rows.
