# Instagram Attraction Carousel Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Instagram Studio's Attraction & Event editor into a four- or five-slide AI carousel builder with editable pages, catalog-backed vehicle advertising, and PNG/ZIP export.

**Architecture:** Keep pure carousel types, reducers, validation, prompt construction, and vehicle projection in focused library modules. A protected Next.js Route Handler calls OpenAI with a strict editorial-only schema; the client editor owns uploads, ordering, editing, rendering, and export, while catalog prices are loaded from Supabase and joined locally. Existing `social_posts` storage remains the persistence boundary, with the first slide as gallery cover and all ordered slide URLs plus editable source stored in `payload`.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, OpenAI structured outputs, Supabase, `html-to-image`, JSZip, Node test runner, Tailwind CSS 4.

---

## File map

- Create `lib/admin/attractionCarousel.ts`: carousel types, defaults, immutable slide operations, prompt builder, and AI response validation.
- Create `lib/admin/attractionCarousel.test.mjs`: pure tests for generation contracts and slide operations.
- Create `lib/admin/instagramVehicles.ts`: public vehicle projection, current price lookup, image mapping, validation, and formatting.
- Create `lib/admin/instagramVehicles.test.mjs`: catalog/image mapping tests.
- Create `lib/admin/carouselExport.ts`: deterministic PNG/ZIP names and ZIP assembly.
- Create `lib/admin/carouselExport.test.mjs`: export naming tests.
- Create `app/api/instagram/attraction-carousel/route.ts`: authenticated structured-output generation endpoint.
- Create `components/admin/instagram/AttractionSlideRail.tsx`: accessible slide selection and ordering controls.
- Create `components/admin/instagram/AttractionSlideFields.tsx`: selected-slide copy, type, photo, and vehicle controls.
- Replace `components/admin/instagram/templates/attraction.tsx`: role-aware carousel renderers and registry.
- Replace `components/admin/instagram/AttractionEditor.tsx`: orchestrating setup, generation, edits, uploads, preview, export, and save.
- Modify `components/admin/views/marketing/InstagramStudioView.tsx`: gallery ZIP/individual slide actions and editable payload reopening.
- Modify `lib/admin/instagram.ts`: remove the obsolete single-page attraction model and re-export shared carousel types as needed.
- Modify `package.json` and `package-lock.json`: add `jszip`.

### Task 1: Define and test the carousel domain

**Files:**
- Create: `lib/admin/attractionCarousel.ts`
- Create: `lib/admin/attractionCarousel.test.mjs`

- [ ] **Step 1: Write failing tests for defaults and slide operations**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  addAttractionSlide,
  defaultAttractionCarousel,
  duplicateAttractionSlide,
  moveAttractionSlide,
  removeAttractionSlide,
} from "./attractionCarousel.ts";

test("default carousel has no generated slides", () => {
  const value = defaultAttractionCarousel();
  assert.equal(value.topic, "");
  assert.deepEqual(value.photos, []);
  assert.deepEqual(value.slides, []);
});

test("slide operations preserve stable IDs and order", () => {
  const first = { id: "a", type: "hook", title: "A", body: "", cta: "", photoId: null, vehicleIds: [] };
  const second = { id: "b", type: "fact", title: "B", body: "", cta: "", photoId: null, vehicleIds: [] };
  const added = addAttractionSlide([first], second, 1);
  const duplicated = duplicateAttractionSlide(added, "a", () => "copy");
  assert.deepEqual(duplicated.map((s) => s.id), ["a", "copy", "b"]);
  assert.deepEqual(moveAttractionSlide(duplicated, "b", -1).map((s) => s.id), ["a", "b", "copy"]);
  assert.deepEqual(removeAttractionSlide(duplicated, "copy").map((s) => s.id), ["a", "b"]);
});
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run: `rtk node --test lib/admin/attractionCarousel.test.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement types, defaults, and immutable operations**

```ts
import type { BrandColors } from "@/lib/admin/instagram";

export type AttractionSlideType = "hook" | "fact" | "tip" | "custom" | "transport";

