-- Migration: global yearly invoice numbering for the invoice builder.
-- The builder's customer / tour-operator invoices get a unique, sequential
-- document number INV-YYYY-NNNN, allocated the first time the invoice is saved
-- to an order. Personal invoices are throwaway and never draw from this counter.
--
-- Allocation is atomic: an upsert takes a row lock on the year's counter so two
-- concurrent saves can never receive the same number. Run once in the Supabase
-- SQL Editor. Year is Asia/Bangkok local time (the company operates in Thailand).

create table if not exists invoice_counters (
  year int primary key,
  last int not null default 0
);

-- Lock the table down: only the security-definer function (which runs as the
-- table owner and bypasses RLS) may touch it; no direct API access.
alter table invoice_counters enable row level security;

create or replace function next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Bangkok'))::int;
  n int;
begin
  insert into invoice_counters (year, last)
    values (y, 1)
    on conflict (year)
      do update set last = invoice_counters.last + 1
    returning last into n;
  return 'INV-' || y::text || '-' || lpad(n::text, 4, '0');
end $$;

-- Only expose the allocator, and only to logged-in users (matches the
-- "team full access to authenticated" policy on the rest of the schema).
revoke all on function next_invoice_number() from public;
grant execute on function next_invoice_number() to authenticated;
