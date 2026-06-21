# AI Itinerary — Quick Fields + Auto Pictures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a complete print-ready itinerary (text + real attraction photos) from quick structured inputs (customer, pax, days, destinations).

**Architecture:** The `/api/itinerary` route fetches the curated `places` catalog, feeds the city→names list into the OpenAI prompt so the model can only pick real attractions, then resolves the chosen names server-side into full photo cards (`{name, image, desc}`). The builder UI gains structured quick fields that compose the prompt and wires the returned cards into each day's `places`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, OpenAI (`gpt-4o-mini`, JSON-schema structured output), Supabase.

**Note on testing:** No automated test suite exists in this repo (`npm run lint`, `npm run build` are the gates). Each task verifies via lint/build plus a manual browser check.

---

### Task 1: Server route — fetch catalog + return place names

**Files:**
- Modify: `app/api/itinerary/route.ts`

- [ ] **Step 1: Add `places` to the JSON schema**

In `app/api/itinerary/route.ts`, inside the `SCHEMA` day `properties` (after `activities`, before the day-level `required` array at line ~35), add a `places` array of name-only objects:

```ts
          places: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
              },
              required: ["name"],
            },
          },
```

Then add `"places"` to the day-level `required` array (currently ends with `"activities"`):

```ts
        required: [
          "title",
          "theme",
          "city",
          "route",
          "intro",
          "cityHighlight",
          "activities",
          "places",
        ],
```

- [ ] **Step 2: Define a Place catalog row type + fetch helper**

Add near the top of the file (after imports):

```ts
interface PlaceRow {
  city: string;
  name: string;
  image_url: string | null;
  description: string | null;
}
```

- [ ] **Step 3: Fetch catalog inside POST, before the OpenAI call**

In `POST`, after the prompt-validation block (after the `if (!prompt) { ... }` guard, before `try { const client = new OpenAI();`), insert:

```ts
  // Curated attraction catalog (only rows with a photo can become a card).
  let catalogRows: PlaceRow[] = [];
  try {
    const { data } = await supabase
      .from("places")
      .select("city, name, image_url, description")
      .order("sort", { ascending: true });
    catalogRows = ((data as PlaceRow[]) ?? []).filter((r) => !!r.image_url);
  } catch {
    catalogRows = []; // text-only itinerary if the catalog can't be read
  }

  // Group names by UPPERCASE city for the prompt.
  const byCity = new Map<string, string[]>();
  for (const r of catalogRows) {
    const key = r.city.toUpperCase();
    const list = byCity.get(key) ?? [];
    list.push(r.name);
    byCity.set(key, list);
  }
  const catalogText = byCity.size
    ? [...byCity.entries()]
        .map(([city, names]) => `${city}: ${names.join(" | ")}`)
        .join("\n")
    : "(katalog kosong)";
```

- [ ] **Step 4: Inject catalog into the system prompt**

Replace the `messages` system content in the `client.chat.completions.create` call so it appends catalog instructions. Change the system message to use a composed string:

```ts
    const systemWithCatalog =
      SYSTEM +
      `\n\nKATALOG ATRAKSI (pilih HANYA dari daftar ini untuk "places"):\n` +
      catalogText +
      `\n\nUntuk setiap hari, isi "places" dengan 2-3 nama atraksi NYATA dari katalog yang cocok dengan kota hari itu (field "city"). Salin nama PERSIS seperti di katalog. Jika kota itu tidak ada di katalog, kembalikan "places": [].`;
```

And use it:

```ts
      messages: [
        { role: "system", content: systemWithCatalog },
        { role: "user", content: prompt },
      ],
```

- [ ] **Step 5: Resolve chosen names → photo cards after the model returns**

Replace the post-parse return block (currently `const parsed = JSON.parse(text); return Response.json(parsed);`) with name resolution:

