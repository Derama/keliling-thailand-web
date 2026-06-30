-- Migration: social_posts — gallery of generated Instagram review posts,
-- plus the public "social-posts" storage bucket the studio uploads to.
-- Run this SQL once in the Supabase SQL Editor.

-- Public storage bucket (holds guest photos, exported posts, brand logos).
insert into storage.buckets (id, name, public)
values ('social-posts', 'social-posts', true)
on conflict (id) do nothing;

-- Storage policies: team can write, anyone can read (bucket is public).
create policy "social-posts team write" on storage.objects
  for insert to authenticated with check (bucket_id = 'social-posts');

create policy "social-posts team update" on storage.objects
  for update to authenticated using (bucket_id = 'social-posts');

create policy "social-posts public read" on storage.objects
  for select to public using (bucket_id = 'social-posts');

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
