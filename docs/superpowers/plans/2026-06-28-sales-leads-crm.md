# Sales Leads CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A kanban sales-leads CRM in the Marketing panel — capture leads from any channel, move them through a 5-stage funnel, message them with per-stage templates, and convert won leads into orders.

**Architecture:** A `leads` table + a domain module (`lib/admin/leads.ts`) and a pure messaging helper (`lib/admin/leadMessaging.ts`). A board view (`LeadsView`) groups leads by stage into kanban columns; a card component and a detail modal handle display/edit/message/convert; a templates modal edits per-stage messages stored in `app_settings`. Replaces the existing Leads placeholder.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Supabase JS client, Tailwind v4. No UI test runner — pure logic is checked with `node --test` `.mjs`; everything else via `npm run build` + `npm run lint` + manual steps.

---

## Verification conventions

No UI test runner in this repo. Per task:
- Pure-logic helpers get a `.mjs` test run with `node --test path/to/file.test.mjs`.
- Everything else: `npx tsc --noEmit` (filter to the touched file) and `npm run lint`, plus the explicit **Manual check**.
- Migrations: read + `grep` sanity only; run in the Supabase SQL Editor when a live DB exists (noted, non-blocking).
- Commit after every task. Append the trailer to every commit message:
  ```
  Co-Authored-By: claude-flow <ruv@ruv.net>
  ```

---

## File Structure

- `scripts/migrations/014-leads.sql` (new) — `leads` table + RLS.
- `lib/admin/leads.ts` (new) — `Lead` type, stage/channel metadata, CRUD, default templates.
- `lib/admin/leadMessaging.ts` (new) — pure `fillTemplate` / `waLink` / `profileUrl`.
- `lib/admin/leadMessaging.test.mjs` (new) — node tests for the pure helper.
- `components/admin/views/LeadsView.tsx` (new) — kanban board + create modal + drag.
- `components/admin/LeadCard.tsx` (new) — draggable lead card.
- `components/admin/LeadDetail.tsx` (new) — edit/message/convert/delete modal.
- `components/admin/LeadTemplatesModal.tsx` (new) — per-stage template editor.
- `components/admin/views/marketing/MarketingViews.tsx` (modify) — drop placeholder.
- `app/admin/(panel)/page.tsx` (modify) — import `LeadsView` from new file.

---

## Task 1: Migration — `leads` table

**Files:**
- Create: `scripts/migrations/014-leads.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration: sales leads CRM. A lead is a prospective customer captured from
-- any channel (Instagram, WhatsApp, Facebook, TikTok, website) and tracked
-- through a funnel. When won (stage = closed), a lead can be converted into an
-- order; `order_id` links the two. Run once in the Supabase SQL Editor.

create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  name              text not null default '',
  channel           text not null default 'other'
                      check (channel in ('instagram','whatsapp','facebook','tiktok','website','other')),
  handle            text,
  phone             text,
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

- [ ] **Step 2: Sanity check**

Run: `grep -c "create table" scripts/migrations/014-leads.sql`
Expected: `1`

Manual check (when Supabase live): paste into the SQL Editor; creates the table, idempotent on re-run.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrations/014-leads.sql
git commit -m "feat(admin): leads table for sales CRM"
```

---

## Task 2: Pure messaging helper + tests

**Files:**
- Create: `lib/admin/leadMessaging.ts`
- Test: `lib/admin/leadMessaging.test.mjs`

TDD: write the failing test first.

- [ ] **Step 1: Write the failing test**

