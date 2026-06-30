# Order page: pickup suggestions, itinerary→job order, invoice→price

**Date:** 2026-06-25
**Branch:** admin-dashboard

## Goal

Three connected improvements to the admin order flow, all without DB schema
changes:

1. "Lokasi jemput" (pickup location) becomes a suggested-location autocomplete
   backed by a free, keyless API.
2. The itinerary an admin types on the order seeds the Job Order, which is then
   downloadable from the order page.
3. The customer-facing invoice an admin saves on an order can drive the order's
   selling price ("Harga jual IDR").

## 1. Pickup location autocomplete

- **Route** `app/api/places/route.ts`: `GET ?q=<query>`. Proxies OpenStreetMap
  Nominatim `search` with `countrycodes=th`, `format=json`, `limit=6`,
  `addressdetails=1`. Sends a descriptive `User-Agent` (Nominatim usage policy
  requires it). Server-cached ~1h via `next: { revalidate: 3600 }`. Returns
  `{ results: [{ name, label }] }` where `name` is the short primary name and
  `label` is the full display string. On upstream failure returns
  `{ results: [] }` with status 502 — the field still accepts free text.
- **Component** `components/admin/PlaceAutocomplete.tsx`: controlled text input
  (`value` / `onChange`) with a debounced (~300ms) fetch to `/api/places` once
  the query is ≥3 chars. Renders a suggestion dropdown; clicking a suggestion
  fills the field. Typing freely is always allowed (no forced selection).
  Closes on blur/escape/select. Styled with the existing `inputCls`.
- **Wiring**: OrderForm "Lokasi jemput" field swaps its plain `<input>` for
  `PlaceAutocomplete`, bound to `draft.pickup_location`.

## 2. Itinerary → Job Order

- **Helper** `daysFromItineraryText(text, tripStartIso)` in
  `lib/admin/jobOrder.ts`: splits `text` on newlines, drops blank lines, strips
  a leading `Hari N:` / `Day N:` / `N.` prefix into the day's `itinerary`
  string, and derives each `date` as `DD/MM` from `tripStartIso + dayIndex`
  (blank when no trip start). Returns `JobOrderDay[]`; empty input yields a
  single blank day (preserves current default).
- **JobOrderBuilderView** seed branch (runs only when no saved job-order doc
  exists for the order): in addition to the header basics it already seeds, set
  `days` from `order.itinerary` via the helper. Saved drafts are untouched, so
  manual edits always win.
- **Download**: OrderDetail keeps its builder buttons. The **Job Order** button
  opens the prefilled builder; admin uses the existing "Print / Simpan PDF".
  Net effect: once an order exists, its job order is one click away and
  prefilled from the itinerary the admin typed.

## 3. Invoice → selling price

- The customer invoice flow already exists: Invoice builder → "Simpan ke order"
  inserts/updates a row in `invoices` for the order.
- **OrderForm** "Harga jual (IDR)" gains an **"Ambil dari invoice"** action,
  shown only when editing an existing order. On click it reads the order's
  invoices (`invoices` where `order_id = order.id`), sums `amount_idr`, and
  fills `price_idr`. If none exist it shows a short inline hint. This ties the
  selling price to the invoice the admin already saved.
- OrderDetail's existing invoice-vs-price reconciliation banner is unchanged.

## Scope / non-goals

- No schema change. Invoices stay per-order (not a customer-scoped library).
- No auto-generation of job orders on create; download is one click from the
  order page.
- Free text remains valid for pickup location; the API only suggests.

## Files

- New: `app/api/places/route.ts`, `components/admin/PlaceAutocomplete.tsx`
- Edit: `lib/admin/jobOrder.ts`, `components/admin/views/JobOrderBuilderView.tsx`,
  `components/admin/OrderForm.tsx`
