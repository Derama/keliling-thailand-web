# Instagram Studio — Review Post Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin "Instagram Studio" that turns a guest photo + customer review into a branded, downloadable PNG post (6 templates × 3 formats) with AI-polished review text and an AI-generated Indonesian caption, saved to a gallery.

**Architecture:** A two-pane client view (`InstagramStudioView`) drives a `PostData` object into one of 6 pure template components rendered at a chosen format size. Two OpenAI API routes (polish + caption) reuse the existing `app/api/*` pattern. Export uses `html-to-image` to rasterize the template node, uploads the PNG + source photo to a Supabase bucket, and records a row in a new `social_posts` table. Brand logo/colors live in `app_settings`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase (storage + Postgres), OpenAI SDK v6, `html-to-image`, node `--test` for unit tests.

---

## File Structure

- `scripts/migrations/015-social-posts.sql` — new table (run manually in Supabase).
- `lib/admin/instagram.ts` — pure types + helpers: `PostData`, `PostFormat`, `FORMAT_SIZES`, `defaultPostData`, `buildPolishPrompt`, `buildCaptionMessages`, `TEMPLATE_IDS`.
- `lib/admin/instagram.test.mjs` — unit tests for the pure helpers.
- `lib/admin/types.ts` — add `SocialPost` interface (modify).
- `lib/admin/settings.ts` — extend `SettingKey` + add `BrandSettings` type + defaults (modify).
- `lib/admin/socialPosts.ts` — data access: `uploadPostImage`, `saveSocialPost`, `listSocialPosts`.
- `app/api/instagram/polish/route.ts` — AI review polish.
- `app/api/instagram/caption/route.ts` — AI caption generator.
- `components/admin/instagram/parts.tsx` — shared `Logo`, `Stars` presentational bits.
- `components/admin/instagram/templates/{TemplateA..F}.tsx` — 6 template components.
- `components/admin/instagram/templates/index.ts` — `TEMPLATES` registry.
- `components/admin/instagram/PostPreview.tsx` — scales the active template to fit the preview pane.
- `components/admin/views/marketing/InstagramStudioView.tsx` — main view (new file, default export).
- `app/admin/(panel)/page.tsx` — switch the import to the new file (modify).
- `components/admin/views/marketing/MarketingViews.tsx` — remove the `InstagramStudioView` placeholder (modify).

---

## Task 1: Database migration + storage bucket

**Files:**
- Create: `scripts/migrations/015-social-posts.sql`

- [ ] **Step 1: Write the migration**

Create `scripts/migrations/015-social-posts.sql`:

```sql
-- Migration: social_posts — gallery of generated Instagram review posts.
-- Also create a PUBLIC storage bucket named "social-posts" in the Supabase
-- dashboard (Storage → New bucket → name "social-posts", Public = on).
-- Run this SQL once in the Supabase SQL Editor.

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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrations/015-social-posts.sql
git commit -m "feat(admin): social_posts migration for Instagram Studio"
```

> NOTE for the human operator: run this SQL in Supabase and create the public
> `social-posts` bucket before the feature can save/export. Code degrades with a
> clear error if the bucket/table are missing.

---

## Task 2: Install html-to-image

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the dependency**

Run: `npm install html-to-image@^1.11.13`
Expected: adds `html-to-image` to `dependencies`, updates lockfile.

- [ ] **Step 2: Verify it resolves**

Run: `node -e "require('html-to-image'); console.log('ok')"`
Expected: prints `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add html-to-image for post export"
```

---

## Task 3: Pure lib — types, format sizes, defaults

**Files:**
- Create: `lib/admin/instagram.ts`
- Test: `lib/admin/instagram.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `lib/admin/instagram.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  FORMAT_SIZES,
  defaultPostData,
  buildPolishPrompt,
  buildCaptionMessages,
  TEMPLATE_IDS,
} from "./instagram.ts";

test("FORMAT_SIZES gives 1080px-wide canvases per ratio", () => {
  assert.deepEqual(FORMAT_SIZES["4x5"], { w: 1080, h: 1350 });
  assert.deepEqual(FORMAT_SIZES["1x1"], { w: 1080, h: 1080 });
  assert.deepEqual(FORMAT_SIZES["9x16"], { w: 1080, h: 1920 });
});

test("defaultPostData seeds brand colors and empty content", () => {
  const d = defaultPostData();
  assert.equal(d.reviewText, "");
  assert.equal(d.rating, 5);
  assert.equal(d.brandColors.navy, "#1B2A4A");
  assert.equal(d.brandColors.yellow, "#F5C518");
});

