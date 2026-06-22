-- Migration: atomic document numbering for orders & invoices.
-- Replaces the client-side count-then-insert (race-prone: two concurrent
-- creates could compute the same number and the 2nd insert would fail the
-- UNIQUE constraint). A BEFORE INSERT trigger now assigns the number inside the
-- insert, serialized with a transaction-scoped advisory lock so concurrent
-- inserts queue instead of colliding. Run once in the Supabase SQL Editor.
--
-- Numbering matches lib/admin/utils.ts buildDocNumber():
--   orders   -> KT-YYMM-NN
--   invoices -> KT-INV-YYMM-NN
-- Month is Asia/Bangkok local time (the company operates in Thailand), so the
-- monthly counter rolls over on the same calendar boundary the UI shows.

create or replace function assign_order_number()
returns trigger language plpgsql as $$
declare
  yymm   text := to_char(now() at time zone 'Asia/Bangkok', 'YYMM');
  prefix text := 'KT-' || yymm || '-';
  n      int;
begin
  if new.order_number is null or new.order_number = '' then
    -- Serialize numbering for this prefix; released at transaction end.
    perform pg_advisory_xact_lock(hashtext('order_number:' || prefix));
    select count(*) into n from orders where order_number like prefix || '%';
    new.order_number := prefix || lpad((n + 1)::text, 2, '0');
  end if;
  return new;
end $$;

create or replace function assign_invoice_number()
returns trigger language plpgsql as $$
declare
  yymm   text := to_char(now() at time zone 'Asia/Bangkok', 'YYMM');
  prefix text := 'KT-INV-' || yymm || '-';
  n      int;
begin
  if new.invoice_number is null or new.invoice_number = '' then
    perform pg_advisory_xact_lock(hashtext('invoice_number:' || prefix));
    select count(*) into n from invoices where invoice_number like prefix || '%';
    new.invoice_number := prefix || lpad((n + 1)::text, 2, '0');
  end if;
  return new;
end $$;

create trigger orders_assign_number
  before insert on orders
  for each row execute function assign_order_number();

create trigger invoices_assign_number
  before insert on invoices
  for each row execute function assign_invoice_number();
