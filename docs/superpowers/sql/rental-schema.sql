-- Self-drive car rental admin schema.
-- Money stored in THB; IDR is display-only via rentals.fx_rate.

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  name text not null,
  type text,
  daily_rate_thb numeric not null default 0,
  deposit_thb numeric not null default 0,
  status text not null default 'available',     -- available | rented | maintenance
  photo_path text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists renters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  license_no text,
  license_photo_path text,
  origin_city text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists rentals (
  id uuid primary key default gen_random_uuid(),
  rental_number text not null unique,
  vehicle_id uuid not null references vehicles(id),
  renter_id uuid not null references renters(id),
  start_date date not null,
  end_date date not null,
  days int not null default 1,
  daily_rate_thb numeric not null default 0,
  deposit_thb numeric not null default 0,
  total_thb numeric not null default 0,
  fx_rate numeric not null default 0,
  status text not null default 'booked',         -- booked | out | returned | cancelled
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rental_handovers (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references rentals(id) on delete cascade,
  kind text not null,                            -- out | in
  odometer_km int,
  fuel_level text,                               -- full | 3-4 | 1-2 | 1-4 | empty
  oil_level text,                                -- ok | low
  signature text,                                -- PNG data-URL
  inspected_at timestamptz not null default now(),
  notes text,
  unique (rental_id, kind)
);

create table if not exists handover_media (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references rental_handovers(id) on delete cascade,
  type text not null,                            -- photo | video
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists rental_payments (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references rentals(id) on delete cascade,
  kind text not null,                            -- deposit | rental | refund
  amount_thb numeric not null default 0,
  paid_at timestamptz not null default now(),
  method text,
  note text
);

-- Private storage bucket for handover photos/videos + license photos.
insert into storage.buckets (id, name, public)
values ('rental-media', 'rental-media', false)
on conflict (id) do nothing;

-- RLS: any authenticated user may read/write rental tables. The /rental panel
-- already gates by app_metadata.role = 'rental' at the layout level; tighten
-- per-role here later if tour staff and rental staff must be DB-isolated.
alter table vehicles enable row level security;
alter table renters enable row level security;
alter table rentals enable row level security;
alter table rental_handovers enable row level security;
alter table handover_media enable row level security;
alter table rental_payments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['vehicles','renters','rentals','rental_handovers','handover_media','rental_payments']
  loop
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true);',
      t || '_authenticated_all', t
    );
  end loop;
end $$;

-- Storage policies for the rental-media bucket (authenticated read/write).
create policy "rental_media_read" on storage.objects
  for select to authenticated using (bucket_id = 'rental-media');
create policy "rental_media_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'rental-media');