```ts
    const parsed = JSON.parse(text) as {
      tripTitle?: string;
      notes?: string;
      days?: Array<{
        city?: string;
        places?: { name?: string }[];
        [k: string]: unknown;
      }>;
    };

    // Resolve place names to real cards: exact (case-insensitive) match,
    // preferring the day's city, else any city. Drop misses. Cap 3/day.
    const norm = (s: string) => s.trim().toLowerCase();
    const days = (parsed.days ?? []).map((d) => {
      const cityKey = (d.city ?? "").toUpperCase();
      const chosen = (d.places ?? [])
        .map((p) => norm(p.name ?? ""))
        .filter(Boolean);
      const cards: { name: string; image: string; desc: string }[] = [];
      for (const wanted of chosen) {
        if (cards.length >= 3) break;
        const row =
          catalogRows.find(
            (r) => r.city.toUpperCase() === cityKey && norm(r.name) === wanted
          ) ?? catalogRows.find((r) => norm(r.name) === wanted);
        if (row && !cards.some((c) => norm(c.name) === norm(row.name))) {
          cards.push({
            name: row.name,
            image: row.image_url ?? "",
            desc: row.description ?? "",
          });
        }
      }
      return { ...d, places: cards };
    });

    return Response.json({ ...parsed, days });
```

- [ ] **Step 6: Lint + typecheck**

Run: `npm run lint`
Expected: no errors in `app/api/itinerary/route.ts`.

- [ ] **Step 7: Commit**

```bash
git add app/api/itinerary/route.ts
git commit -m "feat(itinerary): AI picks real places from catalog, route returns photo cards"
```

---

### Task 2: Client — wire returned place cards into days

**Files:**
- Modify: `components/admin/views/ItineraryBuilderView.tsx:153-183` (the `setDays(...)` mapping in `generateWithAI`)

- [ ] **Step 1: Extend the response day type + map places**

In `generateWithAI`, the `setDays((data.days ?? []).map(...))` callback currently types `d` without `places` and hardcodes `places: []`. Add `places` to the inline type and map it.

Change the inline type (the object after `d:`) to include:

```ts
              places?: { name?: string; image?: string; desc?: string }[];
```

Change the returned object's `places: [],` (line ~180) to:

```ts
            places: (d.places ?? [])
              .slice(0, MAX_DAY_PHOTOS)
              .map((p) => ({
                id: newId(),
                name: p.name ?? "",
                image: p.image ?? "",
                desc: p.desc ?? "",
              })),
```

`MAX_DAY_PHOTOS` is already imported (line 19) and `newId` is already used in this file.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/views/ItineraryBuilderView.tsx
git commit -m "feat(itinerary): render AI-attached place photos per day"
```

---

### Task 3: Client — quick-generate structured fields

**Files:**
- Modify: `components/admin/views/ItineraryBuilderView.tsx` (state ~64-77, `generateWithAI` ~139-189, AI section JSX ~377-426)

- [ ] **Step 1: Add quick-field state**

After the existing AI state (after line 77, `const [savedAt, ...]`), add:

```ts
  const [qDays, setQDays] = useState(3);
  const [qDest, setQDest] = useState<string[]>([]);
```

(Customer name and pax reuse the existing `customer` / `pax` state — no new state needed.)

- [ ] **Step 2: Derive destination options from loaded places**

After the `hasContent` definition (line ~137), add a memo of distinct cities that have photos:

```ts
  const destOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of places) if (p.image_url) set.add(p.city.toUpperCase());
    return [...set].sort();
  }, [places]);
```

Ensure `useMemo` is imported from `react` at the top of the file (add to the existing `import { ... } from "react"`).

- [ ] **Step 3: Compose prompt from quick fields in `generateWithAI`**

At the very start of `generateWithAI` (replacing the current `if (!aiPrompt.trim() || aiBusy) return;` guard), build the effective prompt from structured fields, falling back to free-text:

```ts
  async function generateWithAI() {
    if (aiBusy) return;
    const parts: string[] = [];
    if (customer) parts.push(`Customer: ${customer}.`);
    if (pax) parts.push(`Jumlah: ${pax}.`);
    if (qDays) parts.push(`Durasi: ${qDays} hari.`);
    if (qDest.length) parts.push(`Tujuan: ${qDest.join(", ")}.`);
    if (aiPrompt.trim()) parts.push(aiPrompt.trim());
    const effectivePrompt = parts.join(" ");
    if (!effectivePrompt) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt }),
      });
