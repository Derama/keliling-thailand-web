-- Migration: social_posts post kinds — review (default), attraction, journey.
-- `payload` holds kind-specific fields (attraction: title/location/date/hook,
-- journey: title/slide URLs). Run once in the Supabase SQL Editor.

alter table social_posts
  add column kind text not null default 'review',
  add column payload jsonb;
