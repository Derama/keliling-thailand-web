-- Migration: editable hotel capital prices (fluctuate by season).
-- Run once in the Supabase SQL Editor.

create table hotel_rates (
  id text primary key,
  city text not null,
  name text not null,
  capital numeric not null default 0,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

alter table hotel_rates enable row level security;

create policy "team full access" on hotel_rates
  for all to authenticated using (true) with check (true);

insert into hotel_rates (id, city, name, capital, sort) values
  ('bkk-madison',        'Bangkok',  'Madison',               750,  10),
  ('bkk-with-almas',     'Bangkok',  'With / Almas',          850,  20),
  ('bkk-ten-star',       'Bangkok',  'Ten Star',              1050, 30),
  ('bkk-best-western',   'Bangkok',  'Best Western',          1200, 40),
  ('bkk-panarai',        'Bangkok',  'Panarai',               1200, 50),
  ('bkk-my-hotel',       'Bangkok',  'My Hotel',              1400, 60),
  ('bkk-pure-eleven',    'Bangkok',  'Pure Eleven',           1700, 70),
  ('bkk-centara-water',  'Bangkok',  'Centara Water',         2400, 80),
  ('bkk-berkley',        'Bangkok',  'Berkley',               2600, 90),
  ('pty-embryo',         'Pattaya',  'Embryo',                900,  110),
  ('pty-embryo-peak',    'Pattaya',  'Embryo (peak season)',  1200, 120),
  ('pty-beston',         'Pattaya',  'Beston',                1000, 130),
  ('ky-the-pino',        'Khao Yai', 'The Pino',              1400, 210),
  ('ky-fortune',         'Khao Yai', 'Fortune Courtyard',     1800, 220);
