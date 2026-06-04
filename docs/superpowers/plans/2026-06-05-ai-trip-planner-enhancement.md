# AI Trip Planner Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI assist to the existing rule-based itinerary builder — user types a free-text trip description and OpenAI recommends/orders the city's attractions and writes a day-by-day plan, applied via a button. Manual builder stays fully intact.

**Architecture:** A new server-only Next.js route (`app/api/itinerary-suggest`) calls OpenAI `gpt-4o-mini`, constraining it to the target city's real attraction ids (from `lib/itinerary.ts`) and validating the response so prices and stops cannot be hallucinated. `ItineraryBuilder.tsx` step 2 gains a text box, an "AI Suggest" button, a suggestion card, and an Apply handler that sets the existing `selected` state.

**Tech Stack:** Next.js 16 App Router (route handlers), React 19 client component, TypeScript, OpenAI Node SDK. No test suite in repo → verification is manual + `npm run lint` + `npm run build`.

**Reference before coding:** This is Next.js 16 with breaking changes — read `node_modules/next/dist/docs/` route-handler guidance if any API differs from memory. Mirror the existing handler style in `app/api/booking/route.ts` (uses `NextRequest`/`NextResponse`, reads `process.env` server-side).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/openai.ts` | NEW. Lazily construct and export the OpenAI client from `process.env.OPENAI_API_KEY`. Single source of the client. |
| `app/api/itinerary-suggest/route.ts` | NEW. POST handler: validate input → per-IP throttle → build constrained prompt → call OpenAI → validate output ids → return `{ attractionIds, dayPlan }`. |
| `components/ItineraryBuilder.tsx` | MODIFY. Step 2 only: AI text box + button + suggestion card + Apply handler + loading/error state. |
| `lib/translations.ts` | MODIFY. Add AI UI strings under `ui` for `id`, `en`, `th`. |
| `package.json` | MODIFY. Add `openai` dependency. |
| `.env.local` | MODIFY (local, gitignored). Add `OPENAI_API_KEY`. Not committed (`.env*` is gitignored). |

---

## Task 1: Install the OpenAI SDK

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install dependency**

Run:
```bash
npm install openai
```
Expected: `openai` appears in `package.json` `dependencies`; lockfile updated; exit 0.

- [ ] **Step 2: Verify it resolves**

Run:
```bash
node -e "require('openai'); console.log('ok')"
```
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add openai dependency for AI trip planner"
```

---

## Task 2: Add the OpenAI environment variable

**Files:**
- Modify: `.env.local` (create if absent; gitignored — NOT committed)

- [ ] **Step 1: Add the key to `.env.local`**

Append this line (replace with the real key value at run time):
```
OPENAI_API_KEY=sk-your-real-key-here
```
If `.env.local` does not exist, create it with just that line.

- [ ] **Step 2: Confirm it is gitignored**

Run:
```bash
git check-ignore .env.local
```
Expected: prints `.env.local` (meaning it is ignored — good, the key will not be committed).

- [ ] **Step 3: No commit**

This file is intentionally not committed. Nothing to commit in this task.

---

## Task 3: Create the OpenAI client module

**Files:**
- Create: `lib/openai.ts`

- [ ] **Step 1: Write the client module**

Create `lib/openai.ts`:
```typescript
import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Returns a singleton OpenAI client. Throws if OPENAI_API_KEY is unset so the
 * caller can return a graceful "AI unavailable" response. Server-only — never
 * import this from a client component.
 */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors referencing `lib/openai.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/openai.ts
git commit -m "Add server-only OpenAI client module"
```

---

## Task 4: Create the itinerary-suggest API route

**Files:**
- Create: `app/api/itinerary-suggest/route.ts`

**Context the route depends on:**
- `lib/itinerary.ts` exports `getCity(cityId)` returning `{ id, durationHours, image, prices, attractions: { id, hours }[] } | undefined`.
- `lib/translations.ts` exports `itineraryTranslations[lang].attractions` — a `Record<attractionId, displayName>`. Languages: `"id" | "en" | "th"`.

- [ ] **Step 1: Write the route handler**

Create `app/api/itinerary-suggest/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { getCity } from "@/lib/itinerary";
import { itineraryTranslations } from "@/lib/translations";

type Lang = "id" | "en" | "th";

// Simple in-memory per-IP throttle: max 5 requests / 60s. Resets on redeploy;
// adequate to deter casual key-cost abuse. Not a distributed rate limiter.
const WINDOW_MS = 60_000;
const MAX_HITS = 5;
const hits = new Map<string, number[]>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

