-- Self-contained saved-document library setup. This creates the table in
-- environments where migration 012 was not applied, and safely extends an
-- existing table to brochures without deleting invoice/job-order rows.

create table if not exists document_templates (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,
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

alter table document_templates
  drop constraint if exists document_templates_kind_check;

alter table document_templates
  add constraint document_templates_kind_check
  check (kind in ('invoice', 'joborder', 'brochure'));
