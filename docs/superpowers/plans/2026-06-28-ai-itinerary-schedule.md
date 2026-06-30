# Descriptive AI Itinerary Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a realistic, editable itinerary from a free-form request while preserving every named destination and giving each stop an AI-selected time and descriptive Indonesian activity text.

**Architecture:** Keep the existing authenticated Next.js Route Handler and single structured OpenAI request. Extract catalog enrichment into a pure helper, make the existing schedule merger apply AI times to visual places and retain unmatched requested stops, then have the builder use that merger when mapping the API response.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, OpenAI structured outputs, Supabase, Node.js built-in test runner

---

## File Structure

- Create `lib/admin/itineraryGeneration.ts`: pure catalog matching and lossless generated-place enrichment.
- Create `lib/admin/itineraryGeneration.test.mjs`: regression tests for matched, unmatched, ordered, and capped generated places.
- Create `lib/admin/itinerary.test.mjs`: regression tests for AI times, rich attraction descriptions, logistics, and extra requested stops.
- Modify `lib/admin/itinerary.ts`: merge AI schedule rows without duplicating visual attraction rows.
- Modify `app/api/itinerary/route.ts`: strengthen the model contract and use lossless catalog enrichment.
- Modify `components/admin/views/ItineraryBuilderView.tsx`: map generated days through `mergeAiSchedule`.

### Task 1: Preserve Requested Places During Catalog Enrichment

**Files:**
- Create: `lib/admin/itineraryGeneration.ts`
- Create: `lib/admin/itineraryGeneration.test.mjs`
- Modify: `app/api/itinerary/route.ts`

- [ ] **Step 1: Write the failing catalog-enrichment tests**

Create `lib/admin/itineraryGeneration.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { resolveGeneratedPlaces } from "./itineraryGeneration.ts";

const catalog = [
  {
    city: "BANGKOK",
    name: "Wat Pho",
    image_url: "https://example.com/wat-pho.jpg",
    description: "Kompleks kuil bersejarah di Bangkok.",
  },
];

test("enriches catalog matches and preserves unmatched requested places", () => {
  const result = resolveGeneratedPlaces(
    [
      { name: "wat pho", activity: "Menjelajahi kuil bersama keluarga." },
      { name: "Big C", activity: "Berbelanja oleh-oleh khas Thailand." },
    ],
    catalog,
    "BANGKOK"
  );

  assert.deepEqual(result, [
    {
      name: "Wat Pho",
      image: "https://example.com/wat-pho.jpg",
      desc: "Kompleks kuil bersejarah di Bangkok.",
      activity: "Menjelajahi kuil bersama keluarga.",
    },
    {
      name: "Big C",
      image: "",
      desc: "",
      activity: "Berbelanja oleh-oleh khas Thailand.",
    },
  ]);
});

test("keeps model order, removes duplicates, and caps visual places", () => {
  const generated = [
    { name: "A", activity: "A" },
    { name: "A", activity: "A duplicate" },
    { name: "B", activity: "B" },
    { name: "C", activity: "C" },
    { name: "D", activity: "D" },
    { name: "E", activity: "E" },
  ];

  assert.deepEqual(
    resolveGeneratedPlaces(generated, [], "BANGKOK").map((place) => place.name),
    ["A", "B", "C", "D"]
  );
});
```

- [ ] **Step 2: Run the test and verify that it fails**

Run:

```bash
rtk node --experimental-strip-types --test lib/admin/itineraryGeneration.test.mjs
```

Expected: FAIL because `lib/admin/itineraryGeneration.ts` does not exist.

- [ ] **Step 3: Implement the pure catalog-enrichment helper**

Create `lib/admin/itineraryGeneration.ts`:

```ts
export interface CatalogPlace {
  city: string;
  name: string;
  image_url: string | null;
  description: string | null;
}

export interface GeneratedPlace {
  name?: string;
  activity?: string;
}

export interface ResolvedGeneratedPlace {
  name: string;
  image: string;
  desc: string;
  activity: string;
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function resolveGeneratedPlaces(
  generated: GeneratedPlace[],
  catalog: CatalogPlace[],
  city: string,
  limit = 4
): ResolvedGeneratedPlace[] {
  const cityKey = city.trim().toUpperCase();
  const resolved: ResolvedGeneratedPlace[] = [];
  const seen = new Set<string>();

  for (const place of generated) {
    if (resolved.length >= limit) break;
    const requestedName = (place.name ?? "").trim();
    const key = normalizeName(requestedName);
    if (!key || seen.has(key)) continue;

    const row =
      catalog.find(
        (candidate) =>
          candidate.city.trim().toUpperCase() === cityKey &&
          normalizeName(candidate.name) === key
      ) ?? catalog.find((candidate) => normalizeName(candidate.name) === key);
    const canonicalName = row?.name ?? requestedName;
    const canonicalKey = normalizeName(canonicalName);
    if (seen.has(canonicalKey)) continue;

    resolved.push({
      name: canonicalName,
      image: row?.image_url ?? "",
      desc: row?.description ?? "",
      activity: (place.activity ?? "").trim(),
    });
    seen.add(key);
    seen.add(canonicalKey);
  }

  return resolved;
}
```