```js
// lib/admin/leadMessaging.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillTemplate, waLink, profileUrl } from "./leadMessaging.ts";

test("fillTemplate replaces {nama}", () => {
  assert.equal(
    fillTemplate("Halo {nama}!", { name: "Andi" }),
    "Halo Andi!"
  );
});

test("fillTemplate leaves unknown placeholders untouched", () => {
  assert.equal(
    fillTemplate("Hi {nama} {foo}", { name: "Sari" }),
    "Hi Sari {foo}"
  );
});

test("fillTemplate handles empty name", () => {
  assert.equal(fillTemplate("Halo {nama}", { name: "" }), "Halo ");
});

test("waLink strips non-digits and encodes text", () => {
  assert.equal(
    waLink("+62 812-3456", "Hi there"),
    "https://wa.me/628123456?text=Hi%20there"
  );
});

test("waLink returns null when phone empty/null", () => {
  assert.equal(waLink("", "x"), null);
  assert.equal(waLink(null, "x"), null);
});

test("profileUrl builds per-channel URLs from a bare handle", () => {
  assert.equal(profileUrl("instagram", "andi"), "https://instagram.com/andi");
  assert.equal(profileUrl("instagram", "@andi"), "https://instagram.com/andi");
  assert.equal(profileUrl("tiktok", "budi"), "https://www.tiktok.com/@budi");
  assert.equal(profileUrl("facebook", "rina"), "https://facebook.com/rina");
});

test("profileUrl passes through a full URL", () => {
  assert.equal(
    profileUrl("website", "https://foo.com/x"),
    "https://foo.com/x"
  );
});

test("profileUrl returns null when not derivable", () => {
  assert.equal(profileUrl("whatsapp", "0812"), null);
  assert.equal(profileUrl("other", "just text"), null);
  assert.equal(profileUrl("instagram", null), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/admin/leadMessaging.test.mjs`
Expected: FAIL — module/exports not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/admin/leadMessaging.ts

export type LeadChannel =
  | "instagram" | "whatsapp" | "facebook" | "tiktok" | "website" | "other";

/** Replace {nama} with the lead's name. Unknown placeholders are left as-is. */
export function fillTemplate(template: string, lead: { name: string }): string {
  return template.replaceAll("{nama}", lead.name);
}