export interface AttractionPhoto {
  id: string;
  localUrl: string;
  publicUrl: string | null;
}

export interface AttractionCarouselSlide {
  id: string;
  type: AttractionSlideType;
  title: string;
  body: string;
  cta: string;
  photoId: string | null;
  vehicleIds: string[];
}

export interface AttractionCarouselData {
  topic: string;
  location: string;
  date: string;
  photos: AttractionPhoto[];
  slides: AttractionCarouselSlide[];
  logoUrl: string | null;
  brandColors: BrandColors;
}

export function defaultAttractionCarousel(): AttractionCarouselData {
  return { topic: "", location: "", date: "", photos: [], slides: [], logoUrl: null,
    brandColors: { navy: "#1B2A4A", yellow: "#F5C518" } };
}

export function addAttractionSlide(slides: AttractionCarouselSlide[], slide: AttractionCarouselSlide, index: number) {
  const next = slides.slice();
  next.splice(Math.max(0, Math.min(index, next.length)), 0, slide);
  return next;
}

export function duplicateAttractionSlide(slides: AttractionCarouselSlide[], id: string, makeId = crypto.randomUUID) {
  const index = slides.findIndex((slide) => slide.id === id);
  if (index < 0) return slides;
  return addAttractionSlide(slides, { ...slides[index], id: makeId(), vehicleIds: [...slides[index].vehicleIds] }, index + 1);
}