- [ ] **Step 4: Run the catalog-enrichment tests**

Run:

```bash
rtk node --experimental-strip-types --test lib/admin/itineraryGeneration.test.mjs
```

Expected: 2 tests pass.

- [ ] **Step 5: Replace inline dropping logic in the Route Handler**

In `app/api/itinerary/route.ts`, import the helper and shared type:

```ts
import {
  resolveGeneratedPlaces,
  type CatalogPlace,
} from "@/lib/admin/itineraryGeneration";
```

Replace the local `PlaceRow` interface with `CatalogPlace`, type `catalogRows` as `CatalogPlace[]`, and replace the current per-day matching loop with:

```ts
const days = (parsed.days ?? []).map((day) => ({
  ...day,
  places: resolveGeneratedPlaces(
    day.places ?? [],
    catalogRows,
    day.city ?? ""
  ),
}));
```

This keeps named places that are not in Supabase instead of silently deleting them.

- [ ] **Step 6: Strengthen the structured-generation prompt**

Update `SYSTEM` in `app/api/itinerary/route.ts` with these explicit rules:

```text
- Every destination explicitly named by the customer is mandatory. Do not omit or replace it.
- Preserve the requested number of days.
- Arrange stops in a geographically realistic order and account for Bangkok traffic, opening patterns, ferries, and travel time.
- Every attraction activity must start with the exact attraction name, followed by a warm 1-2 sentence description of what it is known for and what the customer can do there, such as sightseeing, family time, photography, shopping, or a cultural experience.
- Include realistic hotel pickup, transfers, meals, check-in, and return travel when relevant.
```

Replace the catalog-only instruction in `systemWithCatalog` with:

```text
For every day, include every attraction explicitly requested by the customer in both "activities" and "places", even when it does not exist in the catalog. You may add other attractions only when they exist in the catalog. Keep the requested attractions in their practical visit order.

For each attraction activity, begin "text" with the exact place name and add a concrete, warm 1-2 sentence explanation. For each "places" entry, copy the same exact name into "name" and put the descriptive experience in "activity". If a requested place is absent from the catalog, keep it anyway; the application will display it without a catalog photo.
```

- [ ] **Step 7: Run focused lint**

Run:

```bash
rtk npx eslint app/api/itinerary/route.ts lib/admin/itineraryGeneration.ts
```

Expected: no ESLint errors.

- [ ] **Step 8: Commit the enrichment change**

```bash
rtk git add app/api/itinerary/route.ts lib/admin/itineraryGeneration.ts lib/admin/itineraryGeneration.test.mjs
rtk git commit -m "feat: preserve requested itinerary places"
```

### Task 2: Apply AI Hours and Preserve the Complete Schedule

**Files:**
- Create: `lib/admin/itinerary.test.mjs`
- Modify: `lib/admin/itinerary.ts`

- [ ] **Step 1: Write the failing schedule-merger test**

Create `lib/admin/itinerary.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { mergeAiSchedule } from "./itinerary.ts";

test("applies AI times without duplicating visual places and keeps extra stops", () => {
  const places = [
    {
      id: "wat-pho",
      name: "Wat Pho",
      image: "wat-pho.jpg",
      desc: "",
      activity:
        "Salah satu kuil bersejarah terindah di Bangkok untuk menjelajah dan mengambil foto keluarga.",
    },
  ];
  const schedule = mergeAiSchedule(places, [
    {
      time: "09:15",
      text: "Wat Pho - Menjelajahi kompleks kuil dan melihat Buddha Berbaring.",
    },
    { time: "12:30", text: "Makan siang di restoran lokal." },
    {
      time: "17:00",
      text: "Big C - Berbelanja oleh-oleh dan camilan khas Thailand bersama keluarga.",
    },
  ]);

  assert.equal(schedule.length, 3);
  assert.deepEqual(schedule[0], {
    id: "wat-pho",
    time: "09:15",
    text: places[0].activity,
  });
  assert.equal(schedule[1].time, "12:30");
  assert.match(schedule[1].text, /Makan siang/);
  assert.equal(schedule[2].time, "17:00");
  assert.match(schedule[2].text, /Big C/);
});
```

