# AI Itinerary Schedule Design

## Goal

Turn an admin's free-form trip request into a complete, editable daily itinerary. Explicitly named destinations are required stops. Each stop includes a realistic time and a useful Indonesian description of the place and experience.

Example request:

> Bangkok 1 day, Wat Pho, Wat Arun, Chao Phraya, Big C.

The result must include all four named stops, arranged into a practical route with travel time, meals, pickup, and return where appropriate.

## Existing System

The itinerary builder already sends a prompt to the authenticated `POST /api/itinerary` endpoint and receives structured OpenAI output. The endpoint enriches recognized attractions from the Supabase `places` catalog.

Two existing behaviors prevent the requested result:

1. Attractions not matched to the catalog are dropped from the response.
2. The builder discards the AI's timed meal and logistics rows when it creates the editable schedule, despite an existing `mergeAiSchedule` helper intended to preserve them.

## Recommended Approach

Use the existing single AI request and structured response, with a stricter generation contract and lossless server-side enrichment.

Alternative approaches considered:

- A separate AI extraction request followed by a planning request would improve observability but doubles latency and model cost.
- Client-side parsing of place names would be cheaper but unreliable for natural-language requests and spelling variations.
- The recommended single structured request fits the current architecture and is sufficient when paired with explicit instructions and response preservation.

## Generation Contract

The server prompt will require the model to:

- Treat every destination explicitly named by the admin as mandatory.
- Preserve the requested number of days.
- Arrange stops in a geographically and operationally realistic order.
- Include hotel pickup, transfers, meals, check-in, and return travel when relevant.
- Account for Bangkok traffic, opening patterns, ferry transfers, and realistic visit duration.
- Never invent prices.
- Write all customer-facing content in natural Bahasa Indonesia.
- Give every attraction a one- or two-sentence description covering what the place is known for and what the customer can do there, such as sightseeing, family time, photography, shopping, or cultural experiences.

The existing strict JSON schema remains the API contract. Attraction `activity` text carries the rich description used by the editable schedule and printed document. Timed `activities` are the complete schedule and include every requested stop, meals, and logistics.

## Catalog Enrichment

For each AI-generated place:

- Match its name case-insensitively against the Supabase catalog, preferring the day's city.
- When matched, attach the catalog image and saved description.
- When unmatched, retain the AI-generated place or its timed activity instead of dropping it.
- Preserve model order and prevent duplicate place rows.
- Keep the current maximum of four visual place entries per day, but retain additional requested stops in the timed schedule.

This makes the request authoritative while still benefiting from curated images.

## Builder Data Flow

1. Admin enters a free-form request and clicks **Generate itinerary**.
2. The builder combines the request with customer, passenger count, duration, and selected destinations.
3. The API returns the structured itinerary.
4. Each day's visual places are converted to editable place rows.
5. `mergeAiSchedule` creates the visual attraction rows, merges meals and logistics, and retains AI attraction rows that are not already represented by a visual place. This prevents duplicates without losing a fifth or unmatched requested stop.
6. The generated title, notes, cover, days, times, and descriptions populate the current editor.
7. Existing autosave persists the edited document.

Generation replaces the current generated days only after a successful response. Existing work remains unchanged when the request fails.

## User Experience

The current AI panel remains the entry point. No automatic generation occurs while typing, avoiding accidental model usage and partial prompts. The existing busy and error states remain visible. Generated times and descriptions are editable through the current day editor before printing.

Example schedule item:

**09:00 - Wat Pho**

Salah satu kompleks kuil bersejarah paling indah di Bangkok, terkenal dengan Buddha Berbaring dan arsitektur tradisional Thailand. Nikmati waktu bersama keluarga, menjelajahi area kuil, dan mengambil foto di sudut-sudut terbaik.

## Error Handling

- Reject empty prompts and unauthenticated requests as today.
- Preserve the current itinerary when the API returns an error or malformed data.
- Return unmatched requested places without photos rather than omitting them.
- Show the existing inline error message for model or network failures.

## Testing

Add focused tests for schedule composition and server enrichment where the current test setup permits it. At minimum, verify manually and through lint/build that:

- `Bangkok 1 day, Wat Pho, Wat Arun, Chao Phraya, Big C` returns one day containing all four stops.
- Every attraction has a time and descriptive activity text.
- Meal and transfer rows survive client mapping.
- A place absent from the catalog remains in the itinerary.
- A failed generation does not erase existing days.
- The builder remains editable and printable after generation.

## Scope

This change does not add background generation, customer-facing AI access, pricing recommendations, route-map integration, or a second AI review pass.
