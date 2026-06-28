# Order Document Library Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin start an order's Invoice / Job Order / Itinerary from a previously-saved document, edit it, and have edits autosave to the order plus a synced library mirror.

**Architecture:** Each builder already runs in `orderId` mode with `applyDraft` + debounced autosave to `order_documents`. This plan adds, additively: (1) a generic `document_templates` table + `docLibrary.ts` helper for invoice/joborder (itinerary reuses the existing `itineraries` table), (2) a shared `TemplatePickerModal`, (3) per-builder a "source bar" to pick a saved doc and a `libraryId`-tracked autosave mirror that creates one library row per order and keeps it in sync.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Supabase JS client, Tailwind v4. No Jest/Vitest — pure logic is checked with `node --test` `.mjs` files; everything else is verified with `npm run build` + `npm run lint` + manual steps.

---

## Verification conventions

This repo has **no UI test runner**. For each task:
- Pure-logic helpers get a `.mjs` test run with `node --test path/to/file.test.mjs`.
- Everything else is verified with `npm run build` (type-check + compile) and `npm run lint`, plus the explicit **Manual check** written in the task.
- Migrations are verified by reading them and (when Supabase is live) pasting into the Supabase SQL Editor — noted per task, not blocking.

Commit after every task.

---

## File Structure

- `scripts/migrations/012-document-templates.sql` (new) — generic template table for invoice + joborder.
- `lib/admin/docLibrary.ts` (new) — typed CRUD over `document_templates`. Mirrors `itineraryLibrary.ts`.
- `lib/admin/docLibrary.labels.ts` (new) — pure label/sub formatting for picker rows (testable without Supabase).
- `lib/admin/docLibrary.labels.test.mjs` (new) — node test for the label formatter.
- `components/admin/TemplatePickerModal.tsx` (new) — shared source-agnostic picker modal.
- `components/admin/views/ItineraryBuilderView.tsx` (modify) — source bar + `itineraries` mirror; add `libraryId` to `Draft`.
- `components/admin/views/InvoiceBuilderView.tsx` (modify) — source bar + `docLibrary` mirror; add `libraryId` to `InvoiceDraft`.
- `components/admin/views/JobOrderBuilderView.tsx` (modify) — source bar + `docLibrary` mirror.
- `lib/admin/jobOrder.ts` (modify) — add `libraryId?` to `JobOrderData`.

---

## Task 1: Migration — `document_templates` table

**Files:**
- Create: `scripts/migrations/012-document-templates.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration: generic saved-document templates for invoice + job order. These
-- are reusable starting points an admin can pick when building an order's
-- document. The itinerary library uses its own `itineraries` table; this table
-- covers the two kinds that previously had no library. `data` holds the full
-- builder draft (same shape stored per-order in order_documents).
-- `order_number` records which order spawned the mirror, for provenance.
-- Run once in the Supabase SQL Editor.

create table if not exists document_templates (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('invoice','joborder')),
  title        text not null default '',
  data         jsonb not null default '{}'::jsonb,
  order_number text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists document_templates_kind_idx
  on document_templates (kind, updated_at desc);

alter table document_templates enable row level security;

drop policy if exists "team full access" on document_templates;
create policy "team full access" on document_templates
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Verify SQL parses (lightweight)**

Run: `grep -c "create table" scripts/migrations/012-document-templates.sql`
Expected: `1`

Manual check (only when Supabase is live): paste the file into the Supabase SQL Editor and run — it should create the table with no error and be idempotent on a second run.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrations/012-document-templates.sql
git commit -m "feat(admin): document_templates table for invoice/joborder library"
```

---

## Task 2: Pure label formatter for picker rows

A small pure function turns a saved row (library itinerary OR template) into a
`{ id, label, sub }` shape for the picker. Pure → unit-testable without Supabase.