test("TEMPLATE_IDS lists the six layouts", () => {
  assert.deepEqual(TEMPLATE_IDS, ["A", "B", "C", "D", "E", "F"]);
});

test("buildPolishPrompt forbids fabrication and keeps language", () => {
  const { system, user } = buildPolishPrompt("Tournya bgus bgt mantap");
  assert.match(system, /same language/i);
  assert.match(system, /not (invent|add|fabricate)/i);
  assert.match(user, /Tournya bgus bgt mantap/);
});

test("buildCaptionMessages includes review, name, destination", () => {
  const msgs = buildCaptionMessages({
    reviewText: "Pelayanan ramah",
    customerName: "Ibu Sari",
    destination: "Bangkok",
  });
  const userMsg = msgs.find((m) => m.role === "user").content;
  assert.match(userMsg, /Pelayanan ramah/);
  assert.match(userMsg, /Ibu Sari/);
  assert.match(userMsg, /Bangkok/);
  const sysMsg = msgs.find((m) => m.role === "system").content;
  assert.match(sysMsg, /Bahasa Indonesia/i);
  assert.match(sysMsg, /hashtag/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/admin/instagram.test.mjs`
Expected: FAIL — cannot find module `./instagram.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/admin/instagram.ts`:

```ts
export type PostFormat = "4x5" | "1x1" | "9x16";
export type TemplateId = "A" | "B" | "C" | "D" | "E" | "F";

export const TEMPLATE_IDS: TemplateId[] = ["A", "B", "C", "D", "E", "F"];

export const FORMAT_SIZES: Record<PostFormat, { w: number; h: number }> = {
  "4x5": { w: 1080, h: 1350 },
  "1x1": { w: 1080, h: 1080 },
  "9x16": { w: 1080, h: 1920 },
};

export const FORMAT_LABELS: Record<PostFormat, string> = {
  "4x5": "Portrait 4:5",
  "1x1": "Square 1:1",
  "9x16": "Story 9:16",
};

export interface BrandColors {
  navy: string;
  yellow: string;
}

export interface PostData {
  photoUrl: string;
  reviewText: string;
  customerName: string;
  city: string;
  destination: string;
  rating: number; // 1–5
  logoUrl: string | null;
  brandColors: BrandColors;
}

export function defaultPostData(): PostData {
  return {
    photoUrl: "",
    reviewText: "",
    customerName: "",
    city: "",
    destination: "",
    rating: 5,
    logoUrl: null,
    brandColors: { navy: "#1B2A4A", yellow: "#F5C518" },
  };
}

/** Prompt for tightening a raw, possibly-messy review without inventing facts. */
export function buildPolishPrompt(raw: string): { system: string; user: string } {
  const system = `You clean up short customer reviews for a travel company's social posts.
Rules:
- Reply in the SAME language as the input.
- Fix spelling, grammar, and spacing; make it warm and natural.
- Keep it to 1-2 short sentences suitable for a photo overlay.
- Do NOT invent, add, or fabricate any detail, place, name, or claim not present in the input.
- Plain text only — no quotes, no hashtags, no emoji.`;
  const user = `Review mentah:\n${raw}`;
  return { system, user };
}

export interface CaptionInput {
  reviewText: string;
  customerName: string;
  destination: string;
}

/** Chat messages for the Indonesian caption + hashtags generator. */
export function buildCaptionMessages(
  input: CaptionInput
): Array<{ role: "system" | "user"; content: string }> {
  const system = `Kamu menulis caption Instagram untuk "Keliling Thailand", jasa tour privat asal Indonesia di Thailand.
Aturan:
- Tulis dalam Bahasa Indonesia, hangat dan mengundang.
- 2-4 kalimat berdasarkan ulasan pelanggan dan destinasi.
- Akhiri dengan ajakan lembut untuk DM / WhatsApp.
- Tambahkan satu baris berisi 8-12 hashtag relevan (wisata Thailand + destinasi).
- Jangan mengarang detail yang tidak disebut. Jangan pakai markdown.`;
  const user = `Ulasan: ${input.reviewText || "(kosong)"}
Nama pelanggan: ${input.customerName || "(tanpa nama)"}
Destinasi: ${input.destination || "Thailand"}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/admin/instagram.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/admin/instagram.ts lib/admin/instagram.test.mjs
git commit -m "feat(admin): instagram studio pure lib (types, formats, prompts)"
```

---

## Task 4: Brand settings + SocialPost type

**Files:**
- Modify: `lib/admin/settings.ts`
- Modify: `lib/admin/types.ts`

- [ ] **Step 1: Extend SettingKey and add brand helpers**

In `lib/admin/settings.ts`, change the `SettingKey` type line and append the brand block at the end of the file:

Change:
```ts
export type SettingKey = "itinerary_travel_tips";
```
to:
```ts
export type SettingKey =
  | "itinerary_travel_tips"
  | "brand_logo"
  | "brand_colors";
```

Append at end of file:
```ts
export interface BrandColors {
  navy: string;
  yellow: string;
}

export const DEFAULT_BRAND_COLORS: BrandColors = {
  navy: "#1B2A4A",
  yellow: "#F5C518",
};

/** Logo URL stored under the brand_logo key, or null. */
export async function loadBrandLogo(): Promise<string | null> {
  return loadSetting<string>("brand_logo");
}

export async function saveBrandLogo(url: string): Promise<void> {
  return saveSetting<string>("brand_logo", url);
}

export async function loadBrandColors(): Promise<BrandColors> {
  return (await loadSetting<BrandColors>("brand_colors")) ?? DEFAULT_BRAND_COLORS;
}

export async function saveBrandColors(colors: BrandColors): Promise<void> {
  return saveSetting<BrandColors>("brand_colors", colors);
}
```

- [ ] **Step 2: Add the SocialPost type**

In `lib/admin/types.ts`, append:
```ts
export interface SocialPost {
  id: string;
  image_url: string;
  photo_url: string | null;
  review_text: string | null;
  customer_name: string | null;
  city: string | null;
  destination: string | null;
  rating: number | null;
  caption: string | null;
  template: string | null;
  format: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "itinerary-print-check" | grep "settings.ts\|types.ts" || echo "clean"`
Expected: `clean`

- [ ] **Step 4: Commit**

```bash
git add lib/admin/settings.ts lib/admin/types.ts
git commit -m "feat(admin): brand settings helpers + SocialPost type"
```

---

## Task 5: Social posts data access

**Files:**
- Create: `lib/admin/socialPosts.ts`

- [ ] **Step 1: Write the implementation**

Create `lib/admin/socialPosts.ts`:

```ts
"use client";

import { createClient } from "@/lib/supabase/client";
import type { SocialPost } from "@/lib/admin/types";

// Public bucket holding source photos + exported posts.
//   Storage → New bucket → name "social-posts", Public = on.
export const SOCIAL_BUCKET = "social-posts";

/** Upload a file (photo or exported PNG) and return its public URL. */
export async function uploadPostImage(
  file: Blob,
  prefix: "photo" | "post",
  ext = "png"
): Promise<string> {
  const supabase = createClient();
  const path = `${prefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(SOCIAL_BUCKET).upload(path, file);
  if (error) throw error;
  return supabase.storage.from(SOCIAL_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function saveSocialPost(
  row: Omit<SocialPost, "id" | "created_at">
): Promise<void> {
  const { error } = await createClient().from("social_posts").insert(row);
  if (error) throw error;
}

export async function listSocialPosts(): Promise<SocialPost[]> {
  const { data, error } = await createClient()
    .from("social_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "socialPosts.ts" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add lib/admin/socialPosts.ts
git commit -m "feat(admin): social posts storage + table access"
```

---

## Task 6: AI route — review polish

**Files:**
- Create: `app/api/instagram/polish/route.ts`

- [ ] **Step 1: Write the implementation**

Create `app/api/instagram/polish/route.ts` (mirrors `app/api/place-description/route.ts`):

```ts
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { buildPolishPrompt } from "@/lib/admin/instagram";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { text: { type: "string" } },
  required: ["text"],
} as const;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY belum di-set di server." },
      { status: 500 }
    );
  }

  let raw = "";
  try {
    const body = await request.json();
    raw = String(body?.text ?? "").trim();
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (!raw) {
    return Response.json({ error: "Isi ulasan dulu." }, { status: 400 });
  }

  try {
    const { system, user: userMsg } = buildPolishPrompt(raw);
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "polish", strict: true, schema: SCHEMA },
      },
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return Response.json(JSON.parse(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "polish/route" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add app/api/instagram/polish/route.ts
git commit -m "feat(admin): AI review-polish route"
```

---

## Task 7: AI route — caption generator

**Files:**
- Create: `app/api/instagram/caption/route.ts`

- [ ] **Step 1: Write the implementation**

Create `app/api/instagram/caption/route.ts`:

```ts
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { buildCaptionMessages } from "@/lib/admin/instagram";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { caption: { type: "string" } },
  required: ["caption"],
} as const;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY belum di-set di server." },
      { status: 500 }
    );
  }

  let reviewText = "";
  let customerName = "";
  let destination = "";
  try {
    const body = await request.json();
    reviewText = String(body?.reviewText ?? "").trim();
    customerName = String(body?.customerName ?? "").trim();
    destination = String(body?.destination ?? "").trim();
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }

  try {
    const messages = buildCaptionMessages({ reviewText, customerName, destination });
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "caption", strict: true, schema: SCHEMA },
      },
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return Response.json(JSON.parse(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "caption/route" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add app/api/instagram/caption/route.ts
git commit -m "feat(admin): AI caption-generator route"
```

---

## Task 8: Shared template parts

**Files:**
- Create: `components/admin/instagram/parts.tsx`

- [ ] **Step 1: Write the implementation**

Create `components/admin/instagram/parts.tsx`:

```tsx
import type { PostData } from "@/lib/admin/instagram";

/** Brand logo chip — uses the uploaded logo, else a text wordmark fallback. */
export function Logo({
  data,
  className = "",
  style,
}: {
  data: PostData;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { logoUrl, brandColors } = data;
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logoUrl}
        alt="logo"
        crossOrigin="anonymous"
        className={className}
        style={{ height: 48, width: "auto", objectFit: "contain", ...style }}
      />
    );
  }
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: brandColors.navy,
        color: "#fff",
        padding: "8px 16px",
        borderRadius: 999,
        fontSize: 22,
        fontWeight: 700,
        ...style,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: brandColors.yellow,
        }}
      />
      Keliling Thailand
    </div>
  );
}