/** wa.me link with prefilled text; null when there's no usable phone. */
export function waLink(phone: string | null, text: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/** Public profile URL for a handle on a channel, or null when not derivable. */
export function profileUrl(
  channel: LeadChannel,
  handle: string | null
): string | null {
  if (!handle) return null;
  const h = handle.trim();
  if (!h) return null;
  if (isUrl(h)) return h;
  const user = h.replace(/^@/, "");
  switch (channel) {
    case "instagram":
      return `https://instagram.com/${user}`;
    case "tiktok":
      return `https://www.tiktok.com/@${user}`;
    case "facebook":
      return `https://facebook.com/${user}`;
    default:
      return null; // whatsapp/website/other: only a full URL is usable
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/admin/leadMessaging.test.mjs`
Expected: PASS — 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/leadMessaging.ts lib/admin/leadMessaging.test.mjs
git commit -m "feat(admin): pure lead messaging helper + tests"
```

---

## Task 3: `leads.ts` domain module

**Files:**
- Create: `lib/admin/leads.ts`

- [ ] **Step 1: Write the implementation**

```ts
// lib/admin/leads.ts
"use client";

import { createClient } from "@/lib/supabase/client";
import type { LeadChannel } from "@/lib/admin/leadMessaging";

export type { LeadChannel };
export type LeadStage =
  | "outreach" | "in_contact" | "interested" | "not_interested" | "closed";

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
export const LEAD_STAGES: LeadStage[] = [
  "outreach",
  "in_contact",
  "interested",
  "closed",
  "not_interested",
];

export const STAGE_LABELS: Record<LeadStage, string> = {
  outreach: "Outreach",
  in_contact: "In contact",
  interested: "Tertarik",
  closed: "Closed",
  not_interested: "Tidak tertarik",
};

export const STAGE_COLORS: Record<LeadStage, string> = {
  outreach: "bg-gray-100 text-gray-700",
  in_contact: "bg-blue-100 text-blue-700",
  interested: "bg-amber-100 text-amber-700",
  closed: "bg-green-100 text-green-700",
  not_interested: "bg-red-100 text-red-700",
};

export const CHANNELS: LeadChannel[] = [
  "instagram",
  "whatsapp",
  "facebook",
  "tiktok",
  "website",
  "other",
];

export const CHANNEL_META: Record<
  LeadChannel,
  { label: string; short: string; color: string }
> = {
  instagram: { label: "Instagram", short: "IG", color: "bg-pink-100 text-pink-700" },
  whatsapp: { label: "WhatsApp", short: "WA", color: "bg-green-100 text-green-700" },
  facebook: { label: "Facebook", short: "FB", color: "bg-blue-100 text-blue-700" },
  tiktok: { label: "TikTok", short: "TT", color: "bg-gray-200 text-gray-800" },
  website: { label: "Website", short: "WEB", color: "bg-indigo-100 text-indigo-700" },
  other: { label: "Lainnya", short: "—", color: "bg-gray-100 text-gray-600" },
};

export const DEFAULT_TEMPLATES: Record<LeadStage, string> = {
  outreach:
    "Halo {nama}! 😊 Terima kasih sudah tertarik dengan paket tour Thailand kami. Boleh saya bantu rencanakan perjalanannya?",
  in_contact:
    "Halo {nama}, mau lanjut bantu rencanakan trip-nya ya. Kira-kira berapa orang dan tanggal berapa rencananya?",
  interested:
    "Halo {nama}, ini detail paket yang cocok untuk Anda. Kalau sudah pas, kami siapkan invoice & itinerary lengkapnya ya 🙌",
  not_interested:
    "Baik {nama}, tidak masalah. Kalau nanti ada rencana ke Thailand, jangan ragu hubungi kami lagi ya 🙏",
  closed:
    "Terima kasih {nama}! 🎉 Kami senang bisa membantu. Detail trip akan kami kirimkan segera.",
};

/** All leads, newest-updated first. */
export async function listLeads(): Promise<Lead[]> {
  const { data } = await createClient()
    .from("leads")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data as Lead[] | null) ?? [];
}

/** Insert a lead; returns the row. Throws on DB error. */
export async function createLead(patch: Partial<Lead>): Promise<Lead | null> {
  const { data, error } = await createClient()
    .from("leads")
    .insert(patch)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return (data as Lead) ?? null;
}

/** Patch a lead; always bumps updated_at. */
export async function updateLead(
  id: string,
  patch: Partial<Lead>
): Promise<void> {
  await createClient()
    .from("leads")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteLead(id: string): Promise<void> {
  await createClient().from("leads").delete().eq("id", id);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -i "lib/admin/leads.ts"`
Expected: no output (no errors in this file).

- [ ] **Step 3: Commit**

```bash
git add lib/admin/leads.ts
git commit -m "feat(admin): leads domain module (types, metadata, CRUD)"
```

---

## Task 4: `LeadCard` component

**Files:**
- Create: `components/admin/LeadCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/admin/LeadCard.tsx
"use client";

import type { Lead } from "@/lib/admin/leads";
import { CHANNEL_META } from "@/lib/admin/leads";
import { formatIDR } from "@/lib/admin/utils";

/**
 * One lead card on the board. Draggable (HTML5) for desktop stage moves; click
 * opens the detail modal. The "→ order" marker shows once converted.
 */
export default function LeadCard({
  lead,
  onOpen,
  onDragStart,
}: {
  lead: Lead;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const ch = CHANNEL_META[lead.channel];
  const contact = lead.handle || lead.phone || "";
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="block w-full cursor-grab rounded-xl border border-gray-200 bg-white p-3 text-left active:cursor-grabbing hover:border-[#F5C518]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-[#1B2A4A]">
          {lead.name || "Tanpa nama"}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ch.color}`}
        >
          {ch.short}
        </span>
      </div>
      {contact && (
        <p className="mt-0.5 truncate text-xs text-gray-500">{contact}</p>
      )}
      <div className="mt-1 flex items-center justify-between text-xs">
        {lead.est_value_idr > 0 ? (
          <span className="font-medium text-[#1B2A4A]">
            {formatIDR(lead.est_value_idr)}
          </span>
        ) : (
          <span />
        )}
        {lead.order_id && (
          <span className="font-medium text-green-700">→ order</span>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -i "LeadCard"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/admin/LeadCard.tsx
git commit -m "feat(admin): LeadCard component"
```

---

## Task 5: `LeadTemplatesModal` component

**Files:**
- Create: `components/admin/LeadTemplatesModal.tsx`

Confirm `loadSetting`/`saveSetting` signatures first.

- [ ] **Step 1: Confirm settings helper**

Run: `grep -nE "export.*function (loadSetting|saveSetting)" lib/admin/settings.ts`
Expected: `loadSetting<T>(key): Promise<T | null>` and `saveSetting(key, value): Promise<void>` (or similar). Use the actual signatures found.

- [ ] **Step 2: Write the component**

```tsx
// components/admin/LeadTemplatesModal.tsx
"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import { inputCls, btnCls } from "@/components/admin/ui";
import { loadSetting, saveSetting } from "@/lib/admin/settings";
import {
  LEAD_STAGES,
  STAGE_LABELS,
  DEFAULT_TEMPLATES,
  type LeadStage,
} from "@/lib/admin/leads";

export const LEAD_TEMPLATES_KEY = "lead_templates";

export default function LeadTemplatesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [templates, setTemplates] =
    useState<Record<LeadStage, string>>(DEFAULT_TEMPLATES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadSetting<Record<LeadStage, string>>(LEAD_TEMPLATES_KEY).then((stored) => {
      if (stored) setTemplates({ ...DEFAULT_TEMPLATES, ...stored });
    });
  }, [open]);

  async function save() {
    setSaving(true);
    await saveSetting(LEAD_TEMPLATES_KEY, templates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title="Template pesan per tahap">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Pakai <code className="rounded bg-gray-100 px-1">{"{nama}"}</code>{" "}
          untuk menyisipkan nama lead.
        </p>
        {LEAD_STAGES.map((s) => (
          <label key={s} className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              {STAGE_LABELS[s]}
            </span>
            <textarea
              value={templates[s]}
              onChange={(e) =>
                setTemplates((t) => ({ ...t, [s]: e.target.value }))
              }
              rows={3}
              className={inputCls}
            />
          </label>
        ))}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={`${btnCls} disabled:opacity-50`}
          >
            {saving ? "Menyimpan…" : "Simpan template"}
          </button>
          {saved && (
            <span className="text-xs font-medium text-green-700">
              Tersimpan ✓
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -i "LeadTemplatesModal"`
Expected: no output. If `loadSetting`/`saveSetting` have different names/signatures than assumed in Step 1, adjust the import + calls accordingly.

- [ ] **Step 4: Commit**

```bash
git add components/admin/LeadTemplatesModal.tsx
git commit -m "feat(admin): per-stage lead message templates editor"
```

---

## Task 6: `LeadDetail` component

**Files:**
- Create: `components/admin/LeadDetail.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/admin/LeadDetail.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import { loadSetting } from "@/lib/admin/settings";
import { LEAD_TEMPLATES_KEY } from "@/components/admin/LeadTemplatesModal";
import {
  CHANNELS,
  CHANNEL_META,
  LEAD_STAGES,
  STAGE_LABELS,
  DEFAULT_TEMPLATES,
  updateLead,
  deleteLead,
  type Lead,
  type LeadStage,
  type LeadChannel,
} from "@/lib/admin/leads";
import { fillTemplate, waLink, profileUrl } from "@/lib/admin/leadMessaging";

/**
 * Edit one lead: fields, stage, stage-based messaging actions, convert-to-order,
 * and delete. Rendered inside a Modal by LeadsView. `onChanged` refreshes the
 * board; `onClose` dismisses.
 */
export default function LeadDetail({
  lead,
  onChanged,
  onClose,
}: {
  lead: Lead;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(lead.name);
  const [channel, setChannel] = useState<LeadChannel>(lead.channel);
  const [handle, setHandle] = useState(lead.handle ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [estValue, setEstValue] = useState(lead.est_value_idr);
  const [note, setNote] = useState(lead.note ?? "");
  const [orderId, setOrderId] = useState(lead.order_id);
  const [templates, setTemplates] =
    useState<Record<LeadStage, string>>(DEFAULT_TEMPLATES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSetting<Record<LeadStage, string>>(LEAD_TEMPLATES_KEY).then((stored) => {
      if (stored) setTemplates({ ...DEFAULT_TEMPLATES, ...stored });
    });
  }, []);

  const filled = fillTemplate(templates[stage], { name });
  const wa = waLink(phone, filled);
  const profile = profileUrl(channel, handle);

  async function save() {
    setSaving(true);
    setError(null);
    await updateLead(lead.id, {
      name,
      channel,
      handle: handle || null,
      phone: phone || null,
      stage,
      est_value_idr: estValue,
      note: note || null,
    });
    setSaving(false);
    onChanged();
  }

  async function markContacted() {
    await updateLead(lead.id, { last_contacted_at: new Date().toISOString() });
    onChanged();
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(filled);
    markContacted();
  }

  async function convertToOrder() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data: cust, error: cErr } = await supabase
        .from("customers")
        .insert({ name, phone: phone || null })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      // order_number is assigned by the orders_assign_number BEFORE INSERT trigger.
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          customer_id: cust.id,
          status: "inquiry",
          notes: `Dari lead · ${CHANNEL_META[channel].label}`,
        })
        .select("id")
        .single();
      if (oErr) throw new Error(oErr.message);
      await updateLead(lead.id, { order_id: order.id });
      setOrderId(order.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat order.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Hapus lead ${name || "ini"}?`)) return;
    await deleteLead(lead.id);
    onChanged();
    onClose();
  }

  return (
    <div className="space-y-4">
      <ErrorNote message={error} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Channel">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as LeadChannel)}
            className={inputCls}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_META[c].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Handle / profil">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@username atau URL"
            className={inputCls}
          />
        </Field>
        <Field label="Telepon (untuk WA)">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+62…"
            className={inputCls}
          />
        </Field>
        <Field label="Tahap">
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as LeadStage)}
            className={inputCls}
          >
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estimasi nilai (IDR)">
          <input
            type="number"
            min={0}
            value={estValue || ""}
            onChange={(e) => setEstValue(Number(e.target.value) || 0)}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Catatan">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} />
      </Field>

      <button type="button" onClick={save} disabled={saving} className={`${btnCls} disabled:opacity-50`}>
        {saving ? "Menyimpan…" : "Simpan"}
      </button>

      {/* Message block — stage-based template + send actions */}
      <section className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Pesan · {STAGE_LABELS[stage]}
        </p>
        <p className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-gray-700">
          {filled}
        </p>
        <div className="flex flex-wrap gap-2">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              onClick={markContacted}
              className={btnCls}
            >
              Kirim WA
            </a>
          )}
          <button type="button" onClick={copyMessage} className={btnSecondaryCls}>
            Salin pesan
          </button>
          {profile && (
            <a href={profile} target="_blank" rel="noopener noreferrer" className={btnSecondaryCls}>
              Buka profil
            </a>
          )}
        </div>
      </section>

      {/* Convert / order link */}
      <section className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
        {orderId ? (
          <a
            href={`/admin/orders/${orderId}`}
            className="font-medium text-[#1B2A4A] hover:underline"
          >
            Buka order →
          </a>
        ) : stage === "closed" ? (
          <button type="button" onClick={convertToOrder} disabled={saving} className={`${btnCls} disabled:opacity-50`}>
            Buat order
          </button>
        ) : (
          <span className="text-xs text-gray-400">
            Tandai “Closed” untuk membuat order.
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Hapus lead
        </button>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -i "LeadDetail"`
Expected: no output. If `Field` is not exported from `@/components/admin/ui`, check that file (`grep -n "Field" components/admin/ui.ts*`) and use the actual export (it is used the same way in `OrderForm.tsx` / `JobOrderBuilderView.tsx`).

- [ ] **Step 3: Commit**

```bash
git add components/admin/LeadDetail.tsx
git commit -m "feat(admin): LeadDetail modal — edit, message, convert, delete"
```

---

## Task 7: `LeadsView` board + create modal + drag

**Files:**
- Create: `components/admin/views/LeadsView.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/admin/views/LeadsView.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import { formatIDR } from "@/lib/admin/utils";
import LeadCard from "@/components/admin/LeadCard";
import LeadDetail from "@/components/admin/LeadDetail";
import LeadTemplatesModal from "@/components/admin/LeadTemplatesModal";
import {
  listLeads,
  createLead,
  updateLead,
  CHANNELS,
  CHANNEL_META,
  LEAD_STAGES,
  STAGE_LABELS,
  type Lead,
  type LeadStage,
  type LeadChannel,
} from "@/lib/admin/leads";

const DRAG_MIME = "application/x-kt-lead";

export default function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // New-lead form state.
  const [nName, setNName] = useState("");
  const [nChannel, setNChannel] = useState<LeadChannel>("instagram");
  const [nHandle, setNHandle] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nValue, setNValue] = useState(0);

  const load = useCallback(async () => {
    try {
      setLeads(await listLeads());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat leads.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addLead() {
    setError(null);
    try {
      await createLead({
        name: nName,
        channel: nChannel,
        handle: nHandle || null,
        phone: nPhone || null,
        est_value_idr: nValue,
        stage: "outreach",
      });
      setCreating(false);
      setNName("");
      setNHandle("");
      setNPhone("");
      setNValue(0);
      setNChannel("instagram");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah lead.");
    }
  }

  async function moveTo(id: string, stage: LeadStage) {
    await updateLead(id, { stage });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Leads</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTemplatesOpen(true)} className={btnSecondaryCls}>
            Template pesan
          </button>
          <button type="button" onClick={() => setCreating(true)} className={btnCls}>
            + Lead
          </button>
        </div>
      </div>
      <ErrorNote message={error} />

      {/* Board — columns scroll horizontally on phones. */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {LEAD_STAGES.map((stage) => {
          const col = leads.filter((l) => l.stage === stage);
          const sum = col.reduce((s, l) => s + Number(l.est_value_idr), 0);
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_MIME)) e.preventDefault();
              }}
              onDrop={(e) => {
                const id = e.dataTransfer.getData(DRAG_MIME);
                if (id) moveTo(id, stage);
              }}
              className="flex w-64 shrink-0 flex-col gap-2 rounded-xl bg-gray-50 p-2"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-[#1B2A4A]">
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-gray-400">
                  {col.length}
                  {sum > 0 ? ` · ${formatIDR(sum)}` : ""}
                </span>
              </div>
              {col.map((l) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  onOpen={() => setSelected(l)}
                  onDragStart={(e) => e.dataTransfer.setData(DRAG_MIME, l.id)}
                />
              ))}
              {col.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-gray-400">
                  Kosong
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Lead baru">
        <div className="space-y-3">
          <Field label="Nama">
            <input value={nName} onChange={(e) => setNName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Channel">
            <select
              value={nChannel}
              onChange={(e) => setNChannel(e.target.value as LeadChannel)}
              className={inputCls}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_META[c].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Handle / profil">
            <input value={nHandle} onChange={(e) => setNHandle(e.target.value)} placeholder="@username atau URL" className={inputCls} />
          </Field>
          <Field label="Telepon (untuk WA)">
            <input value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="+62…" className={inputCls} />
          </Field>
          <Field label="Estimasi nilai (IDR)">
            <input
              type="number"
              min={0}
              value={nValue || ""}
              onChange={(e) => setNValue(Number(e.target.value) || 0)}
              className={inputCls}
            />
          </Field>
          <button type="button" onClick={addLead} className={btnCls}>
            Simpan lead
          </button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name || "Lead"}
        wide
      >
        {selected && (
          <LeadDetail
            lead={selected}
            onChanged={() => {
              load();
            }}
            onClose={() => setSelected(null)}
          />
        )}
      </Modal>

      <LeadTemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit 2>&1 | grep -i "LeadsView"` then `npm run lint 2>&1 | tail -5`
Expected: no tsc output for LeadsView; lint reports no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/views/LeadsView.tsx
git commit -m "feat(admin): leads kanban board view"
```

---

## Task 8: Wire into the Marketing panel

**Files:**
- Modify: `components/admin/views/marketing/MarketingViews.tsx`
- Modify: `app/admin/(panel)/page.tsx`

- [ ] **Step 1: Remove the placeholder `LeadsView`**

In `components/admin/views/marketing/MarketingViews.tsx`, delete the entire
`export function LeadsView() { ... }` block (keep `BlogView` and
`InstagramStudioView` and the `Placeholder` helper).

- [ ] **Step 2: Update the admin page import**

In `app/admin/(panel)/page.tsx`, the current import is:

```ts
import {
  BlogView,
  LeadsView,
  InstagramStudioView,
} from "@/components/admin/views/marketing/MarketingViews";
```

Replace it with two imports — `LeadsView` from its new home, the rest from the barrel:

```ts
import {
  BlogView,
  InstagramStudioView,
} from "@/components/admin/views/marketing/MarketingViews";
import LeadsView from "@/components/admin/views/LeadsView";
```

The `MARKETING_TABS` entry `{ id: "leads", label: "Leads", View: LeadsView }`
needs no change — it already references `LeadsView`.

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: build compiles; lint clean.

- [ ] **Step 4: Manual check (when Supabase live)**

1. Sign in as a marketing-role user → Leads tab → board with 5 columns renders.
2. "+ Lead" → add an Instagram lead → appears in Outreach.
3. Drag it to "In contact" (desktop) → column updates; reload persists.
4. Open it → edit fields → Simpan; change stage via dropdown (phone path).
5. WhatsApp lead with a phone → "Kirim WA" opens wa.me with the filled template;
   IG lead → "Salin pesan" copies, "Buka profil" opens instagram.com/handle.
6. "Template pesan" → edit a stage message → Simpan → reopen a lead → new text shows.
7. Set a lead to "Closed" → "Buat order" → creates an order; "Buka order" links to it;
   lead card shows "→ order".

- [ ] **Step 5: Commit**

```bash
git add components/admin/views/marketing/MarketingViews.tsx "app/admin/(panel)/page.tsx"
git commit -m "feat(admin): mount leads CRM in marketing panel"
```

---

## Task 9: Final verification

- [ ] **Step 1: Full build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 2: All node tests**

Run: `node --test lib/admin/leadMessaging.test.mjs lib/admin/docLibrary.labels.test.mjs lib/admin/itinerary.test.mjs lib/admin/itineraryGeneration.test.mjs`
Expected: all pass.

- [ ] **Step 3: Commit any touch-ups**

```bash
git add -A
git commit -m "chore(admin): leads CRM — final verification"
```

---

## Self-review notes

- **Spec coverage:** table (Task 1) ✓; domain module + metadata + CRUD + default
  templates (Task 3) ✓; pure messaging helper + tests (Task 2) ✓; kanban board +
  create + drag (Task 7) ✓; card (Task 4) ✓; detail edit/message/convert/delete
  (Task 6) ✓; templates editor in app_settings (Task 5) ✓; wiring + placeholder
  removal (Task 8) ✓.
- **Type consistency:** `LeadStage`/`LeadChannel`/`Lead` defined in Task 3 and
  reused verbatim in Tasks 4–7; `LeadChannel` originates in `leadMessaging.ts`
  (Task 2) and is re-exported from `leads.ts` (Task 3) so both modules agree.
  `LEAD_TEMPLATES_KEY` defined in Task 5, imported in Task 6. `fillTemplate`/
  `waLink`/`profileUrl` signatures match between Task 2 and their use in Task 6.
- **Known assumptions to verify during build (flagged in-task):** `Field` is
  exported from `@/components/admin/ui` (used the same way in existing forms);
  `loadSetting`/`saveSetting` signatures in `settings.ts` (Task 5 Step 1);
  `orders` insert with only `customer_id`/`status`/`notes` is accepted and
  `order_number` is trigger-assigned (confirmed: migration 007
  `orders_assign_number`).
```
