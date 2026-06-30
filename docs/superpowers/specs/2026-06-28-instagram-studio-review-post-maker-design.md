# Instagram Studio — Review Post Maker

**Date:** 2026-06-28
**Status:** Approved design, pending implementation plan

## Goal

Give admin a tool to turn a guest photo + the customer's feedback into a
branded, ready-to-post social image, plus an AI-generated caption. Output is a
downloadable PNG (admin posts manually) and a saved gallery of past posts.

Replaces the `InstagramStudioView` placeholder in
`components/admin/views/marketing/MarketingViews.tsx`. The panel tab already
exists (`{ id: "instagram", label: "Instagram Studio" }`).

## Scope

In scope:
- Upload a guest photo.
- Enter / prefill the review (text, customer name, city, star rating, destination).
- AI **polish** of the raw review text (clean + tighten, same language, no fabrication).
- 6 brand templates (overlay layouts), each rendering at 3 formats.
- AI **caption** generator (Indonesian + hashtags + soft CTA).
- Export to PNG (download) + save to a gallery.
- Brand logo + colors stored in settings.

Out of scope (YAGNI):
- Direct posting to Instagram/Facebook APIs.
- Video / Reel rendering (only static covers via 9:16 format).
- Multi-language captions (Indonesian only — confirmed).
- A reviews/testimony database (none exists; review text is entered per post).

## Output formats

Every template renders at three aspect ratios:
- **Portrait 4:5** (1080×1350) — IG feed default, used in mockups.
- **Square 1:1** (1080×1080).
- **Story/Reel 9:16** (1080×1920).

Templates are responsive to the format prop; text/blocks reflow per ratio.

## Templates (6, rotation set)

Admin picks one per post; a **shuffle** button rotates so posts vary.

- **A — Gradient band:** review on a dark bottom fade, photo dominates. Editorial.
- **B — Floating card:** white card holds the review. Most readable, strong brand frame.
- **C — Framed + footer:** photo framed in a navy card, review in a solid footer. Postcard feel.
- **D — Top band:** review at top, photo open below (mirror of A).
- **E — Split:** photo on the top portion, bold quote on a navy block below.
- **F — Yellow badge:** photo-forward, small yellow quote chip in a corner.

All show: brand logo (or text wordmark fallback), star rating, review text,
customer name + city. Reference mockups live in
`.superpowers/brainstorm/37540-1782646347/content/` (layout.html, variety.html).

## Architecture / files

### View
`components/admin/views/marketing/InstagramStudioView.tsx` — real implementation,
two-pane layout (input panel left, live preview right), matching the other
builder views. Replaces the placeholder export. Includes a **Gallery** sub-view.

### Templates
`components/admin/instagram/templates/` — 6 presentational components, each
`(props: { data: PostData; format: PostFormat }) => JSX`. Pure, no data fetching.
A `TEMPLATES` registry maps id → component + label for the picker and shuffle.

### AI routes (mirror `app/api/itinerary/route.ts` OpenAI pattern)
- `app/api/instagram/polish/route.ts` — input raw review text; returns a cleaned,
  tightened version in the **same language**, preserving meaning, **no fabrication**
  (no invented details, names, or claims). Uses `OPENAI_API_KEY` / `OPENAI_MODEL`.
- `app/api/instagram/caption/route.ts` — input review + customer name + destination;
  returns an Indonesian caption + relevant hashtags + a soft WA/DM CTA.

Prompt-building logic is extracted into pure functions (e.g.
`lib/admin/instagram.ts`) so it is unit-testable without network or browser.

### Export
Client renders the selected template node and uses **`html-to-image`** (`toPng`)
at the target pixel size for the chosen format. Then:
1. Upload the PNG to the `social-posts` bucket (get public URL).
2. Insert a row into `social_posts`.
3. Trigger a browser download of the PNG.

Upload happens **before** the DB insert so a failed upload never leaves a row
pointing at a missing image.

New dependency: `html-to-image` (framework-agnostic DOM→PNG, works with React 19).

### Storage & data
- New **public** Supabase bucket `social-posts` (holds both uploaded guest photos
  and exported posts).
- New table via migration `scripts/migrations/015-social-posts.sql`:

```sql
create table social_posts (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,        -- exported PNG
  photo_url text,                 -- source guest photo
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

### Brand settings
Extend `SettingKey` in `lib/admin/settings.ts` with:
- `brand_logo` — uploaded PNG public URL (transparent logo).
- `brand_colors` — `{ navy, yellow }`, defaults `#1B2A4A` / `#F5C518`.

Logo uploaded via the existing storage helper pattern (`lib/admin/storage.ts`).
Templates read logo + colors; missing logo → text wordmark fallback.

## Data model

`PostData` (drives every template):
```ts
interface PostData {
  photoUrl: string;
  reviewText: string;
  customerName: string;
  city: string;
  destination: string;
  rating: number;      // 1–5
  logoUrl: string | null;
  brandColors: { navy: string; yellow: string };
}
type PostFormat = "4x5" | "1x1" | "9x16";
```

## Flow

1. Upload guest photo → uploaded to `social-posts` bucket → `photoUrl`.
2. Pick customer from `customers` table (prefills name/city) **or** type manually.
3. Type raw review → optional **"Rapikan dengan AI"** → polished text.
4. Set star rating + destination.
5. Pick format (4:5 / 1:1 / 9:16) + template (6, with **shuffle**) → live preview updates.
6. **"Buat caption"** → Indonesian caption + hashtags.
7. **Export** → render node to PNG → upload → save row → download.
8. **Gallery** tab → list past posts (thumbnail + caption + re-download).

## Error handling

- AI routes return graceful JSON errors like existing routes; missing
  `OPENAI_API_KEY` → clear user-facing message; the live preview never blocks on AI.
- Missing logo → text wordmark fallback (mockup style).
- Export failure → inline error note; no half-saved row (upload-then-insert order).
- Photo upload failure → inline error; cannot export without a photo.

## Testing

No global test runner is configured; follow the existing node `.mjs` pattern
(`lib/admin/*.test.mjs`). Cover the pure functions:
- caption prompt builder (includes review, name, destination; requests ID + hashtags).
- polish prompt builder (enforces same-language, no-fabrication instruction).
- format → pixel-size mapping.
- `PostData` defaults / normalization.

Template components and export are visual/browser-bound — verified manually in
the admin panel, not unit-tested.

## Reference

- Mockups: `.superpowers/brainstorm/37540-1782646347/content/layout.html`, `variety.html`
- AI pattern: `app/api/itinerary/route.ts`
- Settings pattern: `lib/admin/settings.ts`, `scripts/migrations/010-app-settings.sql`
- Storage pattern: `lib/admin/storage.ts`
- Panel wiring: `app/admin/(panel)/page.tsx`