```

(Leave the rest of the `try`/`catch`/`finally` body unchanged — it already maps `data.days`.)

- [ ] **Step 4: Add quick-field inputs to the AI section JSX**

In the AI `<section>` (after the `SUGGESTIONS` chip row `</div>` at line ~398, before the `<textarea>` at line ~399), insert the structured fields:

```tsx
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput
                label="Customer"
                value={customer}
                onChange={setCustomer}
                placeholder="Nama customer"
              />
              <LabeledInput
                label="Jumlah orang"
                value={pax}
                onChange={setPax}
                placeholder="4 dewasa"
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Jumlah hari
                </span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={qDays}
                  onChange={(e) => setQDays(Number(e.target.value) || 1)}
                  className={inputCls}
                />
              </label>
            </div>
            {destOptions.length > 0 && (
              <div className="space-y-1">
                <span className="block text-sm font-medium text-gray-700">
                  Tujuan
                </span>
                <div className="flex flex-wrap gap-2">
                  {destOptions.map((city) => {
                    const on = qDest.includes(city);
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() =>
                          setQDest((prev) =>
                            on
                              ? prev.filter((c) => c !== city)
                              : [...prev, city]
                          )
                        }
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          on
                            ? "border-[#1B2A4A] bg-[#1B2A4A] text-white"
                            : "border-[#1B2A4A]/20 bg-white text-[#1B2A4A] hover:border-[#1B2A4A]"
                        }`}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
```

- [ ] **Step 5: Relabel free-text box as optional notes**

Change the helper `<p>` text (line ~380-383) to clarify the textarea is now optional extra detail:

```tsx
            <p className="text-xs text-gray-500">
              Isi data cepat di atas, lalu Generate. Kotak di bawah opsional —
              untuk minat khusus (mis. suka belanja, ada anak kecil).
            </p>
```

And update the generate button's `disabled` (line ~411) since free-text is no longer required:

```tsx
                disabled={aiBusy}
```

- [ ] **Step 6: Lint + build**

Run: `npm run lint && npm run build`
Expected: clean lint, successful build.

- [ ] **Step 7: Commit**

```bash
git add components/admin/views/ItineraryBuilderView.tsx
git commit -m "feat(itinerary): quick-generate fields (customer, pax, days, destinations)"
```

---

### Task 4: Manual verification

**Files:** none (runtime check)

- [ ] **Step 1: Run dev server**

Run: `npm run dev`
Open `http://localhost:3000/admin`, sign in, go to the Itinerary builder.

- [ ] **Step 2: Verify happy path**

Enter Customer "Budi", Jumlah "4 dewasa", Jumlah hari 3, pick destinations that have seeded photos (e.g. BANGKOK, PATTAYA). Click Generate.
Expected: days appear; each day shows 2–3 real photo cards matching its city; `customer`/`pax` already filled in Detail trip.

- [ ] **Step 3: Verify no-photo city**

Pick a destination/city with no seeded photos (or a generated day whose city has none).
Expected: that day generates with text only, no broken images, no errors.

- [ ] **Step 4: Verify backward compat**

Clear quick fields, type only free-text in the box, Generate.
Expected: itinerary still generates (free-text-only path works).

- [ ] **Step 5: Verify print**

Click Print / Save PDF.
Expected: brochure renders attached photos as before.

---

## Self-Review Notes

- **Spec coverage:** Quick fields (Task 3), server-side catalog match (Task 1), client wiring (Task 2), manual testing (Task 4), backward-compat + empty-catalog error handling (Task 1 Step 3 catch, Task 3 Step 3 fallback). All spec sections covered.
- **Type consistency:** Route emits `{ name, image, desc }`; client maps to `ItineraryPlace { id, name, image, desc }` (matches `lib/admin/itinerary.ts`). Schema `places` is name-only (`{ name }`); route resolves to cards. Consistent across tasks.
- **No placeholders:** every code step contains full code.