**Files:**
- Create: `lib/admin/docLibrary.labels.ts`
- Test: `lib/admin/docLibrary.labels.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// lib/admin/docLibrary.labels.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickerRow } from "./docLibrary.labels.ts";

test("uses explicit title when present", () => {
  const row = pickerRow({
    id: "a",
    title: "Bangkok 4D3N",
    data: { days: [{}, {}] },
    updated_at: "2026-06-01T10:00:00Z",
    order_number: "ORD-1",
  });
  assert.equal(row.id, "a");
  assert.equal(row.label, "Bangkok 4D3N");
  assert.match(row.sub, /2 hari/);
  assert.match(row.sub, /ORD-1/);
});

test("falls back to draft fields when title blank", () => {
  const row = pickerRow({
    id: "b",
    title: "  ",
    data: { tripTitle: "Pattaya", customer: "Budi", days: [] },
    updated_at: "2026-06-01T10:00:00Z",
    order_number: null,
  });
  assert.equal(row.label, "Pattaya · Budi");
});

test("final fallback label when nothing usable", () => {
  const row = pickerRow({ id: "c", title: "", data: {}, updated_at: "" });
  assert.equal(row.label, "Tanpa judul");
});

test("invoice-style draft uses invoiceNumber/billTo", () => {
  const row = pickerRow({
    id: "d",
    title: "",
    data: { invoiceNumber: "INV-2026-0007", billTo: "Love Bangkok" },
    updated_at: "2026-06-01T10:00:00Z",
    order_number: null,
  });
  assert.equal(row.label, "INV-2026-0007 · Love Bangkok");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/admin/docLibrary.labels.test.mjs`
Expected: FAIL — cannot find module / `pickerRow` not defined.

(Note: `node --test` can import a `.ts` file directly under Node 22+ via type-stripping. If the runner errors on TS syntax, the file uses only plain JS-compatible syntax below, so it strips cleanly.)

- [ ] **Step 3: Write the implementation**

```ts
// lib/admin/docLibrary.labels.ts

/** Minimal row shape shared by library itineraries and document templates. */
export interface LibraryLike {
  id: string;
  title: string;
  data: Record<string, unknown> | null | undefined;
  updated_at: string;
  order_number?: string | null;
}

/** A formatted row for TemplatePickerModal. */
export interface PickerRowData {
  id: string;
  label: string;
  sub: string;
}

function savedAt(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Build a picker label + sub from a saved row. Title wins; otherwise we fall
 * back to whichever recognizable fields the draft carries (itinerary trip/
 * customer, or invoice number/billTo). The sub line shows day count (if any),
 * the originating order number, and when it was last saved.
 */
export function pickerRow(row: LibraryLike): PickerRowData {
  const d = (row.data ?? {}) as Record<string, unknown>;
  const title = (row.title ?? "").trim();

  let label = title;
  if (!label) {
    const parts = [
      d.tripTitle as string,
      d.invoiceNumber as string,
      d.customer as string,
      d.billTo as string,
    ].filter((s) => typeof s === "string" && s.trim());
    label = parts.join(" · ");
  }
  if (!label) label = "Tanpa judul";

  const subBits: string[] = [];
  const days = d.days;
  if (Array.isArray(days) && days.length) subBits.push(`${days.length} hari`);
  if (row.order_number) subBits.push(`order ${row.order_number}`);
  const when = savedAt(row.updated_at);
  if (when) subBits.push(`disimpan ${when}`);

  return { id: row.id, label, sub: subBits.join(" · ") };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/admin/docLibrary.labels.test.mjs`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/docLibrary.labels.ts lib/admin/docLibrary.labels.test.mjs
git commit -m "feat(admin): pure picker-row label formatter + test"
```

---

## Task 3: `docLibrary.ts` CRUD helper

**Files:**
- Create: `lib/admin/docLibrary.ts`

- [ ] **Step 1: Write the implementation**

```ts
// lib/admin/docLibrary.ts
"use client";

import { createClient } from "@/lib/supabase/client";

/** Document kinds that use the generic template table. */
export type TemplateKind = "invoice" | "joborder";

/** A row in the document_templates table. */
export interface TemplateRow<T = unknown> {
  id: string;
  kind: TemplateKind;
  title: string;
  data: T;
  order_number: string | null;
  updated_at: string;
}

/** All saved templates of one kind, newest-edited first. */
export async function listTemplates<T = unknown>(
  kind: TemplateKind
): Promise<TemplateRow<T>[]> {
  const { data } = await createClient()
    .from("document_templates")
    .select("id, kind, title, data, order_number, updated_at")
    .eq("kind", kind)
    .order("updated_at", { ascending: false });
  return (data as TemplateRow<T>[] | null) ?? [];
}

