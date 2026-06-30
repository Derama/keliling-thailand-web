# Invoice, Brochure, and Job Order Libraries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dedicated saved-document libraries for Invoice, Brochure, and Job Order, matching Itinerary's New/Open/Duplicate/Delete workflow and preserving automatic order mirroring.

**Architecture:** Extend the existing `document_templates` store to support brochures, add one reusable library list component with three thin type-specific wrappers, and add standalone template-edit modes to the existing builders. Order mode remains the source of accounting/order side effects; template mode only reads and writes `document_templates`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase/PostgreSQL, Node test runner

---

### Task 1: Extend shared template storage to brochures

**Files:**
- Create: `scripts/migrations/013-document-template-brochures.sql`
- Modify: `lib/admin/docLibrary.ts`
- Create: `lib/admin/docLibrary.test.mjs`

- [ ] **Step 1: Write the failing storage contract test**

Create a source contract test that reads the migration and helper:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const helper = await readFile(new URL("./docLibrary.ts", import.meta.url), "utf8");
const migration = await readFile(
  new URL("../../scripts/migrations/013-document-template-brochures.sql", import.meta.url),
  "utf8"
);

test("supports brochure templates without dropping existing document rows", () => {
  assert.match(helper, /"invoice" \| "joborder" \| "brochure"/);
  assert.match(migration, /drop constraint if exists document_templates_kind_check/i);
  assert.match(migration, /kind in \('invoice', 'joborder', 'brochure'\)/i);
  assert.doesNotMatch(migration, /drop table/i);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk node --test lib/admin/docLibrary.test.mjs`

Expected: FAIL because the migration does not exist and `TemplateKind` excludes `brochure`.

- [ ] **Step 3: Add the additive migration**

```sql
alter table document_templates
  drop constraint if exists document_templates_kind_check;

alter table document_templates
  add constraint document_templates_kind_check
  check (kind in ('invoice', 'joborder', 'brochure'));
```

Update the helper type:

```ts
export type TemplateKind = "invoice" | "joborder" | "brochure";
```

- [ ] **Step 4: Verify the storage test passes**

Run: `rtk node --test lib/admin/docLibrary.test.mjs`

Expected: 1 test passes.

### Task 2: Build the reusable saved-document list

**Files:**
- Create: `components/admin/views/DocumentLibraryView.tsx`
- Modify: `lib/admin/docLibrary.test.mjs`

- [ ] **Step 1: Add a failing source contract for library actions**

Extend the test to assert the component calls `listTemplates`, `createTemplate`, and `deleteTemplate`, renders New/Open/Duplicate/Delete actions, and passes the selected id to a builder render callback.

```js
const view = await readFile(
  new URL("../../components/admin/views/DocumentLibraryView.tsx", import.meta.url),
  "utf8"
);
assert.match(view, /listTemplates/);
assert.match(view, /createTemplate/);
assert.match(view, /deleteTemplate/);
for (const label of ["Buka", "Duplikat", "Hapus"]) assert.match(view, new RegExp(label));
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk node --test lib/admin/docLibrary.test.mjs`

Expected: FAIL because `DocumentLibraryView.tsx` does not exist.

- [ ] **Step 3: Implement the reusable component**

Use this public contract:

```tsx
interface DocumentLibraryViewProps<T> {
  kind: TemplateKind;
  heading: string;
  description: string;
  newLabel: string;
  emptyLabel: string;
  createDraft: () => T;
  renderBuilder: (id: string, onExit: () => void) => React.ReactNode;
}

export default function DocumentLibraryView<T>({ ...props }: DocumentLibraryViewProps<T>)
```

The component must:

- load rows newest-first with `listTemplates<T>(kind)`;
- use `pickerRow(row)` for the primary and secondary labels;
- create a blank row with `createTemplate(kind, "", createDraft(), null)`;
- duplicate with a new id, `${pickerRow(row).label} (salinan)`, the same draft, and `order_number = null`;
- confirm before `deleteTemplate(row.id)`;
- render the builder while `openId` is set;
- clear `openId` and reload after builder exit;
- show loading, empty, error, and busy states matching `ItineraryLibraryView`.

- [ ] **Step 4: Verify the shared-list test passes**

Run: `rtk node --test lib/admin/docLibrary.test.mjs`

Expected: all storage/list tests pass.

### Task 3: Add standalone library mode to Invoice

**Files:**
- Modify: `components/admin/views/InvoiceBuilderView.tsx`
- Create: `components/admin/views/InvoiceLibraryView.tsx`
- Modify: `lib/admin/docLibrary.test.mjs`

- [ ] **Step 1: Add a failing Invoice library-mode contract**

Assert that `InvoiceBuilderView` accepts `templateId` and `onExit`, loads with `loadTemplate<InvoiceDraft>(templateId)`, saves with `saveTemplate`, and guards accounting persistence behind `orderId`.

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk node --test lib/admin/docLibrary.test.mjs`

Expected: FAIL because Invoice has no standalone template mode.

- [ ] **Step 3: Implement Invoice template mode**

Export `InvoiceDraft` and add props:

```ts
templateId?: string;
onExit?: () => void;
```

Add `templateTitle` state. Hydration order is `orderId`, then `templateId`, then current blank/local behavior. In template mode, load the row, set its title, apply its draft with `libraryId: null` and `savedInvoiceId: null`, and set `hydrated.current = true`.

Update `applyDraft` so missing fields use the builder's existing initial defaults (`Hotel + Transport`, `Love Bangkok.Co.Ltd`, generated invoice number, current/due dates) rather than blanking a newly created document.

Add a debounced template-only save effect:

```ts
if (!templateId || !hydrated.current) return;
const t = setTimeout(() => {
  saveTemplate(templateId, templateTitle.trim() || invoiceNumber || "Invoice", {
    ...draft,
    libraryId: null,
    savedInvoiceId: null,
  });
}, 600);
return () => clearTimeout(t);
```

Show a back action and editable title only in template mode. Keep `saveToOrder()` and accounting writes available only when `orderId` exists.

- [ ] **Step 4: Add the Invoice library wrapper**

```tsx
export default function InvoiceLibraryView() {
  return (
    <DocumentLibraryView<InvoiceDraft>
      kind="invoice"
      heading="Invoice"
      description="Invoice tersimpan. Buka untuk lanjut menyunting, atau buat baru."
      newLabel="+ Invoice baru"
      emptyLabel="Belum ada invoice tersimpan."
      createDraft={() => ({}) as InvoiceDraft}
      renderBuilder={(id, onExit) => (
        <InvoiceBuilderView templateId={id} onExit={onExit} />
      )}
    />
  );
}
```

The builder's existing default-state fallbacks must handle the empty draft.

- [ ] **Step 5: Verify Invoice tests and lint**

Run: `rtk node --test lib/admin/docLibrary.test.mjs && rtk npm run lint -- components/admin/views/InvoiceBuilderView.tsx components/admin/views/InvoiceLibraryView.tsx`

Expected: tests pass; ESLint exits 0.

### Task 4: Add standalone library mode to Job Order

**Files:**
- Modify: `components/admin/views/JobOrderBuilderView.tsx`
- Create: `components/admin/views/JobOrderLibraryView.tsx`
- Modify: `lib/admin/docLibrary.test.mjs`

- [ ] **Step 1: Add a failing Job Order mode contract**

Assert `templateId`/`onExit` props, `loadTemplate<JobOrderData>`, template-mode `saveTemplate`, and the library wrapper with `kind="joborder"`.

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk node --test lib/admin/docLibrary.test.mjs`

Expected: FAIL because Job Order only supports order mode.

- [ ] **Step 3: Implement Job Order template mode**

Add `templateId`, `onExit`, and `templateTitle`. Hydrate from `loadTemplate` when no `orderId`. Update the existing explicit `save()` function:

```ts
if (templateId) {
  await saveTemplate(
    templateId,
    templateTitle.trim() || jobOrderNo || "Job Order",
    { ...data, libraryId: null }
  );
  setSaved(true);
  return;
}
if (!orderId) return;
// existing order mirror + order_documents save
```

Show the same back/title controls as Invoice. Keep the order mirror id isolated when picking a source template.

- [ ] **Step 4: Add the Job Order library wrapper**

Use `DocumentLibraryView<JobOrderData>` with `kind="joborder"`, an empty draft containing editable defaults and one blank day/hotel set, and `JobOrderBuilderView templateId={id}`.

- [ ] **Step 5: Verify Job Order tests and lint**

Run: `rtk node --test lib/admin/docLibrary.test.mjs && rtk npm run lint -- components/admin/views/JobOrderBuilderView.tsx components/admin/views/JobOrderLibraryView.tsx`

Expected: tests pass; ESLint exits 0.

### Task 5: Add Brochure storage, order mirroring, and library mode

**Files:**
- Modify: `components/admin/views/BrochureBuilderView.tsx`
- Create: `components/admin/views/BrochureLibraryView.tsx`
- Modify: `lib/admin/docLibrary.test.mjs`

- [ ] **Step 1: Add a failing Brochure contract**

Assert the builder imports generic template CRUD, supports `templateId`/`onExit`, mirrors order brochures with `kind="brochure"`, and the wrapper renders `DocumentLibraryView` for brochure.

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk node --test lib/admin/docLibrary.test.mjs`

Expected: FAIL because Brochure currently uses only `order_documents`/localStorage.

- [ ] **Step 3: Implement Brochure template and mirror identity**

Export `BrochureDraft` and add `libraryId?: string | null` to its persisted shape. Add `templateId`, `onExit`, `templateTitle`, `libraryId`, and `orderNumber` state.

Hydration order:

1. `orderId`: load `order_documents`, retain/fetch order number;
2. `templateId`: `loadTemplate<BrochureDraft>`, apply draft, clear embedded `libraryId`;
3. fallback: current local draft behavior.

Autosave branches:

- order mode: save `order_documents`; create or update one `brochure` mirror tagged with `orderNumber`;
- template mode: update `templateId` only, with `order_number` unchanged and embedded `libraryId: null`;
- legacy standalone mode: retain localStorage only if neither id is present.

When a saved brochure is picked into an order, preserve the order's existing `libraryId`.

- [ ] **Step 4: Add the Brochure library wrapper**

Use `DocumentLibraryView<BrochureDraft>` with `kind="brochure"`, `DEFAULT_META`, `DEFAULT_FLEET`, default notes, and empty catalog arrays. Render `BrochureBuilderView templateId={id}`.

- [ ] **Step 5: Verify Brochure tests and lint**

Run: `rtk node --test lib/admin/docLibrary.test.mjs && rtk npm run lint -- components/admin/views/BrochureBuilderView.tsx components/admin/views/BrochureLibraryView.tsx`

Expected: tests pass; ESLint exits 0.

### Task 6: Route admin tabs through the libraries and verify end to end

**Files:**
- Modify: `app/admin/(panel)/page.tsx`
- Modify: `lib/admin/docLibrary.test.mjs`

- [ ] **Step 1: Add a failing navigation contract**

Assert the admin page imports and maps `InvoiceLibraryView`, `BrochureLibraryView`, and `JobOrderLibraryView` instead of direct builder components.

- [ ] **Step 2: Run the test and verify it fails**

Run: `rtk node --test lib/admin/docLibrary.test.mjs`

Expected: FAIL because tabs still point directly to builders.

- [ ] **Step 3: Replace direct builder tab mappings**

```tsx
{ id: "invoice", label: "Buat Invoice", View: InvoiceLibraryView },
{ id: "brochure", label: "Brosur", View: BrochureLibraryView },
{ id: "joborder", label: "Job Order", View: JobOrderLibraryView },
```

OrderDetail continues importing the builders directly, preserving order-mode behavior.

- [ ] **Step 4: Run complete verification**

Run:

```bash
rtk node --experimental-strip-types --test components/admin/ItineraryDoc.test.mjs lib/admin/docLibrary.test.mjs lib/admin/itinerary.test.mjs lib/admin/itineraryGeneration.test.mjs lib/currency.test.mjs lib/publicPriceBook.test.mjs lib/rental/pricing.test.mjs lib/rental/rentalNumber.test.mjs
rtk npm run lint
rtk npm run build
rtk git diff --check
```

Expected: all tests pass, lint exits 0, production build exits 0, and diff check is empty.

- [ ] **Step 5: Manual database verification after migration**

Apply `013-document-template-brochures.sql`, then verify for each library:

- New creates one row of the correct kind;
- edits survive close/reopen;
- Duplicate creates an independent row with no order number;
- Delete removes only the library row;
- creating/editing from an Order produces or updates one mirrored row;
- Invoice template mode never writes to `invoices` or changes order finance;
- PDF output remains unchanged.