export function moveAttractionSlide(slides: AttractionCarouselSlide[], id: string, delta: -1 | 1) {
  const from = slides.findIndex((slide) => slide.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= slides.length) return slides;
  const next = slides.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function removeAttractionSlide(slides: AttractionCarouselSlide[], id: string) {
  return slides.filter((slide) => slide.id !== id);
}
```

- [ ] **Step 4: Run the domain tests**

Run: `rtk node --test lib/admin/attractionCarousel.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit the domain model**

```bash
rtk git add lib/admin/attractionCarousel.ts lib/admin/attractionCarousel.test.mjs
rtk git commit -m "feat(instagram): add attraction carousel domain"
```

### Task 2: Add and validate the AI editorial contract

**Files:**
- Modify: `lib/admin/attractionCarousel.ts`
- Modify: `lib/admin/attractionCarousel.test.mjs`

- [ ] **Step 1: Add failing prompt and validation tests**

```js
import { buildAttractionCarouselPrompt, parseAttractionCarouselResult } from "./attractionCarousel.ts";

test("prompt requests Indonesian editorial fields and excludes vehicle facts", () => {
  const prompt = buildAttractionCarouselPrompt({ topic: "Songkran", location: "Bangkok", date: "13 April", slideCount: 5 });
  assert.match(prompt.system, /Bahasa Indonesia/);
  assert.match(prompt.system, /jangan.*harga/i);
  assert.match(prompt.user, /Songkran/);
  assert.match(prompt.user, /5 slide/);
});

test("parser requires 4-5 slides and one final transport role", () => {
  const slides = [
    { type: "hook", title: "Songkran", body: "Geser untuk tahu ceritanya.", cta: "Geser", photoIndex: 0 },
    { type: "fact", title: "Tradisi air", body: "Air melambangkan penyucian.", cta: "", photoIndex: 1 },
    { type: "fact", title: "Bukan sekadar perang air", body: "Ada tradisi keluarga.", cta: "", photoIndex: 2 },
    { type: "transport", title: "Keliling lebih mudah", body: "Pilih kendaraan privat.", cta: "Hubungi kami", photoIndex: null },
  ];
  assert.equal(parseAttractionCarouselResult({ slides }).length, 4);
  assert.throws(() => parseAttractionCarouselResult({ slides: slides.slice(0, 3) }), /4–5/);
  assert.throws(() => parseAttractionCarouselResult({ slides: [...slides].reverse() }), /transport/);
});
```

- [ ] **Step 2: Run tests and confirm missing exports**

Run: `rtk node --test lib/admin/attractionCarousel.test.mjs`  
Expected: FAIL because prompt/parser exports do not exist.

- [ ] **Step 3: Implement the request, prompt, parser, and merge helpers**

```ts
export interface AttractionGenerationRequest {
  topic: string;
  location: string;
  date: string;
  slideCount: 4 | 5;
}

export interface GeneratedAttractionSlide {
  type: "hook" | "fact" | "tip" | "transport";
  title: string;
  body: string;
  cta: string;
  photoIndex: number | null;
}

export function buildAttractionCarouselPrompt(input: AttractionGenerationRequest) {
  return {
    system: `Tulis carousel Instagram dalam Bahasa Indonesia untuk Keliling Thailand.
Kembalikan tepat jumlah slide yang diminta. Urutan: hook, fakta/cerita yang berbeda,
tip opsional, lalu transport sebagai slide terakhir. Jangan membuat harga, nama kendaraan,
jam buka, tanggal, atau klaim operasional. Transport hanya berisi editorial CTA.`,
    user: `Topik: ${input.topic}\nLokasi: ${input.location || "tidak disebut"}\nTanggal: ${input.date || "tidak disebut"}\nBuat ${input.slideCount} slide.`,
  };
}

export function buildSingleAttractionSlidePrompt(input: AttractionGenerationRequest & {
  slide: Pick<AttractionCarouselSlide, "type" | "title" | "body" | "cta">;
  context: Array<Pick<AttractionCarouselSlide, "type" | "title">>;
}) {
  return {
    system: `${buildAttractionCarouselPrompt(input).system}\nTulis ulang tepat satu slide bertipe ${input.slide.type}. Jangan mengubah fakta atau mengulang judul slide lain.`,
    user: `Topik: ${input.topic}\nSlide sekarang: ${JSON.stringify(input.slide)}\nKonteks carousel: ${JSON.stringify(input.context)}`,
  };
}

const TYPES = new Set(["hook", "fact", "tip", "transport"]);

export function parseAttractionCarouselResult(value: unknown): GeneratedAttractionSlide[] {
  const slides = (value as { slides?: unknown })?.slides;
  if (!Array.isArray(slides) || slides.length < 4 || slides.length > 5) throw new Error("Carousel harus berisi 4–5 slide.");
  const parsed = slides.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const type = String(item.type ?? "");
    const title = String(item.title ?? "").trim();
    const body = String(item.body ?? "").trim();
    const cta = String(item.cta ?? "").trim();
    const photoIndex = item.photoIndex == null ? null : Number(item.photoIndex);
    if (!TYPES.has(type) || !title || !body || title.length > 80 || body.length > 320 || cta.length > 80) {
      throw new Error(`Konten slide ${index + 1} tidak valid.`);
    }
    return { type, title, body, cta, photoIndex } as GeneratedAttractionSlide;
  });
  if (parsed.at(-1)?.type !== "transport" || parsed.filter((s) => s.type === "transport").length !== 1) {
    throw new Error("Slide transport harus tepat satu dan berada terakhir.");
  }
  return parsed;
}

export function parseGeneratedAttractionSlide(value: unknown): GeneratedAttractionSlide {
  const slide = (value as { slide?: unknown })?.slide as Record<string, unknown> | undefined;
  if (!slide) throw new Error("Slide hasil AI tidak tersedia.");
  const wrapped = { slides: [
    { type: "hook", title: "context", body: "context", cta: "", photoIndex: 0 },
    { type: "fact", title: "context", body: "context", cta: "", photoIndex: 0 },
    { ...slide, type: slide.type === "transport" ? "fact" : slide.type },
    { type: "transport", title: "context", body: "context", cta: "", photoIndex: null },
  ] };
  return parseAttractionCarouselResult(wrapped)[2];
}
```

- [ ] **Step 4: Run the full carousel tests**

Run: `rtk node --test lib/admin/attractionCarousel.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit the AI contract**

```bash
rtk git add lib/admin/attractionCarousel.ts lib/admin/attractionCarousel.test.mjs
rtk git commit -m "feat(instagram): validate attraction carousel AI output"
```

### Task 3: Create the protected generation Route Handler

**Files:**
- Create: `app/api/instagram/attraction-carousel/route.ts`

- [ ] **Step 1: Implement the route using the documented Next.js 16 Route Handler convention**

Use native `Request` and `Response.json`; POST handlers are not cached in Next.js 16.2.3.

```ts
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { buildAttractionCarouselPrompt, buildSingleAttractionSlidePrompt,
  parseAttractionCarouselResult, parseGeneratedAttractionSlide } from "@/lib/admin/attractionCarousel";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SLIDE = { type: "object", additionalProperties: false, properties: {
  type: { type: "string", enum: ["hook", "fact", "tip", "transport"] },
  title: { type: "string" }, body: { type: "string" }, cta: { type: "string" },
  photoIndex: { anyOf: [{ type: "integer" }, { type: "null" }] },
}, required: ["type", "title", "body", "cta", "photoIndex"] } as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "OPENAI_API_KEY belum di-set di server." }, { status: 500 });
  try {
    const body = await request.json();
    const topic = String(body?.topic ?? "").trim();
    const slideCount = Number(body?.slideCount) === 4 ? 4 : 5;
    if (!topic) return Response.json({ error: "Topik wajib diisi." }, { status: 400 });
    const input = { topic, location: String(body?.location ?? "").trim(), date: String(body?.date ?? "").trim(), slideCount };
    const single = body?.mode === "single";
    const prompt = single
      ? buildSingleAttractionSlidePrompt({ ...input, slide: body.slide, context: Array.isArray(body.context) ? body.context : [] })
      : buildAttractionCarouselPrompt(input);
    const schema = single
      ? { type: "object", additionalProperties: false, properties: { slide: SLIDE }, required: ["slide"] }
      : { type: "object", additionalProperties: false, properties: { slides: { type: "array", minItems: slideCount, maxItems: slideCount, items: SLIDE } }, required: ["slides"] };
    const completion = await new OpenAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }],
      response_format: { type: "json_schema", json_schema: { name: "attraction_carousel", strict: true,
        schema } },
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return Response.json(single
      ? { slide: parseGeneratedAttractionSlide(parsed) }
      : { slides: parseAttractionCarouselResult(parsed) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI gagal membuat carousel." }, { status: 502 });
  }
}
```

The single-slide request body is `{ mode: "single", topic, location, date,
slideCount, slide, context }`. It uses the same strict editorial schema, returns
`{ slide }`, and never accepts or returns vehicle prices.

- [ ] **Step 2: Type-check the route**

Run: `rtk npx tsc --noEmit -p tsconfig.json`  
Expected: no error in `app/api/instagram/attraction-carousel/route.ts`.

- [ ] **Step 3: Commit the route**

```bash
rtk git add app/api/instagram/attraction-carousel/route.ts
rtk git commit -m "feat(instagram): generate attraction carousel copy"
```

### Task 3A: Generate a caption from the completed carousel

**Files:**
- Modify: `lib/admin/instagram.ts`
- Modify: `lib/admin/instagram.test.mjs`
- Modify: `app/api/instagram/caption/route.ts`

- [ ] **Step 1: Add a failing carousel caption test**

```js
test("buildCaptionMessages includes attraction carousel highlights", () => {
  const messages = buildCaptionMessages({
    kind: "attraction-carousel", topic: "Songkran", location: "Bangkok",
    slides: ["Tradisi air", "Etika saat bermain air"],
  });
  const user = messages.find((message) => message.role === "user").content;
  assert.match(user, /Songkran/);
  assert.match(user, /Tradisi air/);
  assert.match(user, /Bangkok/);
});
```

- [ ] **Step 2: Run the test and verify the new kind is unsupported**

Run: `rtk node --test lib/admin/instagram.test.mjs`  
Expected: FAIL because `attraction-carousel` is not handled.

- [ ] **Step 3: Extend the caption request and route parser**

Add this union member and switch case in `lib/admin/instagram.ts`:

```ts
| { kind: "attraction-carousel"; topic: string; location: string; slides: string[] }