/** Star row, filled to `rating` out of 5, in the brand yellow. */
export function Stars({
  rating,
  color,
  size = 28,
}: {
  rating: number;
  color: string;
  size?: number;
}) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span style={{ color, fontSize: size, letterSpacing: 3 }}>
      {"★".repeat(full)}
      <span style={{ opacity: 0.3 }}>{"★".repeat(5 - full)}</span>
    </span>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "parts.tsx" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add components/admin/instagram/parts.tsx
git commit -m "feat(admin): shared logo + stars template parts"
```

---

## Task 9: Template components A–F + registry

**Files:**
- Create: `components/admin/instagram/templates/TemplateA.tsx` … `TemplateF.tsx`
- Create: `components/admin/instagram/templates/index.ts`

All templates share this signature:

```ts
import type { PostData, PostFormat } from "@/lib/admin/instagram";
export interface TemplateProps { data: PostData; format: PostFormat; }
```

The root element MUST be a fixed-size box matching `FORMAT_SIZES[format]`
(width/height in px). Photos use `crossOrigin="anonymous"` so html-to-image can
rasterize them. Use the `Logo` and `Stars` parts. The photo is rendered with a
background-image div using `data.photoUrl`.

- [ ] **Step 1: TemplateA (gradient band)**

Create `components/admin/instagram/templates/TemplateA.tsx`:

```tsx
import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateA({
  data,
  format,
}: {
  data: PostData;
  format: PostFormat;
}) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        color: "#fff",
        background: "#0f1422",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(10,15,30,.92) 0%, rgba(10,15,30,.5) 35%, transparent 60%)",
        }}
      />
      <div style={{ position: "absolute", top: 40, left: 40 }}>
        <Logo data={data} />
      </div>
      <div style={{ position: "absolute", bottom: 0, padding: 56, width: "100%" }}>
        <Stars rating={data.rating} color={data.brandColors.yellow} />
        <p style={{ fontSize: 44, lineHeight: 1.3, fontWeight: 600, margin: "16px 0" }}>
          “{data.reviewText}”
        </p>
        <p style={{ fontSize: 30, opacity: 0.85 }}>
          — {data.customerName}
          {data.city ? `, ${data.city}` : ""}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TemplateB (floating card)**

