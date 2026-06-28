-- Migration: generic saved-document templates for invoice + job order. These
-- are reusable starting points an admin can pick when building an order's
-- document. The itinerary library uses its own `itineraries` table; this table
-- covers the two kinds that previously had no library. `data` holds the full
-- builder draft (same shape stored per-order in order_documents).
-- `order_number` records which order spawned the mirror, for provenance.
-- Run once in the Supabase SQL Editor.

create table if not exists document_templates (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('invoice','joborder')),
  title        text not null default '',
  data         jsonb not null default '{}'::jsonb,
  order_number text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists document_templates_kind_idx
  on document_templates (kind, updated_at desc);

alter table document_templates enable row level security;

drop policy if exists "team full access" on document_templates;
create policy "team full access" on document_templates
  for all to authenticated using (true) with check (true);
