-- Migration: sales leads CRM. A lead is a prospective customer captured from
-- any channel (Instagram, WhatsApp, Facebook, TikTok, website) and tracked
-- through a funnel. When won (stage = closed), a lead can be converted into an
-- order; `order_id` links the two. Run once in the Supabase SQL Editor.

create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  name              text not null default '',
  channel           text not null default 'other'
                      check (channel in ('instagram','whatsapp','facebook','tiktok','website','other')),
  handle            text,
  phone             text,
  stage             text not null default 'outreach'
                      check (stage in ('outreach','in_contact','interested','not_interested','closed')),
  note              text,
  est_value_idr     numeric not null default 0,
  order_id          uuid references orders(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_contacted_at timestamptz
);

create index if not exists leads_stage_idx on leads (stage, updated_at desc);

alter table leads enable row level security;
drop policy if exists "team full access" on leads;
create policy "team full access" on leads
  for all to authenticated using (true) with check (true);
