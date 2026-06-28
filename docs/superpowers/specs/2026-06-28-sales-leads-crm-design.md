# Sales Leads CRM — design

Date: 2026-06-28
Branch: admin-dashboard

## Problem

The admin does outbound/inbound sales across Instagram, WhatsApp, Facebook,
TikTok, and the website, but has nowhere to track a lead through the sales
funnel. They want to:

1. Capture a lead from any channel (name + handle/phone + source).
2. Move it through a funnel: **outreach → in contact → interested → closed
   (won)**, with **not interested** as a dead branch.
3. Message the lead with a stage-appropriate template (WhatsApp deep link where
   possible; copy-paste elsewhere).
4. When a lead is won, turn it into an order in the existing system.

The Marketing panel already has a "Leads" tab, currently a "Segera hadir"
placeholder (`components/admin/views/marketing/MarketingViews.tsx`). This feature
replaces that placeholder with a working kanban CRM.

## Current state

- `LeadsView` is a placeholder exported from `MarketingViews.tsx`, mounted by the
  Marketing role tabs in `app/admin/(panel)/page.tsx`.
- No `leads` table exists. Latest migration is `013-document-template-brochures`.
- Orders auto-assign `order_number` via a `BEFORE INSERT` trigger
  (`orders_assign_number`, migration 007) — so a minimal order insert that omits
  `order_number` is safe.
- Reusable pieces: `lib/admin/settings.ts` (`loadSetting`/`saveSetting` over
  `app_settings`), `components/admin/Modal.tsx`, `components/admin/ui.ts`
  (`inputCls`/`btnCls`/`btnSecondaryCls`/`ErrorNote`), `lib/admin/utils.ts`
  (`formatIDR`).

## Design

### 1. Data model — `leads` table (migration `014-leads.sql`)

```sql
create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  name              text not null default '',
  channel           text not null default 'other'
                      check (channel in ('instagram','whatsapp','facebook','tiktok','website','other')),
  handle            text,            -- @username or profile URL (IG/FB/TikTok)
  phone             text,            -- digits; used for the WhatsApp deep link
  stage             text not null default 'outreach'
                      check (stage in ('outreach','in_contact','interested','not_interested','closed')),
  note              text,
  est_value_idr     numeric not null default 0,
  order_id          uuid references orders(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_contacted_at timestamptz
);

create index if not exists leads_stage_idx on leads (stage, updated_at desc);

alter table leads enable row level security;
drop policy if exists "team full access" on leads;
create policy "team full access" on leads
  for all to authenticated using (true) with check (true);
```

### 2. Domain module — `lib/admin/leads.ts`

Types + centralized metadata + CRUD. Single source for stage/channel order,
labels, and colors so the board and cards stay consistent.

```ts
export type LeadStage =
  | "outreach" | "in_contact" | "interested" | "not_interested" | "closed";
export type LeadChannel =
  | "instagram" | "whatsapp" | "facebook" | "tiktok" | "website" | "other";

export interface Lead {
  id: string;
  name: string;
  channel: LeadChannel;
  handle: string | null;
  phone: string | null;
  stage: LeadStage;
  note: string | null;
  est_value_idr: number;
  order_id: string | null;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
}

// Column order for the board; not_interested sits last as the dead branch.
export const LEAD_STAGES: LeadStage[] =
  ["outreach","in_contact","interested","closed","not_interested"];
export const STAGE_LABELS: Record<LeadStage,string>;   // Indonesian labels
export const STAGE_COLORS: Record<LeadStage,string>;   // Tailwind chip classes
export const CHANNELS: LeadChannel[];
export const CHANNEL_META: Record<LeadChannel,{ label:string; short:string; color:string }>;

export async function listLeads(): Promise<Lead[]>;        // newest-updated first
export async function createLead(patch: Partial<Lead>): Promise<Lead | null>;
export async function updateLead(id: string, patch: Partial<Lead>): Promise<void>;
export async function deleteLead(id: string): Promise<void>;
```

Default stage message templates live here too (seed for the template editor):

```ts
export const DEFAULT_TEMPLATES: Record<LeadStage,string>;
// e.g. outreach: "Halo {nama}! Terima kasih sudah tertarik dengan paket tour
//   Thailand kami. Boleh saya bantu rencanakan perjalanannya? 😊"
```

### 3. Messaging — `lib/admin/leadMessaging.ts` (pure, testable)

No Supabase/React imports — unit-tested with `.test.mjs`.

```ts
/** Replace {nama} (and trim) with the lead's name. Unknown placeholders kept. */
export function fillTemplate(template: string, lead: { name: string }): string;

/** wa.me link with prefilled text, or null when there's no usable phone. */
export function waLink(phone: string | null, text: string): string | null;

/** Public profile URL for a handle on a channel, or null when not derivable.
 *  Accepts a full URL (returned as-is) or a bare @handle. */
export function profileUrl(channel: LeadChannel, handle: string | null): string | null;
```

`waLink` strips non-digits from `phone`; returns null if empty.
`profileUrl`: instagram → `https://instagram.com/<handle>`, tiktok →
`https://www.tiktok.com/@<handle>`, facebook → `https://facebook.com/<handle>`,
website/other → the handle if it looks like a URL, else null.

