# Itinerary Library + AI Edit-in-Place — Design

**Date:** 2026-06-28
**Branch:** admin-dashboard

## Problem

The admin "Itinerary" tab holds a single localStorage draft. There is no way to
save multiple named itineraries and reopen them later. The AI button rebuilds
the whole itinerary from scratch, discarding manual edits — there is no way to
refine an existing itinerary with a prompt.

## Goals

1. **Library** — a named list of saved itineraries, independent of orders, that
   can be opened, duplicated, and deleted.
2. **AI edit-in-place** — a prompt that changes only what is asked and preserves
   every other day and manual edit.

Per-order itinerary flow (`/orders/[id]/itinerary`) stays unchanged.

## Architecture

### 1. Table `itineraries` (migration `011-itineraries.sql`)

```sql
create table if not exists itineraries (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table itineraries enable row level security;
create policy "team full access" on itineraries
  for all to authenticated using (true) with check (true);
```

`data` holds the full builder `Draft` (tripTitle, customer, pax, startDate,
notes, vehicle, heroImage, galleryImages, travelTips, showTravelTips, days).

### 2. `lib/admin/itineraryLibrary.ts`

- `listItineraries()` → `{ id, title, data, updated_at }[]` ordered by
  `updated_at desc`. (data needed for the list's auto-fallback label.)
- `loadItinerary(id)` → `{ title, data } | null`.
- `createItinerary(title, data)` → `id`.
- `saveItinerary(id, title, data)` → upsert by id, bump `updated_at`.
- `deleteItinerary(id)`.

### 3. `ItineraryLibraryView` (new) — replaces the tab's direct builder

Tab SPA, no sub-routes. Internal state `mode: "list" | { id }`.

- **List view:** one row per saved itinerary showing the title (fallback:
  `tripTitle · customer · startDate` when title blank), day count, last-saved
  time. Row actions: Open, Duplicate, Delete. Header button `+ Itinerary baru`
  (creates a row, opens builder). Empty state explains the library.
- **Builder view:** renders `<ItineraryBuilderView libraryId={id}
  onExit={backToList} />`.

Registered in `app/admin/(panel)/page.tsx` at the existing `itinerary` tab slot
(line 40) in place of `ItineraryBuilderView`.

### 4. `ItineraryBuilderView` changes (additive)

- New optional props `libraryId?: string`, `onExit?: () => void`.
- Persistence precedence in hydrate + autosave: `orderId` (unchanged) →
  `libraryId` (new `itineraries` table) → `localStorage` (legacy fallback).
- **Title field**: a manual name input, surfaced only in library mode; the
  library list uses it (auto-fallback when blank). Title is part of the saved
  payload via `saveItinerary`.
- `← Daftar itinerary` back button rendered when `onExit` is set.

### 5. AI edit-in-place — `app/api/itinerary/edit/route.ts`

- Auth gate identical to `/api/itinerary` (authenticated admin only).
- Body: `{ current, instruction }`. `current` is the full itinerary **with
  ids** (days, activities, places carry their `id`).
- JSON-schema structured output mirrors the generate route **plus** `id` fields
  on day / activity / place objects.
- System prompt: apply ONLY the requested change; keep every other day,
  activity, place, id, and text identical; return the full updated itinerary in
  Bahasa Indonesia.
- Server re-resolves place images from the `places` catalog by name (the model
  does not know image URLs), reusing `resolveGeneratedPlaces`-style matching so
  existing photos survive.

**Builder wiring:** a new "Ubah dengan AI" prompt box, shown once `days.length >
0`, separate from the Generate box. On submit it posts current state to the edit
route and merges the response **by id**: unchanged days/activities/places keep
their identity (so manual edits and uploaded photos survive); only items the AI
changed are updated; new places get images resolved server-side by name.

## Data flow

```
List (itineraries table) ──open──▶ Builder(libraryId)
        ▲                              │ autosave (debounced) ──▶ saveItinerary
        └──────── onExit ──────────────┘

Generate (full rebuild)  ─▶ /api/itinerary       ─▶ setDays (replace)
Ubah dengan AI (refine)  ─▶ /api/itinerary/edit  ─▶ merge by id (preserve rest)
```

## Out of scope

- Migrating the existing localStorage draft into the library (kept only as a
  fallback path).
- Linking library itineraries to orders.
- Brochure / invoice / job-order builders.

## Testing

- Manual: create → save → reopen reflects saved state; duplicate; delete.
- AI edit: generate a 3-day trip, manually edit a day, run "tambah satu kuil di
  hari 2" — only day 2 changes, other days + the manual edit intact.
- Build passes `npm run build`.