export async function POST(req: NextRequest) {
  let body: { cityId?: string; prompt?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const cityId = typeof body.cityId === "string" ? body.cityId : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const lang: Lang =
    body.lang === "en" || body.lang === "th" ? body.lang : "id";

  if (!cityId || !prompt) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const city = getCity(cityId);
  if (!city) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Build the catalog of valid attractions: id + localized display name.
  const names = itineraryTranslations[lang].attractions as Record<string, string>;
  const validIds = new Set(city.attractions.map((a) => a.id));
  const catalog = city.attractions
    .map((a) => `- ${a.id}: ${names[a.id] ?? a.id} (~${a.hours}h)`)
    .join("\n");

  const langName = lang === "en" ? "English" : lang === "th" ? "Thai" : "Indonesian";

  const system = [
    "You are a Thailand day-tour planner for Keliling Thailand.",
    `The tour is a single day in this city, max ${city.durationHours} hours of visiting.`,
    "You may ONLY choose attractions from the provided list, by their exact id.",
    "Order them into a sensible visiting sequence.",
    `Write 'dayPlan' as a short, friendly day-by-day narrative in ${langName}.`,
    'Respond ONLY as JSON: {"attractionIds": string[], "dayPlan": string}.',
  ].join(" ");

  const user = `City: ${cityId}\nAvailable attractions:\n${catalog}\n\nTraveler description: ${prompt}`;

  let raw: string;
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
      { timeout: 15_000 }
    );
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("itinerary-suggest OpenAI error:", err);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  let parsed: { attractionIds?: unknown; dayPlan?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  // Validate: keep only real ids for this city, preserve AI order, dedupe.
  const seen = new Set<string>();
  const attractionIds = Array.isArray(parsed.attractionIds)
    ? parsed.attractionIds.filter(
        (id): id is string =>
          typeof id === "string" &&
          validIds.has(id) &&
          !seen.has(id) &&
          (seen.add(id), true)
      )
    : [];
  const dayPlan = typeof parsed.dayPlan === "string" ? parsed.dayPlan : "";

  if (attractionIds.length === 0) {
    return NextResponse.json({ error: "no_suggestion" }, { status: 200 });
  }

  return NextResponse.json({ attractionIds, dayPlan });
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors in `app/api/itinerary-suggest/route.ts`.

- [ ] **Step 3: Manual smoke test (with real key in `.env.local`)**

Run dev server in one terminal: `npm run dev`. Then:
```bash
curl -s -X POST http://localhost:3000/api/itinerary-suggest \
  -H 'Content-Type: application/json' \
  -d '{"cityId":"bangkok","prompt":"family with 2 kids, love temples and food, relaxed pace","lang":"en"}'
```
Expected: JSON with `attractionIds` (all real bangkok ids like `grand-palace`, `wat-pho`) and a non-empty `dayPlan` in English.

Bad-input check:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/itinerary-suggest \
  -H 'Content-Type: application/json' -d '{"cityId":"bangkok"}'
```
Expected: `400`.

- [ ] **Step 4: Commit**

```bash
git add app/api/itinerary-suggest/route.ts
git commit -m "Add itinerary-suggest API route with id validation and throttle"
```

---

## Task 5: Add AI UI strings to translations

**Files:**
- Modify: `lib/translations.ts`

The `itineraryTranslations` object has three language blocks (`id`, `en`, `th`), each with a `ui: { ... }` section. Add the same six keys to all three `ui` blocks.

- [ ] **Step 1: Add keys to the `id` ui block**

In `lib/translations.ts`, inside `itineraryTranslations.id.ui`, after the existing `waFrom` line, add:
```typescript
      aiHeading: "Biarkan AI merancang untuk Anda",
      aiPlaceholder:
        "Ceritakan perjalanan Anda — mis. keluarga dengan 2 anak, suka kuil & kuliner, santai",
      aiButton: "Sarankan dengan AI",
      aiLoading: "AI sedang merancang…",
      aiApply: "Gunakan saran ini",
      aiError: "AI sedang tidak tersedia. Silakan pilih tempat secara manual.",
      aiNoSuggestion: "Tidak dapat membuat saran. Silakan pilih tempat secara manual.",
```

- [ ] **Step 2: Add keys to the `en` ui block**

Inside `itineraryTranslations.en.ui`, after its `waFrom` line, add:
```typescript
      aiHeading: "Let AI plan it for you",
      aiPlaceholder:
        "Describe your trip — e.g. family with 2 kids, love temples & food, relaxed pace",
      aiButton: "Suggest with AI",
      aiLoading: "AI is planning…",
      aiApply: "Use this suggestion",
      aiError: "AI is unavailable right now. Please pick attractions manually.",
      aiNoSuggestion: "Couldn't make a suggestion. Please pick attractions manually.",
```

- [ ] **Step 3: Add keys to the `th` ui block**

Inside `itineraryTranslations.th.ui`, after its `waFrom` line, add:
```typescript
      aiHeading: "ให้ AI วางแผนให้คุณ",
      aiPlaceholder:
        "เล่าเกี่ยวกับทริปของคุณ — เช่น ครอบครัวมีเด็ก 2 คน ชอบวัดและอาหาร แบบสบาย ๆ",
      aiButton: "แนะนำด้วย AI",
      aiLoading: "AI กำลังวางแผน…",
      aiApply: "ใช้คำแนะนำนี้",
      aiError: "ขณะนี้ AI ไม่พร้อมใช้งาน กรุณาเลือกสถานที่ด้วยตนเอง",
      aiNoSuggestion: "ไม่สามารถแนะนำได้ กรุณาเลือกสถานที่ด้วยตนเอง",
```

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors. (TypeScript infers the `ui` shape per language; all three must have matching keys — that's why we add to all three.)

- [ ] **Step 5: Commit**

```bash
git add lib/translations.ts
git commit -m "Add AI planner UI strings (id/en/th)"
```

---

## Task 6: Wire the AI assist into ItineraryBuilder step 2

**Files:**
- Modify: `components/ItineraryBuilder.tsx`

- [ ] **Step 1: Add AI state near the other useState hooks**

In `ItineraryBuilder`, just after the line `const [vehicleId, setVehicleId] = useState<VehicleId | null>(null);`, add:
```typescript
  // AI suggestion state (step 2 assist).
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    attractionIds: string[];
    dayPlan: string;
  } | null>(null);
```

- [ ] **Step 2: Reset AI state when the city changes**

In the existing `chooseCity` function, and in the `requestedCity` state-adjust block, AI state should clear. Update `chooseCity` to:
```typescript
  function chooseCity(id: string) {
    setCityId(id);
    setSelected([]);
    setVehicleId(null);
    setAiPrompt("");
    setAiSuggestion(null);
    setAiError(null);
    setStep(2);
  }
```
And in the `requestedCity` block (the `if (requestedCity && ...)` body), after `setVehicleId(null);` add:
```typescript
    setAiSuggestion(null);
    setAiError(null);
```
Also update `reset()` — after `setVehicleId(null);` add:
```typescript
    setAiPrompt("");
    setAiSuggestion(null);
    setAiError(null);
```

- [ ] **Step 3: Add the request + apply handlers**

Add these two functions inside the component, after `toggleStop`:
```typescript
  async function requestAiSuggestion() {
    if (!cityId || !aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const res = await fetch("/api/itinerary-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId, prompt: aiPrompt.trim(), language }),
      });
      const data = await res.json();
      if (!res.ok || data.error === "ai_unavailable" || data.error === "rate_limited") {
        setAiError(t.ui.aiError);
        return;
      }
      if (data.error === "no_suggestion" || !data.attractionIds?.length) {
        setAiError(t.ui.aiNoSuggestion);
        return;
      }
      setAiSuggestion({ attractionIds: data.attractionIds, dayPlan: data.dayPlan ?? "" });
    } catch {
      setAiError(t.ui.aiError);
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) return;
    setSelected(aiSuggestion.attractionIds);
    setAiSuggestion(null);
  }
