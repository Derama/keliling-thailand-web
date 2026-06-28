# Order document library picker — design

Date: 2026-06-28
Branch: admin-dashboard

## Problem

Inside an order's detail tabs (Invoice / Job Order / Itinerary), the admin can
only build each document from scratch (or via AI, for the itinerary). There is
no way to start an order's document from a previously-saved one. Repeated trips
with similar itineraries/invoices/job orders are rebuilt by hand each time.

The admin wants, per order document:

1. **See and reuse** previously-saved documents of that kind.
2. **Pick one** as the starting point for this order, then **modify** it.
3. Saving the modified version attaches it to the order **and** creates a new
   saved (library) entry, leaving the original template untouched.
4. **Opt in** per document: start from a saved one, or build from scratch
   (itinerary keeps its AI generation path).

Scope: all three order documents — Invoice, Job Order, Itinerary.

## Current state

- Each builder (`InvoiceBuilderView`, `JobOrderBuilderView`,
  `ItineraryBuilderView`) already runs in `orderId` mode: on mount it loads the
  order's saved draft from `order_documents` (`loadOrderDoc(orderId, kind)`),
  edits autosave back (debounced ~600ms via `saveOrderDoc`), and there are
  explicit save buttons. So per-order persistence already works.
- **Itinerary** additionally has a standalone library: the `itineraries` table
  (`lib/admin/itineraryLibrary.ts`) and the "Itinerary" top-level tab
  (`ItineraryLibraryView`). The builder already supports a `libraryId` mode that
  reads/writes that table.
- **Invoice** and **Job Order** have **no** library/template store — they only
  persist per order in `order_documents`.

## Design

### Storage

- **Itinerary** — reuse the existing `itineraries` table and
  `lib/admin/itineraryLibrary.ts`. The per-order mirror writes there, so mirrored
  itineraries also appear in the existing Itinerary library tab.
- **Invoice + Job Order** — add one generic template table:

  ```sql
  -- scripts/migrations/012-document-templates.sql
  create table if not exists document_templates (
    id           uuid primary key default gen_random_uuid(),
    kind         text not null check (kind in ('invoice','joborder')),
    title        text not null default '',
    data         jsonb not null default '{}'::jsonb,
    order_number text,                      -- provenance: which order spawned it
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

  New `lib/admin/docLibrary.ts` mirrors the shape of `itineraryLibrary.ts`:

  ```ts
  export type TemplateKind = "invoice" | "joborder";
  export interface TemplateRow<T = unknown> {
    id: string; kind: TemplateKind; title: string; data: T; updated_at: string;
    order_number: string | null;
  }
  listTemplates<T>(kind: TemplateKind): Promise<TemplateRow<T>[]>;
  loadTemplate<T>(id: string): Promise<{ title: string; data: T } | null>;
  createTemplate<T>(kind, title, data, orderNumber?): Promise<string | null>;
  saveTemplate<T>(id, title, data): Promise<void>;
  deleteTemplate(id): Promise<void>;
  ```

### Shared picker component

`components/admin/TemplatePickerModal.tsx` — a small modal (built on the
existing `Modal`) used by all three builders to avoid 3× duplication.

Props:

```ts
{
  open: boolean;
  onClose: () => void;
  rows: { id: string; label: string; sub?: string }[]; // pre-formatted by caller
  loading: boolean;
  onPick: (id: string) => void;
}
```

The caller fetches rows (via `listItineraries()` or `listTemplates(kind)`),
formats label/sub (title + day-count / date / order number), and handles the
pick. Keeps the modal source-agnostic.

### Per-builder changes (orderId mode only)

Each of the three builders gains, when `orderId` is set:

1. **Source bar** at the top of the editor column:
   - `Pilih dari tersimpan` button → opens `TemplatePickerModal` with that
     kind's saved rows. On pick: load the chosen draft into the editor via the
     builder's existing `applyDraft(...)`. If the editor already has content,
     confirm before replacing.
   - `Buat dari awal` button → itinerary: surfaces/clears for the AI generator
     (existing). Invoice/Job Order: clears to a blank draft.
   - The bar is **always visible** so the admin can swap/replace at any time,
     even after an itinerary already exists for the order.

2. **Autosave mirror** to the library:
   - Extend each builder's draft type with `libraryId?: string | null`.
   - The existing debounced autosave-to-order cycle (orderId mode) also writes
     the mirror in the same pass:
     - if `libraryId` is empty → create a library/template row (tagged with the
       order's `order_number`), then store the returned id back into the draft
       (which the next order-doc autosave persists);
     - if `libraryId` is set → update that same row.
   - Result: exactly one library mirror per order, auto-kept in sync. The
     template the admin originally picked from is never mutated by this — the
     mirror is a distinct new row.
   - Itinerary mirrors into `itineraries` (`createItinerary` / `saveItinerary`).
     Invoice/Job Order mirror into `document_templates` via `docLibrary.ts`.

### Data flow (per document, orderId mode)

```
mount → loadOrderDoc(orderId, kind)
          ├─ found  → applyDraft(orderDoc)         (libraryId may be set)
          └─ none   → seed from order basics        (libraryId = null)

user edits ─┐
            ├─(debounced)→ saveOrderDoc(orderId, kind, draft)   [order_documents]
            └─(debounced)→ mirror:
                  libraryId == null → create row (tag order_number) → set draft.libraryId
                  libraryId != null → update row

"Pilih dari tersimpan" → pick id → load{Itinerary|Template}(id).data
                         → confirm-if-dirty → applyDraft(picked)
                         (draft.libraryId stays the order's own mirror id;
                          editing the order copy never touches the picked source)
```

### Why this shape

- Reuses every builder's existing `applyDraft` / autosave / `orderId` plumbing —
  the change is additive (a source bar + a mirror write), not a rewrite.
- One generic table + helper for invoice/joborder instead of two near-identical
  tables; itinerary keeps its existing, already-wired library so its standalone
  tab keeps working unchanged.
- The `libraryId`-on-draft pattern matches how the invoice builder already
  tracks `savedInvoiceId` to avoid duplicate rows.

## Consequences / accepted trade-offs

- **Library fills with per-order mirrors.** Because the mirror is created on
  autosave (not an explicit "save as template" press), every order whose
  Invoice/Job Order/Itinerary tab is touched spawns one saved row. Each row is
  tagged with its `order_number` so the lists stay legible. Accepted by the
  owner. (A future cleanup/archival pass is out of scope.)
- Invoice "templates" are order-specific financial documents; reusing one as a
  starting point is a convenience, the admin still edits amounts per order.

## Out of scope

- No new top-level tabs for an invoice/job-order library (the picker lives only
  inside the order). The itinerary keeps its existing standalone tab.
- No archival/cleanup UI for accumulated mirrors.
- No changes to print/PDF output, payments, or order pricing logic.

## Files

- `scripts/migrations/012-document-templates.sql` (new)
- `lib/admin/docLibrary.ts` (new)
- `components/admin/TemplatePickerModal.tsx` (new)
- `components/admin/views/ItineraryBuilderView.tsx` — source bar + mirror into
  `itineraries`; add `libraryId` to `Draft`.
- `components/admin/views/InvoiceBuilderView.tsx` — source bar + mirror via
  `docLibrary`; add `libraryId` to `InvoiceDraft`.
- `components/admin/views/JobOrderBuilderView.tsx` — source bar + mirror via
  `docLibrary`; add `libraryId` to `JobOrderData`.
</content>
</invoke>
