-- Migration: app_settings — global key/value store for admin defaults
-- (e.g. the itinerary "Info Perjalanan" tips reused across every trip).
-- Run once in the Supabase SQL Editor.

create table app_settings (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

create policy "team full access" on app_settings
  for all to authenticated using (true) with check (true);