```
Note the request body uses `language` (the value from `useLanguage()`), sent as the `lang` field — the route reads `body.lang`, so rename on send: change `language` to `lang: language` in the body. Final body line:
```typescript
        body: JSON.stringify({ cityId, prompt: aiPrompt.trim(), lang: language }),
```

- [ ] **Step 4: Render the AI box + card at the top of step 2**

In the `{step === 2 && city && (` block, immediately after the opening `<div>` and before the `<p ...>{t.ui.pickAttractionsHint}</p>` line, insert:
```tsx
            {/* AI assist */}
            <div className="outline-card p-5 mb-8 bg-white">
              <p className="font-bold text-[#050505] mb-3">{t.ui.aiHeading}</p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t.ui.aiPlaceholder}
                rows={2}
                className="w-full rounded-xl border-2 border-[#050505] p-3 text-sm text-[#050505] outline-none focus:bg-[#FAE7B8]/30 resize-none"
              />
              <button
                onClick={requestAiSuggestion}
                disabled={!aiPrompt.trim() || aiLoading}
                className="mt-3 rounded-full border-2 border-[#050505] bg-[#FFC531] px-6 py-2.5 font-bold text-[#050505] transition hover:translate-x-[-1px] hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {aiLoading ? t.ui.aiLoading : "✨ " + t.ui.aiButton}
              </button>

              {aiError && (
                <p className="mt-3 text-sm text-red-600">{aiError}</p>
              )}

              {aiSuggestion && (
                <div className="mt-4 rounded-xl border-2 border-[#050505] bg-[#FAE7B8]/40 p-4">
                  <ol className="space-y-1.5 mb-3">
                    {aiSuggestion.attractionIds.map((id, i) => (
                      <li key={id} className="flex items-center gap-2 text-sm font-semibold text-[#050505]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFC531] text-xs font-bold">
                          {i + 1}
                        </span>
                        {t.attractions[id as keyof typeof t.attractions]}
                      </li>
                    ))}
                  </ol>
                  {aiSuggestion.dayPlan && (
                    <p className="text-sm text-[#050505]/80 whitespace-pre-line mb-4">
                      {aiSuggestion.dayPlan}
                    </p>
                  )}
                  <button
                    onClick={applyAiSuggestion}
                    className="rounded-full border-2 border-[#050505] bg-white px-5 py-2 font-bold text-[#050505] transition hover:bg-[#F4F4F4]"
                  >
                    {t.ui.aiApply}
                  </button>
                </div>
              )}
            </div>
```

- [ ] **Step 5: Type-check and lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no type errors; lint passes (or only pre-existing warnings unrelated to these files).

- [ ] **Step 6: Manual verification (dev server running, real key set)**

For `npm run dev` at `localhost:3000`, scroll to the builder (`#builder`):
1. Pick **Bangkok** → step 2 shows the AI box at top.
2. Type "family, 2 kids, temples and food, relaxed" → click "Suggest with AI".
3. Loading label shows, then a card appears with an ordered list + a day plan paragraph.
4. Click "Use this suggestion" → the attraction checkboxes update to match; card closes.
5. Continue to step 3 → click a vehicle → confirm the **price matches the city/vehicle table** (AI did not change it).
6. Switch language (navbar) to **EN** and **TH**, repeat steps 1–3 → labels and day plan come back in that language.
7. Empty prompt → button is disabled.
8. Temporarily blank `OPENAI_API_KEY` in `.env.local`, restart dev, request → red `aiError` message shows, manual selection still works. Restore the key after.

- [ ] **Step 7: Commit**

```bash
git add components/ItineraryBuilder.tsx
git commit -m "Add AI suggestion assist to itinerary builder step 2"
```

---

## Task 7: Final build verification

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run:
```bash
npm run build
```
Expected: build succeeds, no type or lint errors. The new route appears in the build output route list.

- [ ] **Step 2: Confirm no secret committed**

Run:
```bash
git log --oneline -8 && git grep -i "sk-" -- '*.ts' '*.tsx' || echo "no key strings in tracked source"
```
Expected: no real API key string in tracked files.

---

## Self-Review notes

- **Spec coverage:** server-only route ✓ (Task 4, `lib/openai.ts` Task 3); constrained/validated ids ✓ (Task 4 validation); free-text input ✓ (Task 6 textarea); suggestion card + Apply ✓ (Task 6); i18n in id/en/th ✓ (Task 5, `lang` sent in Task 6); per-IP throttle ✓ (Task 4); error fallbacks (missing key / timeout / empty / bad city / 0 ids) ✓ (Task 4 returns `503/400/200 no_suggestion`, Task 6 maps to `aiError`/`aiNoSuggestion`); price unchanged verification ✓ (Task 6 step 6.5, Task 7).
- **Type consistency:** suggestion state `{ attractionIds: string[]; dayPlan: string }` matches the route's response and the render in Task 6. Route response keys `attractionIds` / `dayPlan` / `error` are read identically in Task 6 handler. Request body field is `lang` (Task 4 reads `body.lang`; Task 6 step 3 final body sends `lang: language`).
- **No placeholders:** all code blocks complete; the only intentional placeholder is the real API key value in `.env.local` (Task 2), which is correct.
