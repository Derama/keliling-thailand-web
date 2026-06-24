-- Migration: per-order builder drafts. Each order can have one of each kind of
-- rich document (itinerary, invoice, brochure, job order). The builder views
-- read/write the `data` JSONB here instead of a single shared localStorage key,
-- so a document is tied to its order and survives across devices.
-- Run once in the Supabase SQL Editor.

create table if not exists order_documents (
  order_id   uuid not null references orders(id) on delete cascade,
  kind       text not null,          -- itinerary | invoice | brochure | joborder
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (order_id, kind)
);

alter table order_documents enable row level security;

drop policy if exists "team full access" on order_documents;
create policy "team full access" on order_documents
  for all to authenticated using (true) with check (true);