Create `components/admin/instagram/templates/TemplateB.tsx`:

```tsx
import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateB({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: "#0f1422" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", top: 40, left: 40 }}>
        <Logo data={data} />
      </div>
      <div style={{ position: "absolute", left: 48, right: 48, bottom: 56, background: "#fff", color: data.brandColors.navy, borderRadius: 28, padding: 44, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ height: 10, width: 96, background: data.brandColors.yellow, borderRadius: 6, marginBottom: 22 }} />
        <Stars rating={data.rating} color={data.brandColors.yellow} />
        <p style={{ fontSize: 40, lineHeight: 1.35, fontWeight: 600, margin: "16px 0" }}>“{data.reviewText}”</p>
        <p style={{ fontSize: 28, color: "#64748b" }}>{data.customerName}{data.city ? ` · ${data.city}` : ""}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TemplateC (framed + footer)**

Create `components/admin/instagram/templates/TemplateC.tsx`:

```tsx
import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateC({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div style={{ width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: data.brandColors.navy, color: "#fff", display: "flex", flexDirection: "column", padding: 44, boxSizing: "border-box" }}>
      <div style={{ marginBottom: 28 }}><Logo data={data} /></div>
      <div style={{ flex: 1, borderRadius: 24, backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center", background: data.photoUrl ? undefined : "#0f1422" }} />
      <div style={{ paddingTop: 32 }}>
        <Stars rating={data.rating} color={data.brandColors.yellow} />
        <p style={{ fontSize: 38, lineHeight: 1.35, fontWeight: 600, margin: "14px 0 8px" }}>“{data.reviewText}”</p>
        <p style={{ fontSize: 28, color: data.brandColors.yellow, fontWeight: 700 }}>— {data.customerName}{data.city ? `, ${data.city}` : ""}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: TemplateD (top band)**

Create `components/admin/instagram/templates/TemplateD.tsx`:

```tsx
import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateD({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", color: "#fff", background: "#0f1422" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(10,15,30,.92) 0%, rgba(10,15,30,.4) 35%, transparent 60%)" }} />
      <div style={{ position: "absolute", top: 40, left: 40 }}><Logo data={data} /></div>
      <div style={{ position: "absolute", top: 150, padding: 56, width: "100%" }}>
        <Stars rating={data.rating} color={data.brandColors.yellow} />
        <p style={{ fontSize: 44, lineHeight: 1.3, fontWeight: 600, margin: "16px 0" }}>“{data.reviewText}”</p>
        <p style={{ fontSize: 30, opacity: 0.85 }}>— {data.customerName}{data.city ? `, ${data.city}` : ""}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: TemplateE (split)**

Create `components/admin/instagram/templates/TemplateE.tsx`:

```tsx
import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateE({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: data.brandColors.navy, color: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "55%", backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center", background: data.photoUrl ? undefined : "#0f1422" }} />
      <div style={{ flex: 1, padding: 56, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Stars rating={data.rating} color={data.brandColors.yellow} />
        <p style={{ fontSize: 48, lineHeight: 1.3, fontWeight: 700, margin: "20px 0" }}>“{data.reviewText}”</p>
        <p style={{ fontSize: 28, color: data.brandColors.yellow, fontWeight: 700 }}>— {data.customerName}{data.city ? `, ${data.city}` : ""}</p>
      </div>
      <div style={{ position: "absolute", top: 40, left: 40 }}><Logo data={data} /></div>
    </div>
  );
}
```

- [ ] **Step 6: TemplateF (yellow badge)**

Create `components/admin/instagram/templates/TemplateF.tsx`:

```tsx
import { FORMAT_SIZES, type PostData, type PostFormat } from "@/lib/admin/instagram";
import { Logo, Stars } from "@/components/admin/instagram/parts";

export default function TemplateF({ data, format }: { data: PostData; format: PostFormat }) {
  const { w, h } = FORMAT_SIZES[format];
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: "system-ui, sans-serif", background: "#0f1422" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: data.photoUrl ? `url(${data.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", top: 40, left: 40 }}><Logo data={data} /></div>
      <div style={{ position: "absolute", bottom: 48, left: 48, right: 160, background: data.brandColors.yellow, color: data.brandColors.navy, borderRadius: 24, padding: "32px 36px" }}>
        <p style={{ fontSize: 38, lineHeight: 1.3, fontWeight: 700 }}>“{data.reviewText}”</p>
        <p style={{ fontSize: 26, marginTop: 12, fontWeight: 700, opacity: 0.75 }}>
          {"★".repeat(Math.max(0, Math.min(5, Math.round(data.rating))))} — {data.customerName}{data.city ? `, ${data.city}` : ""}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Registry**

Create `components/admin/instagram/templates/index.ts`:

```ts
import type { PostData, PostFormat, TemplateId } from "@/lib/admin/instagram";
import TemplateA from "./TemplateA";
import TemplateB from "./TemplateB";
import TemplateC from "./TemplateC";
import TemplateD from "./TemplateD";
import TemplateE from "./TemplateE";
import TemplateF from "./TemplateF";

export type TemplateComponent = (props: {
  data: PostData;
  format: PostFormat;
}) => React.ReactElement;

export const TEMPLATES: Record<
  TemplateId,
  { label: string; Component: TemplateComponent }
> = {
  A: { label: "Gradient band", Component: TemplateA },
  B: { label: "Floating card", Component: TemplateB },
  C: { label: "Framed + footer", Component: TemplateC },
  D: { label: "Top band", Component: TemplateD },
  E: { label: "Split", Component: TemplateE },
  F: { label: "Yellow badge", Component: TemplateF },
};
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "instagram/templates" || echo "clean"`
Expected: `clean`

- [ ] **Step 9: Commit**

```bash
git add components/admin/instagram/templates
git commit -m "feat(admin): 6 instagram post templates + registry"
```

---

## Task 10: Scaled preview component

**Files:**
- Create: `components/admin/instagram/PostPreview.tsx`

The full-size template (1080px wide) must be scaled down to fit the preview
pane. Wrap the template in a box scaled by CSS transform; the wrapper reserves
the scaled height so layout doesn't collapse.

- [ ] **Step 1: Write the implementation**

Create `components/admin/instagram/PostPreview.tsx`:

```tsx
"use client";

import { forwardRef } from "react";
import { FORMAT_SIZES, type PostData, type PostFormat, type TemplateId } from "@/lib/admin/instagram";
import { TEMPLATES } from "@/components/admin/instagram/templates";

/**
 * Renders the active template at full 1080px size inside a scaled wrapper.
 * The forwarded ref points at the FULL-SIZE node so export captures 1080px.
 */
const PostPreview = forwardRef<
  HTMLDivElement,
  { data: PostData; format: PostFormat; templateId: TemplateId; maxWidth?: number }
>(function PostPreview({ data, format, templateId, maxWidth = 360 }, ref) {
  const { w, h } = FORMAT_SIZES[format];
  const scale = maxWidth / w;
  const { Component } = TEMPLATES[templateId];
  return (
    <div style={{ width: maxWidth, height: h * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: w, height: h }}>
        <div ref={ref}>
          <Component data={data} format={format} />
        </div>
      </div>
    </div>
  );
});

export default PostPreview;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "PostPreview" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add components/admin/instagram/PostPreview.tsx
git commit -m "feat(admin): scaled post preview wrapper"
```

---

## Task 11: Main InstagramStudioView

**Files:**
- Create: `components/admin/views/marketing/InstagramStudioView.tsx`
- Modify: `components/admin/views/marketing/MarketingViews.tsx`
- Modify: `app/admin/(panel)/page.tsx`

- [ ] **Step 1: Write the view**

Create `components/admin/views/marketing/InstagramStudioView.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import type { Customer, SocialPost } from "@/lib/admin/types";
import {
  defaultPostData,
  FORMAT_LABELS,
  FORMAT_SIZES,
  TEMPLATE_IDS,
  type PostData,
  type PostFormat,
  type TemplateId,
} from "@/lib/admin/instagram";
import { loadBrandColors, loadBrandLogo, saveBrandColors, saveBrandLogo } from "@/lib/admin/settings";
import { uploadPostImage, saveSocialPost, listSocialPosts } from "@/lib/admin/socialPosts";
import { TEMPLATES } from "@/components/admin/instagram/templates";
import PostPreview from "@/components/admin/instagram/PostPreview";

export default function InstagramStudioView() {
  const [data, setData] = useState<PostData>(defaultPostData());
  const [format, setFormat] = useState<PostFormat>("4x5");
  const [templateId, setTemplateId] = useState<TemplateId>("A");
  const [caption, setCaption] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"make" | "gallery">("make");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Load brand assets + customers once.
  useEffect(() => {
    (async () => {
      const [logo, colors] = await Promise.all([loadBrandLogo(), loadBrandColors()]);
      setData((d) => ({ ...d, logoUrl: logo, brandColors: colors }));
      const { data: cust } = await createClient().from("customers").select("*").order("name");
      setCustomers(cust ?? []);
    })();
  }, []);

  function patch(p: Partial<PostData>) {
    setData((d) => ({ ...d, ...p }));
  }

  async function onPhoto(file: File) {
    setBusy("photo");
    setError(null);
    try {
      const url = await uploadPostImage(file, "photo", file.name.split(".").pop() || "jpg");
      patch({ photoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload foto gagal");
    } finally {
      setBusy(null);
    }
  }

  async function onLogo(file: File) {
    setBusy("logo");
    setError(null);
    try {
      const url = await uploadPostImage(file, "post", file.name.split(".").pop() || "png");
      await saveBrandLogo(url);
      patch({ logoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload logo gagal");
    } finally {
      setBusy(null);
    }
  }

  async function polish() {
    if (!data.reviewText.trim()) return;
    setBusy("polish");
    setError(null);
    try {
      const res = await fetch("/api/instagram/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.reviewText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI gagal");
      patch({ reviewText: json.text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI gagal");
    } finally {
      setBusy(null);
    }
  }

  async function genCaption() {
    setBusy("caption");
    setError(null);
    try {
      const res = await fetch("/api/instagram/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewText: data.reviewText,
          customerName: data.customerName,
          destination: data.destination,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI gagal");
      setCaption(json.caption);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI gagal");
    } finally {
      setBusy(null);
    }
  }

  function shuffle() {
    const others = TEMPLATE_IDS.filter((t) => t !== templateId);
    setTemplateId(others[Math.floor(Math.random() * others.length)]);
  }

  async function exportPost() {
    if (!nodeRef.current) return;
    if (!data.photoUrl) {
      setError("Upload foto tamu dulu.");
      return;
    }
    setBusy("export");
    setError(null);
    try {
      const { w, h } = FORMAT_SIZES[format];
      const dataUrl = await toPng(nodeRef.current, { width: w, height: h, pixelRatio: 1, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const imageUrl = await uploadPostImage(blob, "post", "png");
      await saveSocialPost({
        image_url: imageUrl,
        photo_url: data.photoUrl,
        review_text: data.reviewText,
        customer_name: data.customerName,
        city: data.city,
        destination: data.destination,
        rating: data.rating,
        caption,
        template: templateId,
        format,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `post-${Date.now()}.png`;
      a.click();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export gagal");
    } finally {
      setBusy(null);
    }
  }

  async function openGallery() {
    setTab("gallery");
    setError(null);
    try {
      setPosts(await listSocialPosts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat galeri");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Instagram Studio</h1>
        <div className="flex gap-2">
          <button className={tab === "make" ? btnCls : btnSecondaryCls} onClick={() => setTab("make")}>Buat Post</button>
          <button className={tab === "gallery" ? btnCls : btnSecondaryCls} onClick={openGallery}>Galeri</button>
        </div>
      </div>

      <ErrorNote message={error} />

      {tab === "gallery" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {posts.map((p) => (
            <a key={p.id} href={p.image_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt="" className="aspect-[4/5] w-full object-cover" />
            </a>
          ))}
          {posts.length === 0 && <p className="text-sm text-gray-500">Belum ada post.</p>}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
          {/* Input panel */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <Field label="Foto tamu">
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} className="text-sm" />
            </Field>

            <Field label="Pilih customer (opsional)">
              <select
                className={inputCls}
                onChange={(e) => {
                  const c = customers.find((x) => x.id === e.target.value);
                  if (c) patch({ customerName: c.name, city: c.origin_city ?? "" });
                }}
                defaultValue=""
              >
                <option value="">— manual —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Nama customer">
              <input className={inputCls} value={data.customerName} onChange={(e) => patch({ customerName: e.target.value })} />
            </Field>
            <Field label="Kota">
              <input className={inputCls} value={data.city} onChange={(e) => patch({ city: e.target.value })} />
            </Field>
            <Field label="Destinasi">
              <input className={inputCls} value={data.destination} onChange={(e) => patch({ destination: e.target.value })} placeholder="Bangkok" />
            </Field>

            <Field label="Ulasan">
              <textarea className={`${inputCls} min-h-24`} value={data.reviewText} onChange={(e) => patch({ reviewText: e.target.value })} />
            </Field>
            <button className={btnSecondaryCls} onClick={polish} disabled={busy === "polish"}>
              {busy === "polish" ? "Merapikan…" : "Rapikan dengan AI"}
            </button>

            <Field label="Rating">
              <select className={inputCls} value={data.rating} onChange={(e) => patch({ rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </Field>

            <Field label="Format">
              <select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value as PostFormat)}>
                {(Object.keys(FORMAT_LABELS) as PostFormat[]).map((f) => (
                  <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                ))}
              </select>
            </Field>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Template</span>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_IDS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemplateId(t)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${t === templateId ? "border-[#1B2A4A] bg-[#1B2A4A] text-white" : "border-gray-300 text-gray-700"}`}
                  >
                    {t} · {TEMPLATES[t].label}
                  </button>
                ))}
                <button onClick={shuffle} className={btnSecondaryCls}>Acak</button>
              </div>
            </div>

            <Field label="Logo brand">
              <input type="file" accept="image/png" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} className="text-sm" />
            </Field>

            <div className="flex gap-2 pt-2">
              <button className={btnSecondaryCls} onClick={genCaption} disabled={busy === "caption"}>
                {busy === "caption" ? "Membuat…" : "Buat caption"}
              </button>
              <button className={btnCls} onClick={exportPost} disabled={busy === "export"}>
                {busy === "export" ? "Mengekspor…" : "Export PNG"}
              </button>
            </div>

            {caption && (
              <Field label="Caption">
                <textarea className={`${inputCls} min-h-32`} value={caption} onChange={(e) => setCaption(e.target.value)} />
              </Field>
            )}
          </section>

          {/* Preview */}
          <section className="flex justify-center rounded-xl border border-gray-200 bg-gray-50 p-5">
            <PostPreview ref={nodeRef} data={data} format={format} templateId={templateId} maxWidth={360} />
          </section>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Remove the placeholder export**

In `components/admin/views/marketing/MarketingViews.tsx`, delete the entire
`InstagramStudioView` function (the block from `export function InstagramStudioView() {`
through its closing `}`). Leave `BlogView` and `LeadsView` intact. Also update the
top comment to drop the "Instagram studio" mention.

- [ ] **Step 3: Switch the panel import**

In `app/admin/(panel)/page.tsx`:

Change:
```ts
import {
  BlogView,
  LeadsView,
  InstagramStudioView,
} from "@/components/admin/views/marketing/MarketingViews";
```
to:
```ts
import {
  BlogView,
  LeadsView,
} from "@/components/admin/views/marketing/MarketingViews";
import InstagramStudioView from "@/components/admin/views/marketing/InstagramStudioView";
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "itinerary-print-check" | grep -E "InstagramStudio|MarketingViews|panel/page" || echo "clean"`
Expected: `clean`

Run: `npm run lint 2>&1 | tail -5`
Expected: no errors in the new files.

- [ ] **Step 5: Commit**

```bash
git add components/admin/views/marketing/InstagramStudioView.tsx components/admin/views/marketing/MarketingViews.tsx "app/admin/(panel)/page.tsx"
git commit -m "feat(admin): Instagram Studio view (input, preview, export, gallery)"
```

---

## Task 12: Build verification + manual smoke test

**Files:** none (verification only)

- [ ] **Step 1: Full unit tests**

Run: `node --test lib/admin/instagram.test.mjs`
Expected: PASS.

- [ ] **Step 2: Production build**

Run: `npm run build 2>&1 | tail -20`
Expected: build succeeds; `/api/instagram/polish` and `/api/instagram/caption` appear in the route list.

- [ ] **Step 3: Manual smoke (human, requires Supabase migration + bucket + OPENAI_API_KEY)**

Run: `npm run dev`, open the admin panel → Instagram Studio. Verify:
- Upload a photo → preview shows it.
- Type a messy review → "Rapikan dengan AI" cleans it.
- Switch formats + templates + "Acak" → preview updates.
- "Buat caption" → Indonesian caption + hashtags appear.
- "Export PNG" → downloads a 1080px PNG and the post shows under "Galeri".

- [ ] **Step 4: Commit any fixes from smoke test**

```bash
git add -A
git commit -m "fix(admin): Instagram Studio smoke-test adjustments"
```

---

## Self-Review Notes

- **Spec coverage:** photo upload (T11), prefill from customers + manual (T11), AI polish (T3/T6/T11), 6 templates × 3 formats (T9/T3), caption ID+hashtags (T3/T7/T11), export PNG + save + gallery (T5/T11), brand logo+colors (T4/T11), migration+bucket (T1), html-to-image dep (T2). All spec sections mapped.
- **No placeholders:** every code step contains full code; commands have expected output.
- **Type consistency:** `PostData`/`PostFormat`/`TemplateId` defined in T3 and used identically in T8–T11; `uploadPostImage(file, prefix, ext)` signature consistent across T5 and T11; `TEMPLATES` registry shape matches usage in T10/T11.