case "attraction-carousel":
  system = `${CAPTION_BASE}\nJenis post: carousel edukasi atraksi atau event. Rangkum tanpa mengulang semua teks slide dan ajak pembaca menggeser carousel.`;
  user = `Topik: ${input.topic}\nLokasi: ${input.location || "Thailand"}\nHighlight:\n${input.slides.filter(Boolean).join("\n")}`;
  break;
```

In `app/api/instagram/caption/route.ts`, parse this kind before the existing
`attraction` branch:

```ts
if (kind === "attraction-carousel") {
  input = { kind, topic: s(body?.topic), location: s(body?.location),
    slides: Array.isArray(body?.slides) ? body.slides.map(s) : [] };
} else if (kind === "attraction") {
```

- [ ] **Step 4: Run tests and commit**

Run: `rtk node --test lib/admin/instagram.test.mjs`  
Expected: PASS.

```bash
rtk git add lib/admin/instagram.ts lib/admin/instagram.test.mjs app/api/instagram/caption/route.ts
rtk git commit -m "feat(instagram): caption attraction carousels"
```

### Task 4: Project current vehicle catalog data for Instagram

**Files:**
- Create: `lib/admin/instagramVehicles.ts`
- Create: `lib/admin/instagramVehicles.test.mjs`

- [ ] **Step 1: Write failing catalog projection tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { projectInstagramVehicles } from "./instagramVehicles.ts";

test("vehicle projection uses sell price overrides and landing assets", () => {
  const options = projectInstagramVehicles([{ id: "ct-bangkok-altis", service_id: "ct-bangkok", fleet: "altis", cost: 1, sell: 3456, sort: 0 }]);
  const altis = options.find((item) => item.id === "ct-bangkok-altis");
  assert.equal(altis.price, 3456);
  assert.equal(altis.image, "/vehicles/altis/altis.webp");
  assert.equal(altis.serviceName, "Bangkok City Tour");
});

test("projection never returns cost prices", () => {
  const [first] = projectInstagramVehicles([]);
  assert.notEqual(first.price, first.cost);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `rtk node --test lib/admin/instagramVehicles.test.mjs`  
Expected: FAIL with missing module.

- [ ] **Step 3: Implement deterministic catalog/image projection**

```ts
import { applyTransportRates, mergeTransportRates, type FleetKey, type TransportRate } from "@/lib/admin/priceBook";

const FLEET_IMAGES: Record<FleetKey, string> = {
  altis: "/vehicles/altis/altis.webp",
  suv: "/vehicles/suv/fortuner-v2.png",
  van: "/vehicles/van/van-v3.png",
};

export interface InstagramVehicleOption {
  id: string; serviceId: string; serviceName: string; fleet: FleetKey;
  vehicleName: string; image: string; price: number; cost: number; unit: string;
}

export function projectInstagramVehicles(rows: TransportRate[]): InstagramVehicleOption[] {
  return applyTransportRates(mergeTransportRates(rows)).flatMap((group) =>
    group.services.flatMap((service) => service.prices
      ? (Object.keys(service.prices) as FleetKey[]).map((fleet) => ({
          id: `${service.id}-${fleet}`, serviceId: service.id, serviceName: service.name, fleet,
          vehicleName: fleet === "altis" ? "Toyota Altis" : fleet === "suv" ? "SUV" : "Commuter Van",
          image: FLEET_IMAGES[fleet], price: service.prices![fleet].sell,
          cost: service.prices![fleet].cost, unit: "per kendaraan",
        }))
      : [])
  );
}
```

- [ ] **Step 4: Run vehicle tests**

Run: `rtk node --test lib/admin/instagramVehicles.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit vehicle projection**

```bash
rtk git add lib/admin/instagramVehicles.ts lib/admin/instagramVehicles.test.mjs
rtk git commit -m "feat(instagram): map current transport offers"
```

### Task 5: Add deterministic PNG and ZIP export helpers

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/admin/carouselExport.ts`
- Create: `lib/admin/carouselExport.test.mjs`

- [ ] **Step 1: Install JSZip**

Run: `rtk npm install jszip`  
Expected: `jszip` appears in dependencies and lockfile.

- [ ] **Step 2: Write failing file-name tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { carouselPngName, carouselZipName } from "./carouselExport.ts";

test("export names sanitize topic and preserve ordered numbering", () => {
  assert.equal(carouselPngName("Songkran Bangkok!", 0), "songkran-bangkok-01.png");
  assert.equal(carouselZipName("Songkran Bangkok!"), "songkran-bangkok-carousel.zip");
});
```

- [ ] **Step 3: Implement naming, download, and ZIP helpers**

```ts
import JSZip from "jszip";

export function topicSlug(topic: string) {
  return topic.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "atraksi";
}
export const carouselPngName = (topic: string, index: number) => `${topicSlug(topic)}-${String(index + 1).padStart(2, "0")}.png`;
export const carouselZipName = (topic: string) => `${topicSlug(topic)}-carousel.zip`;
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}
export async function buildCarouselZip(topic: string, slides: Blob[]) {
  const zip = new JSZip(); slides.forEach((blob, index) => zip.file(carouselPngName(topic, index), blob));
  return zip.generateAsync({ type: "blob" });
}
```

- [ ] **Step 4: Run tests and commit**

Run: `rtk node --test lib/admin/carouselExport.test.mjs`  
Expected: PASS.

```bash
rtk git add package.json package-lock.json lib/admin/carouselExport.ts lib/admin/carouselExport.test.mjs
rtk git commit -m "feat(instagram): add carousel zip export"
```

### Task 6: Build role-aware slide templates

**Files:**
- Replace: `components/admin/instagram/templates/attraction.tsx`

- [ ] **Step 1: Replace the single-post registry with one carousel renderer**

Export this stable interface:

```tsx
export type AttractionSlideTemplateProps = {
  data: AttractionCarouselData;
  slide: AttractionCarouselSlide;
  format: PostFormat;
  vehicles: InstagramVehicleOption[];
  index: number;
  total: number;
};

export function AttractionSlideTemplate(props: AttractionSlideTemplateProps) {
  return props.slide.type === "transport"
    ? <TransportSlide {...props} />
    : <EditorialSlide {...props} />;
}
```

Implement `EditorialSlide` with the assigned photo as the background, navy legibility overlay, yellow sequence marker, logo, title, body, CTA, and `index + 1 / total`. Implement `TransportSlide` with the selected projected vehicle records in a responsive two-column grid; show image, `vehicleName`, `serviceName`, and `mulai ${price.toLocaleString("id-ID")} THB` plus WhatsApp CTA. Derive compact font and spacing values from `format === "1x1"`; do not read prices inside the template.

- [ ] **Step 2: Type-check templates**

Run: `rtk npx tsc --noEmit -p tsconfig.json`  
Expected: no error in `templates/attraction.tsx`.

- [ ] **Step 3: Commit templates**

```bash
rtk git add components/admin/instagram/templates/attraction.tsx
rtk git commit -m "feat(instagram): render attraction carousel roles"
```

### Task 7: Build focused slide editing controls

**Files:**
- Create: `components/admin/instagram/AttractionSlideRail.tsx`
- Create: `components/admin/instagram/AttractionSlideFields.tsx`

- [ ] **Step 1: Implement the slide rail contract**

```tsx
type Props = {
  slides: AttractionCarouselSlide[]; selectedId: string | null; busy: boolean;
  onSelect(id: string): void; onAdd(afterId: string | null): void; onDuplicate(id: string): void;
  onMove(id: string, delta: -1 | 1): void; onRemove(id: string): void; onRegenerate(id: string): void;
};
```

Render an ordered list with explicit `aria-current`, slide role and number, and buttons labelled `Tambah setelah`, `Duplikat`, `Naik`, `Turun`, `Regenerasi`, and `Hapus`. Disable impossible move actions and all mutation actions while generation/export is busy.

- [ ] **Step 2: Implement selected-slide fields**

```tsx
type Props = {
  slide: AttractionCarouselSlide;
  photos: AttractionPhoto[];
  vehicles: InstagramVehicleOption[];
  onPatch(patch: Partial<AttractionCarouselSlide>): void;
  onUpload(file: File): void;
};
```

For editorial slides render type, title, body, CTA, and photo selection. For transport render title/body/CTA plus checked vehicle options grouped by service; update `vehicleIds` without changing catalog data. Display title/body character counts against 80/320 and show an inline overflow warning.

- [ ] **Step 3: Run lint and commit controls**

Run: `rtk npm run lint -- components/admin/instagram/AttractionSlideRail.tsx components/admin/instagram/AttractionSlideFields.tsx`  
Expected: no lint errors.

```bash
rtk git add components/admin/instagram/AttractionSlideRail.tsx components/admin/instagram/AttractionSlideFields.tsx
rtk git commit -m "feat(instagram): add attraction slide controls"
```

### Task 8: Replace AttractionEditor with the carousel workflow

**Files:**
- Replace: `components/admin/instagram/AttractionEditor.tsx`
- Modify: `lib/admin/instagram.ts`

- [ ] **Step 1: Migrate editor state and load current rates**

Initialize `defaultAttractionCarousel`, selected slide ID, requested slide count, format, caption, busy/error, and projected vehicle options. On mount, load `transport_rates`, call `projectInstagramVehicles`, and seed brand data. Multi-photo upload must create one `AttractionPhoto` per file, keep successful uploads when another fails, and use `fileToDataUrl` for same-origin export rendering.

- [ ] **Step 2: Implement generation and per-slide regeneration**

POST topic/location/date/slideCount to `/api/instagram/attraction-carousel`. Map generated slides to stable IDs, uploaded photo IDs by `photoIndex`, and default transport vehicle IDs from the Bangkok City Tour Altis/SUV/Van options. Whole regeneration must confirm if any slide exists. For one-slide regeneration, send `{ mode: "single", slide, context }` and merge only returned `title`, `body`, and `cta` into the selected slide, retaining its `id`, `type`, `photoId`, and `vehicleIds`.

- [ ] **Step 3: Wire add, duplicate, reorder, and remove**

Create new custom slides with `crypto.randomUUID()`. Select newly added/duplicated slides. Before removing a transport slide, call `confirm("Slide transport berisi CTA penjualan. Tetap hapus?")`; other slides remove immediately. Never require that a manually edited carousel retain a transport slide.

- [ ] **Step 4: Implement preview and hidden export nodes**

Render the selected slide with `ScaledFrame`. Render every slide in an offscreen fixed container with one ref per stable slide ID and pass only the vehicle records referenced by that slide. Block export when there are no slides, title/body length limits fail, a non-transport slide has no photo, or a selected vehicle cannot be resolved.

- [ ] **Step 5: Implement PNG, all-slides, and ZIP export**

Capture every node with `captureNodePng`, convert to blobs, upload all blobs in order, then save one social post:

```ts
await saveSocialPost({
  kind: "attraction", image_url: slideUrls[0], photo_url: data.photos[0]?.publicUrl ?? null,
  review_text: null, customer_name: null, city: null, destination: data.location || null,
  rating: null, caption, template: "carousel-v1", format,
  payload: { title: data.topic, slideUrls, carousel: data },
});
```

Expose three actions: selected PNG, all individual PNGs, and ZIP. Saving occurs once after every upload succeeds; ZIP generation happens after save so its failure cannot invalidate gallery persistence.

- [ ] **Step 6: Wire carousel caption generation**

POST `{ kind: "attraction-carousel", topic, location, slides: data.slides.filter(s => s.type !== "transport").map(s => `${s.title}: ${s.body}`) }` to `/api/instagram/caption`. Keep the generated caption editable and save it with the gallery row.

- [ ] **Step 7: Remove obsolete single-page attraction exports**

Delete `AttractionData`, `defaultAttractionData`, `AttractionTemplateId`, and `ATTRACTION_TEMPLATE_IDS` from `lib/admin/instagram.ts` after all imports move to the new domain module. Keep review and journey APIs unchanged.

- [ ] **Step 8: Verify the editor compiles and commit**

Run: `rtk npx tsc --noEmit -p tsconfig.json`  
Expected: no TypeScript errors.

```bash
rtk git add components/admin/instagram/AttractionEditor.tsx lib/admin/instagram.ts
rtk git commit -m "feat(instagram): build attraction carousel editor"
```

### Task 9: Extend gallery carousel downloads and reopening

**Files:**
- Modify: `components/admin/views/marketing/InstagramStudioView.tsx`
- Modify: `components/admin/instagram/AttractionEditor.tsx`

- [ ] **Step 1: Add an optional initial carousel to AttractionEditor**

Accept `initialData?: AttractionCarouselData | null` and `onConsumedInitialData?: () => void`. When it changes, validate the minimal payload shape before replacing state, select the first slide, then call the consumed callback so tab changes do not repeatedly overwrite edits.

- [ ] **Step 2: Add gallery edit and ZIP actions**

For attraction posts, parse `payload.carousel` and `payload.slideUrls`. In the preview modal add `Edit carousel`, individual ordered slide links, and `Download ZIP`; ZIP fetches each stored URL, throws a clear error on a non-OK response, and calls `buildCarouselZip`. `Edit carousel` closes the modal, switches to editor/make/attraction, and supplies the saved source to `AttractionEditor`.

- [ ] **Step 3: Verify gallery behavior and commit**

Run: `rtk npm run lint -- components/admin/views/marketing/InstagramStudioView.tsx components/admin/instagram/AttractionEditor.tsx`  
Expected: no lint errors.

```bash
rtk git add components/admin/views/marketing/InstagramStudioView.tsx components/admin/instagram/AttractionEditor.tsx
rtk git commit -m "feat(instagram): reopen and download saved carousels"
```

### Task 10: Complete automated and browser verification

**Files:**
- Modify only if verification exposes a scoped defect in files from Tasks 1–9.

- [ ] **Step 1: Run pure tests**

Run: `rtk node --test lib/admin/instagram.test.mjs lib/admin/attractionCarousel.test.mjs lib/admin/instagramVehicles.test.mjs lib/admin/carouselExport.test.mjs`  
Expected: all tests PASS.

- [ ] **Step 2: Run lint, type-check, and production build**

Run: `rtk npm run lint`  
Expected: exit 0.

Run: `rtk npx tsc --noEmit -p tsconfig.json`  
Expected: exit 0.

Run: `rtk npm run build`  
Expected: Next.js production build succeeds and `/api/instagram/attraction-carousel` appears in route output.

- [ ] **Step 3: Run desktop browser verification**

Run: `rtk npm run dev`, open Instagram Studio → Atraksi & Event, and verify:

1. Enter Songkran topic and upload at least four photos.
2. Generate both a four-slide and five-slide result.
3. Edit and regenerate one slide; verify other slide IDs/content remain unchanged.
4. Add, duplicate, move, and remove pages.
5. Remove the transport page and confirm the warning; add a new transport page.
6. Select vehicle options and compare rendered images/sell prices with Price List.
7. Download selected PNG, all PNGs, and ZIP; inspect dimensions and order.
8. Save, open from gallery, download again, and reopen for editing.

- [ ] **Step 4: Run narrow viewport verification**

At 390×844, repeat slide selection, editing, adding/removing, vehicle selection, and export. Confirm no critical control is hidden or requires horizontal page scrolling.

- [ ] **Step 5: Commit verification-only fixes if any**

```bash
rtk git add components/admin/instagram app/api/instagram lib/admin package.json package-lock.json
rtk git commit -m "fix(instagram): resolve carousel verification findings"
```

Do not create this commit when verification required no code changes.
