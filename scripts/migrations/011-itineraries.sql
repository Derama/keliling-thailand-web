-- Migration: standalone itinerary library. Saved itineraries that are NOT tied
-- to an order — the admin builds, names, and reopens them from the "Itinerary"
-- tab. `data` holds the full builder draft (same shape stored per-order in
-- order_documents). Run once in the Supabase SQL Editor.

create table if not exists itineraries (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table itineraries enable row level security;

drop policy if exists "team full access" on itineraries;
create policy "team full access" on itineraries
  for all to authenticated using (true) with check (true);
