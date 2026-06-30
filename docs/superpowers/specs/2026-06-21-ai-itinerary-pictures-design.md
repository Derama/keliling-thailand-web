# AI Itinerary — Quick Fields + Auto Pictures

Date: 2026-06-21
Branch: admin-dashboard

## Goal

When a customer asks for an itinerary, the owner generates a complete,
print-ready brochure fast from minimal input (customer name, pax, days,
destinations). The AI both writes the day-by-day plan AND attaches real
attraction photos, so the owner can reply quickly.

## Current state

- `app/api/itinerary/route.ts` — POST takes a free-text `prompt`, calls
  OpenAI (`gpt-4o-mini`) with a strict JSON schema, returns
  `{ tripTitle, notes, days[] }`. Each day has title/theme/city/route/intro/
  cityHighlight/activities. **No pictures** — places are never produced here.
- `components/admin/views/ItineraryBuilderView.tsx` — `generateWithAI()` posts
  the free-text prompt, maps the response into `ItineraryDay[]`, and hardcodes
  `places: []`. The component already loads all `places` rows from Supabase
  into the `places` state (used by the manual picker + drag-and-drop).
- `lib/admin/places.ts` — `Place { id, city, name, image_url, description, sort }`.
- `lib/admin/itinerary.ts` — `ItineraryPlace { id, name, image, desc }`,
  `ItineraryDay.places: ItineraryPlace[]`.
- `components/admin/itineraryDnD.tsx` — `MAX_DAY_PHOTOS = 4`.

## Design

### 1. Quick-generate fields (UI)

In the AI step of `ItineraryBuilderView.tsx`, add structured inputs above the
existing free-text box:

- Customer name (text)
- Pax (text, e.g. "4 dewasa")
- Days (number)
- Destinations (chips — chosen from the distinct cities present in the loaded
  `places` state, so the owner only picks cities that have photos)
- Notes (optional — the existing free-text box, relabeled)

A single "Generate" button composes a prompt string from these fields and posts
to `/api/itinerary`. The structured values are also sent as discrete fields so
the route can use them deterministically (e.g. set day count, seed customer).

Request body becomes:
```
{ prompt: string, customer?: string, pax?: string, days?: number,
  destinations?: string[] }
```
`prompt` stays backward-compatible (free-text-only still works).

On success, also prefill `customer` and `pax` in the builder from the request
so the owner does not retype them.

### 2. Server-side picture match (no hallucinated images)

`app/api/itinerary/route.ts`:

1. After auth, fetch `places` (`city, name, image_url, description`) from
   Supabase. Build a compact catalog grouped by city:
   `BANGKOK: Grand Palace | Wat Pho | ...`. Only include rows that have a
   non-null `image_url` (a card needs a photo).
2. Inject the catalog into the system prompt with an instruction: for each day,
   pick **2–3 real place names from the catalog that match that day's city**.
   Do not invent place names; only choose from the catalog. If the city has no
   catalog entries, return an empty list for that day.
3. Add `places` to the JSON schema — an array of `{ name }` (names only; the
   model cannot produce real image URLs).
4. After the model returns, resolve each chosen `name` against the fetched rows
   (case-insensitive exact match on name within the day's city, falling back to
   match across all cities). For each match emit a full card
   `{ name, image, desc }` using the row's `image_url` and `description`.
   Drop names with no match. Cap at 3 per day.
5. Return the enriched `days[]` with populated `places`.

The route owns all matching — the client receives ready-to-render cards.

### 3. Client wiring

`generateWithAI()`:
- Send the new structured fields + composed prompt.
- Map `d.places` (from the response) into `ItineraryPlace[]`, assigning `newId()`
  to each, instead of the current `places: []`. Respect `MAX_DAY_PHOTOS` (the
  route already caps at 3, leaving room for manual adds up to 4).
- Prefill `customer`/`pax` from the submitted fields.

No changes to print, drag-and-drop, picker, or types — `ItineraryPlace` already
matches what the route emits.

## Data flow

```
quick fields → compose prompt + structured body → POST /api/itinerary
  route: auth → fetch places (image_url not null) → catalog by city
       → model picks 2-3 real names per day (schema: places:[{name}])
       → resolve names → image_url + description → cards {name,image,desc}
  → response days[] with places
client: map places → ItineraryPlace[] (+ids) → render brochure with photos
```

## Error handling

- No `OPENAI_API_KEY` → existing 500 message (unchanged).
- Empty catalog (no places with photos) → generation still works; all days get
  empty `places`. The free-text/manual picker path is unaffected.
- Model returns a name not in catalog → dropped silently (no broken images).
- Supabase places fetch fails → log, proceed with empty catalog (text-only
  itinerary) rather than failing the whole request.

## Out of scope (YAGNI)

- Uploading new photos during generation.
- Fuzzy/semantic name matching beyond case-insensitive exact (catalog feeding
  makes exact match reliable).
- Per-day photo count config UI (fixed 2–3; `MAX_DAY_PHOTOS` cap = 4 unchanged).

## Testing

No automated suite in repo. Manual verification:
1. Pick destinations that have seeded photos → generate → each day shows 2–3
   real photo cards matching its city.
2. Pick a city with no photos → days generate with text only, no errors.
3. Free-text-only (no structured fields) → still generates (backward compat).
4. Generated `customer`/`pax` prefilled in builder.
5. Print → brochure renders photos as today.
