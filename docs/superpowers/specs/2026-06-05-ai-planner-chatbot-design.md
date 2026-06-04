# AI Features — Design Spec

**Date:** 2026-06-05
**Project:** keliling-thailand-web
**Status:** Approved (design), pending implementation plan

Two AI sub-projects, each its own spec → plan → build cycle:

1. **AI Trip Planner Enhancement** — build first (this spec, detailed below).
2. **Chatbot** — build second (scoped below, gets its own detailed spec before build).

Provider: **OpenAI**, model `gpt-4o-mini`. Server-side only; key never reaches the browser.

---

## Sub-project 1 — AI Trip Planner Enhancement

### Goal

Augment the existing rule-based itinerary builder (`components/ItineraryBuilder.tsx` + `lib/itinerary.ts`). Keep the manual flow fully intact. Add an AI assist on the attraction-selection step: user types a free-text trip description, AI recommends and orders attractions and writes a day-by-day plan. AI never changes prices or invents stops.

### Non-goals

- Replacing the manual builder.
- Conversational/chat UI (that is sub-project 2).
- Database changes.
- Touching the booking flow or WhatsApp handoff.

### Architecture

```
User types trip desc (free text) on step 2 (attractions)
        │  [AI Suggest] button
        │  POST { cityId, prompt, lang }
        ▼
app/api/itinerary-suggest/route.ts   (server — OPENAI_API_KEY safe here)
        │  builds prompt from itinerary.ts (valid attraction ids for city)
        │  + display names from itineraryTranslations
        ▼
   OpenAI gpt-4o-mini  (response_format: json_object)
        │  returns { attractionIds: [...], dayPlan: "..." }
        ▼
   Route validates: drops any id not real for that city
        ▼
ItineraryBuilder shows suggestion card → [Apply] sets `selected` state
```

Principles:
- **Server route only.** `OPENAI_API_KEY` lives in `.env.local` (gitignored). Never bundled to client.
- **Constrained output.** AI may only pick from the target city's real attraction ids. Server validates and filters. Price logic (`getPrice`) is unchanged — fixed by city + vehicle — so AI cannot affect cost.
- **Additive.** Existing builder untouched except for the new text box, button, suggestion card, and Apply handler. Builder works fully if AI is unavailable.

### Files

| File | Change |
|------|--------|
| `app/api/itinerary-suggest/route.ts` | NEW. POST handler. Validate input → call OpenAI → validate output ids → return `{ attractionIds, dayPlan }`. ~15s timeout, try/catch. |
| `lib/openai.ts` | NEW. OpenAI client from `process.env.OPENAI_API_KEY`. |
| `components/ItineraryBuilder.tsx` | EDIT. Step 2: add text box + "AI Suggest" button, suggestion card (ordered attractions + dayPlan), Apply handler, loading + error state. |
| `lib/translations.ts` | EDIT. New UI strings (placeholder, button label, "applying…", error/fallback messages) in id / en / th. |
| `package.json` | Add `openai` dependency. |
| `.env.example` | Add `OPENAI_API_KEY=` (committed). |
| `.env.local` | Real key (NOT committed). |

### Data flow

1. User on step 2 (city already chosen), types description, clicks AI Suggest. Button disabled while prompt empty.
2. Client POSTs `{ cityId, prompt, lang }`.
3. Route loads city + valid attraction ids/names (`itinerary.ts` + `itineraryTranslations`), builds system prompt: "Only choose from these attraction ids. Reply as JSON `{ attractionIds, dayPlan }`. Write dayPlan in `{lang}`."
4. OpenAI returns JSON. Route filters `attractionIds` to ids that are real for that city.
5. Client renders card: ordered attractions + dayPlan text. Apply → `setSelected(attractionIds)`.

### Error handling

- Missing/invalid `OPENAI_API_KEY` → 500; card shows translated "AI unavailable, build manually." Builder still works.
- OpenAI timeout/error → same fallback. try/catch + ~15s timeout.
- Empty prompt → button disabled.
- Bad `cityId` → 400.
- AI returns 0 valid ids → card: "couldn't suggest, pick manually."
- **Per-IP throttle** (light, v1 included) — basic in-memory rate limit to protect against key cost abuse.

### Edge cases

- dayPlan returned in wrong language → accept (cosmetic); prompt strongly requests correct lang.
- Total hours exceed city duration → allowed; builder already displays total hours for the user to judge.

### Testing

No test suite in repo. Manual verification:
- Each city, each language: happy path.
- Key missing → fallback message, builder works.
- Empty prompt → button disabled.
- After Apply, confirm price unchanged (ids constrained).

---

## Sub-project 2 — Chatbot (scope only; detailed spec before build)

### Intent

Customer-facing assistant answering trip/service questions in id/en/th, suggesting tours, and handing off to WhatsApp when the user is ready to book.

### Rough shape (to be detailed later)

- Floating chat widget (site already has `FloatingWhatsApp.tsx` pattern to follow).
- `app/api/chat/route.ts` — server route to OpenAI, streamed responses.
- Grounded on real data: services, cities/attractions from `itinerary.ts`, prices, contact info. No hallucinated offerings.
- WhatsApp handoff: when intent = book, surface the existing WhatsApp CTA with prefilled context.
- Reuse `lib/openai.ts` and i18n from sub-project 1.

A full design spec (architecture, files, errors, testing) will be written and approved before building this.

---

## Build order

1. Trip Planner Enhancement → writing-plans → implement → verify.
2. Chatbot → its own brainstorm/spec → writing-plans → implement.
