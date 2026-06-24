-- Migration: base admin schema — customers, orders, invoices, payments.
-- These are the core tables the admin dashboard reads/writes. Later migrations
-- (006 last_printed_at, 007 doc-numbering) ALTER `orders`/`invoices` and assume
-- these already exist, so run this FIRST. Run once in the Supabase SQL Editor.

create extension if not exists pgcrypto;  -- for gen_random_uuid()

-- Customers -----------------------------------------------------------------
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  origin_city text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Orders --------------------------------------------------------------------
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text unique,                        -- assigned by trigger (007)
  customer_id     uuid not null references customers(id) on delete restrict,
  status          text not null default 'inquiry',
  trip_start      date,
  trip_end        date,
  pax             int,
  pickup_location text,
  vehicle         text,
  driver_name     text,
  itinerary       text,
  price_idr       numeric not null default 0,
  cost_thb        numeric not null default 0,
  fx_rate         numeric not null default 0,
  notes           text,
  last_printed_at timestamptz,                         -- also added by 006 (idempotent)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists orders_customer_id_idx on orders(customer_id);
create index if not exists orders_status_idx       on orders(status);

-- Keep updated_at fresh on every UPDATE.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- Invoices ------------------------------------------------------------------
create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text unique,                          -- assigned by trigger (007)
  order_id       uuid not null references orders(id) on delete cascade,
  type           text not null,                        -- deposit | balance | full
  amount_idr     numeric not null default 0,
  line_items     jsonb not null default '[]'::jsonb,
  issued_at      timestamptz not null default now()
);

create index if not exists invoices_order_id_idx on invoices(order_id);

-- Payments ------------------------------------------------------------------
create table if not exists payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  amount_idr numeric not null default 0,
  paid_at    date not null default current_date,
  method     text,
  note       text
);

create index if not exists payments_order_id_idx on payments(order_id);

-- Row-level security: logged-in team has full access; anon (public site) none.
alter table customers enable row level security;
alter table orders    enable row level security;
alter table invoices  enable row level security;
alter table payments  enable row level security;

drop policy if exists "team full access" on customers;
create policy "team full access" on customers
  for all to authenticated using (true) with check (true);

drop policy if exists "team full access" on orders;
create policy "team full access" on orders
  for all to authenticated using (true) with check (true);

drop policy if exists "team full access" on invoices;
create policy "team full access" on invoices
  for all to authenticated using (true) with check (true);

drop policy if exists "team full access" on payments;
create policy "team full access" on payments
  for all to authenticated using (true) with check (true);
