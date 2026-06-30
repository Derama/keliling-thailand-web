-- Migration: places gallery — attractions per city with image + description,
-- used by the itinerary builder. Run once in the Supabase SQL Editor.

create table places (
  id text primary key,
  city text not null,
  name text not null,
  image_url text,
  description text,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create index places_city_idx on places (city, sort);

alter table places enable row level security;

create policy "team full access" on places
  for all to authenticated using (true) with check (true);

-- Seed with common attractions per city (add photos later in the UI).
insert into places (id, city, name, sort) values
  ('bkk-grand-palace',  'Bangkok',      'Grand Palace',              10),
  ('bkk-wat-arun',      'Bangkok',      'Wat Arun',                  20),
  ('bkk-wat-pho',       'Bangkok',      'Wat Pho',                   30),
  ('bkk-safari-world',  'Bangkok',      'Safari World',              40),
  ('bkk-iconsiam',      'Bangkok',      'ICONSIAM',                  50),
  ('bkk-chatuchak',     'Bangkok',      'Chatuchak Market',          60),
  ('pty-nong-nooch',    'Pattaya',      'Nong Nooch Garden',         110),
  ('pty-sanctuary',     'Pattaya',      'Sanctuary of Truth',        120),
  ('pty-coral-island',  'Pattaya',      'Coral Island (Koh Larn)',   130),
  ('pty-art-paradise',  'Pattaya',      'Art in Paradise',           140),
  ('ky-national-park',  'Khao Yai',     'Khao Yai National Park',    210),
  ('ky-primo-piazza',   'Khao Yai',     'Primo Piazza',              220),
  ('ky-the-bloom',      'Khao Yai',     'The Bloom Garden',          230),
  ('ayt-historical',    'Ayutthaya',    'Ayutthaya Historical Park', 310),
  ('ayt-wat-mahathat',  'Ayutthaya',    'Wat Mahathat',              320),
  ('knc-bridge-kwai',   'Kanchanaburi', 'Bridge on the River Kwai',  410),
  ('knc-erawan-falls',  'Kanchanaburi', 'Erawan Falls',              420),
  ('hh-cicada',         'Hua Hin',      'Cicada Market',             510),
  ('hh-swiss-sheep',    'Hua Hin',      'Swiss Sheep Farm',          520);