### 4. Board UI — `components/admin/views/LeadsView.tsx`

Kanban replacing the placeholder.

- Loads `listLeads()` on mount; groups by `stage` in `LEAD_STAGES` order.
- Horizontal row of columns (overflow-x scroll on phone). Each column:
  header = `STAGE_LABELS[stage]` + count + Σ est_value; body = `LeadCard`s.
- **+ Lead** button → create modal (name, channel, handle, phone, stage,
  est value) via `createLead`, then refresh.
- **Move stage:** HTML5 drag-and-drop between columns on desktop
  (`draggable` cards; column `onDragOver`/`onDrop` → `updateLead(id,{stage})`).
  On phone, stage is changed from the detail modal's stage `<select>` (drag is
  unreliable on touch; the modal is the always-available path).
- Header has a **"Template pesan"** button → `LeadTemplatesModal`.

### 5. `components/admin/LeadCard.tsx`

Presentational card: name, channel badge (`CHANNEL_META`), handle/phone,
est value, and a "→ ORD-xxxx" marker when `order_id` is set. `draggable`;
`onClick` opens the detail modal. Receives the lead + handlers as props.

### 6. `components/admin/LeadDetail.tsx`

Edit + act on one lead, inside a `Modal`.

- Fields: name, channel, handle, phone, stage (`<select>`), est value, note.
  Edits saved via `updateLead` (explicit "Simpan" button; this is a form, not an
  autosave surface).
- **Message block:** shows the current stage's template (from saved settings or
  `DEFAULT_TEMPLATES`), filled via `fillTemplate`.
  - If `waLink(phone, filled)` is non-null → **"Kirim WA"** opens it in a new tab.
  - **"Salin pesan"** copies the filled text to clipboard.
  - If `profileUrl(...)` is non-null → **"Buka profil"** opens it.
  - Any send action sets `last_contacted_at = now()` via `updateLead`.
- **Convert (stage === "closed" and no order yet):** **"Buat order"** —
  1. insert a `customers` row `{ name, phone }`, get its id;
  2. insert an `orders` row `{ customer_id, status: 'inquiry', notes: 'Dari lead ·
     <channel>' }` (order_number auto-assigned by trigger), get its id;
  3. `updateLead(id, { order_id })`.
  Then show **"Buka order"** linking to `/admin/orders/<id>`. If the lead already
  has `order_id`, show that link instead of the convert button.
- **Delete** lead (confirm).

### 7. `components/admin/LeadTemplatesModal.tsx`

Editor for the five per-stage templates. Loads `loadSetting<Record<LeadStage,
string>>("lead_templates")` (falling back to `DEFAULT_TEMPLATES`), lets the admin
edit each, saves via `saveSetting("lead_templates", ...)`. Shows the `{nama}`
placeholder hint.

### 8. Wiring

- `MarketingViews.tsx` — remove the `LeadsView` placeholder function (keep
  `BlogView`, `InstagramStudioView`).
- `app/admin/(panel)/page.tsx` — change the marketing import so `LeadsView` comes
  from `@/components/admin/views/LeadsView` instead of the marketing barrel.

## Data flow

```
LeadsView mount → listLeads() → group by stage → columns
  + Lead        → createLead(patch) → refresh
  drag card     → updateLead(id,{stage}) → refresh
  open card     → LeadDetail(lead)
                    edit + Simpan → updateLead
                    Kirim WA / Salin / Buka profil → leadMessaging + last_contacted_at
                    Buat order (closed) → insert customer+order → updateLead({order_id})
  Template pesan→ LeadTemplatesModal → loadSetting/saveSetting("lead_templates")
```

## Testing

- `lib/admin/leadMessaging.test.mjs` (`node --test`): `fillTemplate` replaces
  `{nama}` and leaves unknown placeholders; `waLink` strips non-digits and
  returns null on empty; `profileUrl` builds correct per-channel URLs, passes
  through full URLs, and returns null when not derivable.
- Everything else (DB-bound, UI) verified with `npm run build` + `npm run lint`
  + the manual checks in the plan (no live Supabase in this environment).

## Out of scope (this round)

- No dashboard "Leads pipeline" card (add later if the CRM gets used).
- No automated/scheduled messaging — sending is manual via the deep link/copy.
- No inbound webhook/API ingestion from IG/WA/etc — leads are entered by hand.
- No multi-user assignment, activity timeline, or reminders.
- Convert-to-order creates a stub `inquiry` order; pricing/itinerary are done
  later in the existing order flow.

## Files

- `scripts/migrations/014-leads.sql` (new)
- `lib/admin/leads.ts` (new)
- `lib/admin/leadMessaging.ts` (new) + `lib/admin/leadMessaging.test.mjs` (new)
- `components/admin/views/LeadsView.tsx` (new)
- `components/admin/LeadCard.tsx` (new)
- `components/admin/LeadDetail.tsx` (new)
- `components/admin/LeadTemplatesModal.tsx` (new)
- `components/admin/views/marketing/MarketingViews.tsx` (modify — drop placeholder)
- `app/admin/(panel)/page.tsx` (modify — import LeadsView from new file)
</content>
