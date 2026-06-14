-- Migration: add editable margin to hotels and attractions.
-- Final price to customer = capital + margin. Run once in the SQL Editor.

alter table hotel_rates add column if not exists margin numeric not null default 250;
alter table attraction_rates add column if not exists margin numeric not null default 0;