/** One saved template's title + draft, or null if it no longer exists. */
export async function loadTemplate<T = unknown>(
  id: string
): Promise<{ title: string; data: T } | null> {
  const { data } = await createClient()
    .from("document_templates")
    .select("title, data")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { title: (data.title as string) ?? "", data: data.data as T };
}

/** Create a template; returns its id. Throws on DB error. */
export async function createTemplate<T>(
  kind: TemplateKind,
  title: string,
  data: T,
  orderNumber?: string | null
): Promise<string | null> {
  const { data: row, error } = await createClient()
    .from("document_templates")
    .insert({ kind, title, data, order_number: orderNumber ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (row?.id as string) ?? null;
}

/** Update a template's title + draft. */
export async function saveTemplate<T>(
  id: string,
  title: string,
  data: T
): Promise<void> {
  await createClient()
    .from("document_templates")
    .update({ title, data, updated_at: new Date().toISOString() })
    .eq("id", id);
}

/** Delete a template. */
export async function deleteTemplate(id: string): Promise<void> {
  await createClient().from("document_templates").delete().eq("id", id);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `lib/admin/docLibrary.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/admin/docLibrary.ts
git commit -m "feat(admin): docLibrary CRUD helper over document_templates"
```

---

## Task 4: `TemplatePickerModal` shared component

**Files:**
- Create: `components/admin/TemplatePickerModal.tsx`

Reference the existing `components/admin/Modal.tsx` for props (`open`, `onClose`,
`title`, children). Confirm its signature before writing.

- [ ] **Step 1: Confirm Modal's props**

Run: `grep -n "export default function Modal" components/admin/Modal.tsx`
Then read the prop list. Expected: a component taking at least `{ open, onClose, title, children }`.

- [ ] **Step 2: Write the component**

```tsx
// components/admin/TemplatePickerModal.tsx
"use client";

import Modal from "@/components/admin/Modal";
import type { PickerRowData } from "@/lib/admin/docLibrary.labels";

/**
 * Source-agnostic picker. The caller fetches + formats rows (via pickerRow)
 * from whichever store applies (itineraries or document_templates) and handles
 * the chosen id. This component only renders the list + selection.
 */
export default function TemplatePickerModal({
  open,
  onClose,
  title,
  rows,
  loading,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: PickerRowData[];
  loading: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Belum ada yang tersimpan.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r.id)}
                className="block w-full px-4 py-3 text-left hover:bg-gray-50"
              >
                <p className="truncate font-semibold text-[#1B2A4A]">
                  {r.label}
                </p>
                {r.sub && <p className="text-xs text-gray-400">{r.sub}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `TemplatePickerModal.tsx`. If `Modal` requires extra props (e.g. `wide`), add them per its signature found in Step 1.

- [ ] **Step 4: Commit**

```bash
git add components/admin/TemplatePickerModal.tsx
git commit -m "feat(admin): shared TemplatePickerModal"
```

---

## Task 5: Job Order — source bar + library mirror

Start with Job Order (simplest builder: explicit save, no AI, no autosave today).
This establishes the pattern the other two follow.

**Files:**
- Modify: `lib/admin/jobOrder.ts` — add `libraryId?` to `JobOrderData`.
- Modify: `components/admin/views/JobOrderBuilderView.tsx`

- [ ] **Step 1: Add `libraryId` to the data type**

In `lib/admin/jobOrder.ts`, find the `JobOrderData` interface and add the field:

```ts
export interface JobOrderData {
  // ...existing fields...
  /** Library mirror row this order's job order is synced to (document_templates). */
  libraryId?: string | null;
}
```

- [ ] **Step 2: Wire imports + state in the builder**

In `components/admin/views/JobOrderBuilderView.tsx`, add imports near the top:

```ts
import { useCallback } from "react";
import TemplatePickerModal from "@/components/admin/TemplatePickerModal";
import { pickerRow, type PickerRowData } from "@/lib/admin/docLibrary.labels";
import {
  listTemplates,
  loadTemplate,
  createTemplate,
  saveTemplate,
} from "@/lib/admin/docLibrary";
```

Add `libraryId` state and order-number tracking alongside the other `useState`
calls (after `const [days, setDays] = useState<JobOrderDay[]>([newJobOrderDay()]);`):

```ts
const [libraryId, setLibraryId] = useState<string | null>(null);
const [orderNumber, setOrderNumber] = useState<string | null>(null);
const [pickerOpen, setPickerOpen] = useState(false);
const [pickerRows, setPickerRows] = useState<PickerRowData[]>([]);
const [pickerLoading, setPickerLoading] = useState(false);
```

- [ ] **Step 3: Hydrate `libraryId` + `orderNumber` from the saved draft / order**

In the existing `applyDraft` function add:

```ts
setLibraryId(d.libraryId ?? null);
```

In the per-order hydrate effect, in the `else` branch where it seeds from the
order (right after `setJobOrderNo(o.order_number ?? "");`), capture the number:

```ts
setOrderNumber(o.order_number ?? null);
```

And in the `if (saved)` branch, the order number isn't loaded there — fetch it
once for tagging. Replace the saved branch body so it still tags future mirrors:

```ts
if (saved) {
  applyDraft(saved);
  const { data: o } = await createClient()
    .from("orders")
    .select("order_number")
    .eq("id", orderId)
    .single();
  if (!cancelled && o) setOrderNumber(o.order_number ?? null);
}
```

- [ ] **Step 4: Include `libraryId` in the assembled `data` object**

Find the `const data: JobOrderData = { ... }` literal and add `libraryId` to it:

```ts
const data: JobOrderData = {
  // ...existing fields...
  libraryId,
};
```

- [ ] **Step 5: Mirror to the library inside `save()`**

Replace the existing `save()` function with one that also writes the mirror.
The mirror id is set into state so the assembled `data` (and thus the order doc)
carries it on the next save:

```ts
async function save() {
  if (!orderId) return;
  setSaving(true);
  // Persist to the order first (existing behavior).
  let nextLibraryId = libraryId;
  try {
    if (!nextLibraryId) {
      nextLibraryId = await createTemplate(
        "joborder",
        jobOrderNo || "Job Order",
        { ...data, libraryId: null },
        orderNumber
      );
      if (nextLibraryId) setLibraryId(nextLibraryId);
    } else {
      await saveTemplate(nextLibraryId, jobOrderNo || "Job Order", {
        ...data,
        libraryId: nextLibraryId,
      });
    }
  } catch {
    /* mirror is best-effort; the order doc below is the source of truth */
  }
  await saveOrderDoc(orderId, "joborder", { ...data, libraryId: nextLibraryId });
  setSaving(false);
  setSaved(true);
}
```

- [ ] **Step 6: Add the source bar + picker (orderId mode only)**

Add a picker-open handler near the other functions:

```ts
const openPicker = useCallback(async () => {
  setPickerOpen(true);
  setPickerLoading(true);
  const rows = await listTemplates<JobOrderData>("joborder");
  setPickerRows(rows.map((r) => pickerRow(r)));
  setPickerLoading(false);
}, []);

async function pickTemplate(id: string) {
  setPickerOpen(false);
  const picked = await loadTemplate<JobOrderData>(id);
  if (!picked) return;
  const hasContent = days.some((d) => d.itinerary.trim()) || hotels.some((h) => h.name.trim());
  if (hasContent && !confirm("Ganti isi job order dengan yang dipilih?")) return;
  // Keep this order's own mirror id — never overwrite it with the source's id.
  applyDraft({ ...picked.data, libraryId });
}
```

In the JSX, inside the `{orderId && (...)}` area of the header toolbar (next to
the Simpan button), add the source bar buttons:

```tsx
{orderId && (
  <button
    type="button"
    onClick={openPicker}
    className={btnSecondaryCls}
  >
    Pilih dari tersimpan
  </button>
)}
```

At the end of the component's returned JSX (before the closing `</div>`), mount
the modal:

```tsx
<TemplatePickerModal
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  title="Pilih job order tersimpan"
  rows={pickerRows}
  loading={pickerLoading}
  onPick={pickTemplate}
/>
```

- [ ] **Step 7: Build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; no new lint errors in `JobOrderBuilderView.tsx` or `jobOrder.ts`.

- [ ] **Step 8: Manual check (when Supabase live)**

1. Open an order → Job Order tab. Edit fields, press Simpan.
2. Confirm a row appears in `document_templates` (kind=joborder) tagged with the order number.
3. Press Simpan again after another edit → same row updates (no duplicate).
4. Click "Pilih dari tersimpan" → the saved row is listed → pick it → fields load; the order keeps its own mirror id (verify the order's `order_documents` joborder `libraryId` is unchanged).

- [ ] **Step 9: Commit**

```bash
git add lib/admin/jobOrder.ts components/admin/views/JobOrderBuilderView.tsx
git commit -m "feat(admin): job order — pick from saved + library mirror"
```

---

## Task 6: Invoice — source bar + library mirror

Invoice already autosaves the draft to the order (debounced effect at
`InvoiceBuilderView.tsx:198-205`). The mirror rides that same autosave.

**Files:**
- Modify: `components/admin/views/InvoiceBuilderView.tsx`

- [ ] **Step 1: Add `libraryId` to `InvoiceDraft`**

In the `InvoiceDraft` interface (top of the file), add:

```ts
/** Library mirror row this order's invoice is synced to (document_templates). */
libraryId?: string | null;
```

- [ ] **Step 2: Add imports**

Near the existing imports:

```ts
import TemplatePickerModal from "@/components/admin/TemplatePickerModal";
import { pickerRow, type PickerRowData } from "@/lib/admin/docLibrary.labels";
import {
  listTemplates,
  loadTemplate,
  createTemplate,
  saveTemplate,
} from "@/lib/admin/docLibrary";
```

- [ ] **Step 3: Add state**

Alongside the other `useState` calls (after `savedInvoiceId` state):

```ts
const [libraryId, setLibraryId] = useState<string | null>(null);
const [orderNumber, setOrderNumber] = useState<string | null>(null);
const [pickerOpen, setPickerOpen] = useState(false);
const [pickerRows, setPickerRows] = useState<PickerRowData[]>([]);
const [pickerLoading, setPickerLoading] = useState(false);
```

- [ ] **Step 4: Hydrate `libraryId` + `orderNumber`**

In `applyDraft`, add:

```ts
setLibraryId(d.libraryId ?? null);
```

In the per-order hydrate effect: the `else` branch already fetches the order
(`o`) — add after it sets billing fields:

```ts
setOrderNumber(o.order_number ?? null);
```

In the `if (saved)` branch (which calls `applyDraft(saved)`), also fetch the
order number for mirror tagging:

```ts
if (saved) {
  applyDraft(saved);
  const { data: o } = await createClient()
    .from("orders")
    .select("order_number")
    .eq("id", orderId)
    .single();
  if (!cancelled && o) setOrderNumber(o.order_number ?? null);
}
```

- [ ] **Step 5: Add `libraryId` to the `draft` literal**

Find `const draft: InvoiceDraft = { ... }` and add `libraryId` to it.

- [ ] **Step 6: Mirror inside the autosave effect**

Replace the existing autosave effect body so it mirrors after saving the order
doc. Because the mirror id must persist into the draft, it writes back via state
(picked up on the next debounce cycle):

```ts
// Autosave to the order (debounced) once hydrated; mirror to the library too.
useEffect(() => {
  if (!orderId || !hydrated.current) return;
  const t = setTimeout(async () => {
    await saveOrderDoc(orderId, "invoice", draft);
    try {
      const title = invoiceNumber || "Invoice";
      if (!libraryId) {
        const id = await createTemplate(
          "invoice",
          title,
          { ...draft, libraryId: null },
          orderNumber
        );
        if (id) setLibraryId(id);
      } else {
        await saveTemplate(libraryId, title, { ...draft, libraryId });
      }
    } catch {
      /* mirror is best-effort */
    }
  }, 600);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [orderId, JSON.stringify(draft)]);
```

- [ ] **Step 7: Add picker handlers**

```ts
async function openPicker() {
  setPickerOpen(true);
  setPickerLoading(true);
  const rows = await listTemplates<InvoiceDraft>("invoice");
  setPickerRows(rows.map((r) => pickerRow(r)));
  setPickerLoading(false);
}

async function pickTemplate(id: string) {
  setPickerOpen(false);
  const picked = await loadTemplate<InvoiceDraft>(id);
  if (!picked) return;
  if (lines.length > 0 && !confirm("Ganti isi invoice dengan yang dipilih?")) return;
  // Keep this order's own mirror id + payable-invoice link.
  applyDraft({ ...picked.data, libraryId, savedInvoiceId });
}
```

- [ ] **Step 8: Add source bar button + modal in JSX**

In the header toolbar, inside the `{orderId && (...)}` block (next to "Simpan ke
order"), add:

```tsx
<button type="button" onClick={openPicker} className={btnSecondaryCls}>
  Pilih dari tersimpan
</button>
```

Before the component's final closing tag, mount:

```tsx
<TemplatePickerModal
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  title="Pilih invoice tersimpan"
  rows={pickerRows}
  loading={pickerLoading}
  onPick={pickTemplate}
/>
```

- [ ] **Step 9: Build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; no new lint errors in `InvoiceBuilderView.tsx`.

- [ ] **Step 10: Manual check (when Supabase live)**

1. Open an order → Invoice tab. Add a line. Within ~1s a `document_templates`
   (kind=invoice) row appears, tagged with the order number.
2. Edit again → same row updates (no duplicates).
3. "Pilih dari tersimpan" → list shows saved invoices → pick → lines load; the
   order's own mirror id and `savedInvoiceId` are preserved.

- [ ] **Step 11: Commit**

```bash
git add components/admin/views/InvoiceBuilderView.tsx
git commit -m "feat(admin): invoice — pick from saved + library mirror"
```

---

## Task 7: Itinerary — source bar + library mirror into `itineraries`

Itinerary already autosaves via `persist(buildDraft())` and already supports a
`libraryId` **mode** (mutually exclusive with `orderId`). Here we add a *mirror*
that is separate from that mode: in `orderId` mode we also write a row into the
`itineraries` table and remember its id inside the order draft.

To avoid colliding with the existing `libraryId` **prop**, store the mirror id
under a distinct draft key: `mirrorId`.

**Files:**
- Modify: `components/admin/views/ItineraryBuilderView.tsx`

- [ ] **Step 1: Add `mirrorId` to the `Draft` interface**

```ts
interface Draft {
  // ...existing fields...
  /** Library mirror row (itineraries table) this order's itinerary syncs to. */
  mirrorId?: string | null;
}
```

- [ ] **Step 2: Add imports**

The file already imports `loadItinerary`, `saveItinerary` from
`itineraryLibrary`. Add the rest plus the picker:

```ts
import {
  listItineraries,
  createItinerary,
} from "@/lib/admin/itineraryLibrary";
import TemplatePickerModal from "@/components/admin/TemplatePickerModal";
import { pickerRow, type PickerRowData } from "@/lib/admin/docLibrary.labels";
```

(Keep the existing `loadItinerary` / `saveItinerary` import line; merge if it is
from the same module.)

- [ ] **Step 3: Add state**

```ts
const [mirrorId, setMirrorId] = useState<string | null>(null);
const [orderNumber, setOrderNumber] = useState<string | null>(null);
const [pickerOpen, setPickerOpen] = useState(false);
const [pickerRowsState, setPickerRowsState] = useState<PickerRowData[]>([]);
const [pickerLoading, setPickerLoading] = useState(false);
```

- [ ] **Step 4: Hydrate `mirrorId` + `orderNumber`**

In `applyDraft`, add:

```ts
setMirrorId(d.mirrorId ?? null);
```

In the hydrate effect's `orderId` branch: the `else` fetches the order `o` —
add `setOrderNumber(o.order_number ?? null);` there. In the `if (saved)` branch,
also capture it:

```ts
if (saved) {
  applyDraft(saved);
  const { data: o } = await createClient()
    .from("orders")
    .select("order_number")
    .eq("id", orderId)
    .single();
  if (!cancelled && o) setOrderNumber(o.order_number ?? null);
}
```

- [ ] **Step 5: Carry `mirrorId` in `buildDraft`**

In the `buildDraft` callback's returned object, add `mirrorId,` and add
`mirrorId` to its dependency array.

- [ ] **Step 6: Mirror inside `persist` (orderId mode only)**

The existing `persist` saves to order doc / library / localStorage. Extend the
`orderId` branch so it also writes the `itineraries` mirror. Because `persist`
is a `useCallback` with deps, add `mirrorId`, `orderNumber`, `tripTitle`,
`customer` to its dependency array.

```ts
const persist = useCallback(
  async (draft: Draft): Promise<void> => {
    if (orderId) {
      await saveOrderDoc(orderId, "itinerary", draft);
      try {
        const title =
          [tripTitle, customer].filter(Boolean).join(" · ") || "Itinerary";
        if (!mirrorId) {
          const id = await createItinerary(title, { ...draft, mirrorId: null });
          if (id) setMirrorId(id);
        } else {
          await saveItinerary(mirrorId, title, { ...draft, mirrorId });
        }
      } catch {
        /* mirror is best-effort */
      }
      return;
    }
    if (libraryId) return saveItinerary(libraryId, title, draft);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return Promise.resolve();
  },
  [orderId, libraryId, title, mirrorId, orderNumber, tripTitle, customer]
);
```

Note: `createItinerary(title, data)` does not take an order number argument
(the `itineraries` table has no such column); provenance for itineraries is
carried by the trip title/customer in the data. That is acceptable and matches
the existing library schema.

- [ ] **Step 7: Picker handlers**

```ts
async function openPicker() {
  setPickerOpen(true);
  setPickerLoading(true);
  const rows = await listItineraries<Draft>();
  setPickerRowsState(rows.map((r) => pickerRow(r)));
  setPickerLoading(false);
}

async function pickFromLibrary(id: string) {
  setPickerOpen(false);
  const picked = await loadItinerary<Draft>(id);
  if (!picked) return;
  if (days.length > 0 && !confirm("Ganti itinerary dengan yang dipilih?")) return;
  // Keep this order's own mirror id; load everything else from the source.
  applyDraft({ ...picked.data, mirrorId });
}
```

- [ ] **Step 8: Source bar button + modal in JSX (orderId mode only)**

In the header toolbar, add (guarded by `orderId`, so library/localStorage modes
are unaffected):

```tsx
{orderId && (
  <button type="button" onClick={openPicker} className={btnSecondaryCls}>
    Pilih dari tersimpan
  </button>
)}
```

Before the component's final closing tag:

```tsx
<TemplatePickerModal
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  title="Pilih itinerary tersimpan"
  rows={pickerRowsState}
  loading={pickerLoading}
  onPick={pickFromLibrary}
/>
```

- [ ] **Step 9: Build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; no new lint errors in `ItineraryBuilderView.tsx`.

- [ ] **Step 10: Manual check (when Supabase live)**

1. Order → Itinerary tab. Generate/edit days. Within ~1s an `itineraries` row
   appears (mirror).
2. Edit again → same mirror row updates (no dup).
3. The mirror also shows in the standalone "Itinerary" tab list (expected).
4. "Pilih dari tersimpan" → pick a saved itinerary → days load; the order's
   mirror id is preserved (editing the order copy never mutates the picked
   source row).
5. "Generate dengan AI" / build-from-scratch still works unchanged.

- [ ] **Step 11: Commit**

```bash
git add components/admin/views/ItineraryBuilderView.tsx
git commit -m "feat(admin): itinerary — pick from saved + library mirror"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full build + lint**

Run: `npm run build && npm run lint`
Expected: clean build, no errors.

- [ ] **Step 2: Run all node tests**

Run: `node --test lib/admin/`
Expected: all `.mjs` tests pass (including the new `docLibrary.labels.test.mjs`).

- [ ] **Step 3: Confirm the three builders behave per design (manual, when Supabase live)**

Walk an order through all three tabs: pick-from-saved replaces content (with
confirm), edits autosave to both the order and a single synced mirror, the
original picked template is never mutated, and build-from-scratch still works.

- [ ] **Step 4: Commit any final touch-ups**

```bash
git add -A
git commit -m "chore(admin): order document library picker — final verification"
```

---

## Self-review notes

- **Spec coverage:** picker (Tasks 4–7) ✓; itinerary reuses `itineraries`
  (Task 7) ✓; invoice/joborder generic table + helper (Tasks 1, 3, 5, 6) ✓;
  autosave mirror with one synced row tagged by order number (Tasks 5–7) ✓;
  source template never mutated — picks preserve the order's own mirror id and
  load source data into the order copy only (Tasks 5–7 pick handlers) ✓;
  build-from-scratch / AI preserved (Task 7) ✓.
- **Type consistency:** mirror id is `libraryId` on `JobOrderData`/`InvoiceDraft`
  but `mirrorId` on the itinerary `Draft` (to avoid collision with the existing
  itinerary `libraryId` **prop/mode**) — this distinction is called out in
  Task 7 and used consistently.
- **Known consequence (accepted in spec):** autosave spawns one mirror per
  touched order; rows are tagged with `order_number` for legibility.
</content>
