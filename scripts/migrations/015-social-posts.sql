-- Migration: social_posts — gallery of generated Instagram review posts.
-- Also create a PUBLIC storage bucket named "social-posts" in the Supabase
-- dashboard (Storage → New bucket → name "social-posts", Public = on).
-- Run this SQL once in the Supabase SQL Editor.

create table social_posts (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,        -- exported PNG (public URL)
  photo_url text,                 -- source guest photo (public URL)
  review_text text,
  customer_name text,
  city text,
  destination text,
  rating int,
  caption text,
  template text,
  format text,
  created_at timestamptz not null default now()
);

alter table social_posts enable row level security;

create policy "team full access" on social_posts
  for all to authenticated using (true) with check (true);