- [ ] **Step 2: Run the test and verify that it fails**

Run:

```bash
rtk node --experimental-strip-types --test lib/admin/itinerary.test.mjs
```

Expected: FAIL because the current merger does not apply `09:15` to Wat Pho and drops the unmatched Big C activity.

- [ ] **Step 3: Implement name-aware schedule merging**

In `lib/admin/itinerary.ts`, replace the logistics-only filter with normalized text matching:

```ts
function normalizedWords(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchingPlace(
  places: ItineraryPlace[],
  activityText: string
): ItineraryPlace | undefined {
  const normalizedText = normalizedWords(activityText);
  return places.find((place) => {
    const normalizedName = normalizedWords(place.name);
    return normalizedName.length > 1 && normalizedText.includes(normalizedName);
  });
}
```

Then implement `mergeAiSchedule` so a matching AI attraction row updates the linked visual row's time, while every unmatched AI row is inserted chronologically:

```ts
export function mergeAiSchedule(
  places: ItineraryPlace[],
  aiRows: { time?: string; text?: string }[]
): ItineraryActivity[] {
  let out = scheduleFromPlaces(places);

  for (const row of aiRows) {
    const text = (row.text ?? "").trim();
    const time = (row.time ?? "").trim();
    if (!text) continue;

    const place = matchingPlace(places, text);
    if (place) {
      out = out.map((activity) =>
        activity.id === place.id
          ? {
              ...activity,
              time: time || activity.time,
              text: place.activity || activity.text || text,
            }
          : activity
      );
      continue;
    }

    out = insertByTime(out, {
      id: crypto.randomUUID(),
      time,
      text,
    });
  }

  return out;
}
```

Update the helper comments to state that all unmatched AI rows are retained, not only meals and logistics.

- [ ] **Step 4: Run the schedule test**

Run:

```bash
rtk node --experimental-strip-types --test lib/admin/itinerary.test.mjs
```

Expected: 1 test passes.

- [ ] **Step 5: Run both itinerary test files together**

Run:

```bash
rtk node --experimental-strip-types --test lib/admin/itinerary.test.mjs lib/admin/itineraryGeneration.test.mjs
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit the schedule merger**

```bash
rtk git add lib/admin/itinerary.ts lib/admin/itinerary.test.mjs
rtk git commit -m "feat: apply AI timing to itinerary schedules"
```

### Task 3: Connect the Complete AI Schedule to the Builder

**Files:**
- Modify: `components/admin/views/ItineraryBuilderView.tsx`

- [ ] **Step 1: Import the schedule merger**

Add `mergeAiSchedule` to the existing import from `@/lib/admin/itinerary`:

```ts
import {
  type ItineraryDay,
  type ItineraryActivity,
  type ItineraryPlace,
  scheduleFromPlaces,
  mergeAiSchedule,
  insertByTime,
  MEAL_STOPS,
} from "@/lib/admin/itinerary";
```

- [ ] **Step 2: Preserve AI activities while mapping generated days**

Inside `generateWithAI`, replace:

```ts
activities: scheduleFromPlaces(places),
```

with:

```ts
activities: mergeAiSchedule(places, d.activities ?? []),
```

This applies AI-provided hours to linked attraction rows and retains pickup, transfers, meals, and requested stops without visual cards.

- [ ] **Step 3: Run focused lint**

Run:

```bash
rtk npx eslint components/admin/views/ItineraryBuilderView.tsx app/api/itinerary/route.ts lib/admin/itinerary.ts lib/admin/itineraryGeneration.ts
```

Expected: no ESLint errors.

- [ ] **Step 4: Run regression tests**

Run:

```bash
rtk node --experimental-strip-types --test lib/admin/itinerary.test.mjs lib/admin/itineraryGeneration.test.mjs
```

Expected: 3 tests pass.

- [ ] **Step 5: Run the production build**

Run:

```bash
rtk npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 6: Verify the requested scenario in the running admin UI**

Open the itinerary builder and submit:

```text
Bangkok 1 day, Wat Pho, Wat Arun, Chao Phraya, Big C.
```

Verify:

- One day is generated.
- Wat Pho, Wat Arun, Chao Phraya, and Big C all appear in the timed schedule.
- Every named stop has an hour and a descriptive Indonesian explanation.
- Pickup, meals, transfers, and return travel appear where appropriate.
- Times and descriptions remain editable.
- A failed second generation leaves the previous itinerary unchanged.

- [ ] **Step 7: Commit the builder integration**

```bash
rtk git add components/admin/views/ItineraryBuilderView.tsx
rtk git commit -m "feat: generate descriptive itinerary schedules"
```
