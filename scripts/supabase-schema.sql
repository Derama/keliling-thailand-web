-- Keliling Thailand admin dashboard schema.
-- Run once in the Supabase SQL Editor.

create type order_status as enum
  ('inquiry', 'confirmed', 'ongoing', 'completed', 'cancelled');
create type invoice_type as enum ('deposit', 'balance', 'full');

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  origin_city text,
  notes text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references customers (id),
  status order_status not null default 'inquiry',
  trip_start date,
  trip_end date,
  pax int,
  pickup_location text,
  vehicle text,
  driver_name text,
  itinerary text,
  price_idr numeric not null default 0,
  cost_thb numeric not null default 0,
  fx_rate numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  amount_idr numeric not null,
  paid_at date not null,
  method text,
  note text
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  order_id uuid not null references orders (id) on delete cascade,
  type invoice_type not null,
  amount_idr numeric not null,
  line_items jsonb not null default '[]',
  issued_at date not null default current_date
);

create index orders_trip_start_idx on orders (trip_start);
create index payments_order_id_idx on payments (order_id);
create index invoices_order_id_idx on invoices (order_id);

-- Keep updated_at fresh.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- RLS: full access for any authenticated team member, nothing for anon.
alter table customers enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table invoices enable row level security;

create policy "team full access" on customers
  for all to authenticated using (true) with check (true);
create policy "team full access" on orders
  for all to authenticated using (true) with check (true);
create policy "team full access" on payments
  for all to authenticated using (true) with check (true);
create policy "team full access" on invoices
  for all to authenticated using (true) with check (true);
