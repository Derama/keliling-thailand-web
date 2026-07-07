-- Rental admin upgrades (2026-07-06): T&C agreement columns + structured damage log.
-- Run manually in the Supabase SQL editor (same workflow as rental-schema.sql).

alter table rental_handovers add column if not exists terms_agreed boolean not null default false;
alter table rental_handovers add column if not exists terms_version text;

create table if not exists handover_damages (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references rental_handovers(id) on delete cascade,
  panel text not null,
  severity text not null,        -- lecet | penyok | pecah
  note text,
  photo_path text,               -- rental-media bucket
  created_at timestamptz not null default now()
);

alter table handover_damages enable row level security;
do $$
begin
  create policy handover_damages_authenticated_all on handover_damages
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;
