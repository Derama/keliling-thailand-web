-- Migration: editable attraction ticket prices.
-- Run once in the Supabase SQL Editor.

create table attraction_rates (
  id text primary key,
  city text not null,
  name text not null,
  price numeric,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

alter table attraction_rates enable row level security;

create policy "team full access" on attraction_rates
  for all to authenticated using (true) with check (true);

insert into attraction_rates (id, city, name, price, sort) values
  ('bkk-grand-palace',  'Bangkok',      'Grand Palace',              null, 10),
  ('bkk-wat-arun',      'Bangkok',      'Wat Arun',                  null, 20),
  ('bkk-safari-world',  'Bangkok',      'Safari World',              null, 30),
  ('bkk-iconsiam',      'Bangkok',      'ICONSIAM',                  null, 40),
  ('pty-nong-nooch',    'Pattaya',      'Nong Nooch Garden',         null, 110),
  ('pty-sanctuary',     'Pattaya',      'Sanctuary of Truth',        null, 120),
  ('pty-coral-island',  'Pattaya',      'Coral Island',              null, 130),
  ('ky-national-park',  'Khao Yai',     'Khao Yai National Park',    null, 210),
  ('ky-primo-piazza',   'Khao Yai',     'Primo Piazza',              null, 220),
  ('ayt-park',          'Ayutthaya',    'Ayutthaya Historical Park', null, 310),
  ('knc-bridge-kwai',   'Kanchanaburi', 'Bridge on the River Kwai',  null, 410),
  ('knc-erawan-falls',  'Kanchanaburi', 'Erawan Falls',              null, 420);
