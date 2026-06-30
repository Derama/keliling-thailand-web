# Self-Drive Car Rental Admin — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design), pending implementation plan
**Branch:** `admin-dashboard` (current)

## Summary

Add a second business line to the Keliling Thailand app: **self-drive car rental
(without driver)**. Build the **back-end admin first**, behind a **separate login**
from the existing tour admin. Star feature: a **handover inspection** record
capturing photos, video, odometer (KM), fuel/oil level, and customer signature at
both pickup and return — for damage-dispute proof.

V1 scope = **full operations + pricing/payments**. No customer-facing online
booking in v1.

## Context

- Existing tour admin lives at `app/admin/` using a route group `(panel)` gated by
  Supabase auth; roles (`operation` | `marketing`) stored in
  `user.app_metadata.role` (server-set, in JWT). See `lib/admin/role.ts`,
  `app/admin/(panel)/layout.tsx`.
- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts`
  (server, cookie session). Env: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- No SQL migrations are committed; Supabase schema is managed in the dashboard.
  The Supabase project is **not yet live** (tour admin is also awaiting it), so
  this work is built now and verified once the DB exists.
- Admin UI is **Indonesian-only** (not part of the public `lib/translations.ts`
  i18n). Mobile-first, mirrors tour admin styling.
- Shared UI primitives: `components/admin/ui.tsx` (`Field`, `inputCls`, `btnCls`,
  `ErrorNote`). Currency: `lib/currency.ts`, `components/ThbIdrConverter.tsx`.

## Chosen Approach

**New `/rental` route group with its own login and a new Supabase role
`"rental"`.** Mirrors the tour admin structure for maximum reuse and clean
isolation between the two businesses. Rejected: folding rental into the existing
admin as a third "team" (mixes businesses, user wanted a separate login); a
separate Next app / subdomain (overkill, duplication).

## Auth & Routing

- `app/rental/login/page.tsx` — email + password only (no team toggle). On success
  `router.push("/rental")`.
- `app/rental/layout.tsx` — metadata (`robots: noindex`), wrapper bg.
- `app/rental/(panel)/layout.tsx` — `supabase.auth.getUser()`; redirect to
  `/rental/login` if no user; require role `"rental"` (else redirect to
  `/rental/login` after signout, to avoid tour staff landing here). Wrap children
  in `RentalShell`.
- `lib/rental/role.ts` — `isRentalUser(user)` checks
  `app_metadata.role === "rental"`.
- `components/rental/RentalShell.tsx` — header (brand + "Rental" label + Keluar)
  and bottom nav (Dashboard, Armada, Penyewa, Sewa, Pembayaran), mirroring
  `AdminShell` / `AdminBottomNav`.

## Data Model (Supabase, snake_case)

Money stored in **THB**; IDR shown via `fx_rate` snapshot per rental (same pattern
as tour orders' `fx_rate`).

### `vehicles`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| plate | text | license plate, unique |
| name | text | e.g. "Toyota Vios 2022" |
| type | text | sedan/suv/etc (free text v1) |
| daily_rate_thb | numeric | |
| deposit_thb | numeric | default security deposit |
| status | text | `available` \| `rented` \| `maintenance` |
| photo_path | text null | Storage path, primary photo |
| notes | text null | |
| created_at | timestamptz | default now() |

### `renters`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | |
| phone | text null | |
| license_no | text null | driver's license number |
| license_photo_path | text null | Storage path |
| origin_city | text null | |
| notes | text null | |
| created_at | timestamptz | |

### `rentals`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| rental_number | text | human ref, unique (e.g. `R-2026-0001`) |
| vehicle_id | uuid fk → vehicles | |
| renter_id | uuid fk → renters | |
| start_date | date | |
| end_date | date | |
| days | int | derived but stored |
| daily_rate_thb | numeric | snapshot of vehicle rate at booking |
| deposit_thb | numeric | snapshot |
| total_thb | numeric | days × daily_rate_thb |
| fx_rate | numeric | THB→IDR snapshot for display |
| status | text | `booked` \| `out` \| `returned` \| `cancelled` |
| notes | text null | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `rental_handovers`
One row per side of the rental (kind = out at pickup, in at return).
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| rental_id | uuid fk → rentals | |
| kind | text | `out` \| `in` |
| odometer_km | int null | |
| fuel_level | text null | e.g. `full`/`3-4`/`1-2`/`1-4`/`empty` |
| oil_level | text null | `ok` \| `low` \| free text |
| signature | text null | data-URL (PNG) of signature pad |
| inspected_at | timestamptz | |
| notes | text null | condition / scratch notes |

Unique (rental_id, kind).

### `handover_media`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| handover_id | uuid fk → rental_handovers | |
| type | text | `photo` \| `video` |
| storage_path | text | Supabase Storage path in bucket `rental-media` |
| created_at | timestamptz | |

### `rental_payments`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| rental_id | uuid fk → rentals | |
| kind | text | `deposit` \| `rental` \| `refund` |
| amount_thb | numeric | |
| paid_at | timestamptz | |
| method | text null | cash/transfer/etc |
| note | text null | |

### Storage
- Bucket `rental-media` (private) for handover photos/videos and renter license
  photos. Access via signed URLs from the server, or RLS-gated reads.

### TypeScript
- `lib/rental/types.ts` — interfaces + status unions + label/color maps mirroring
  `lib/admin/types.ts` conventions (`STATUS_LABELS` etc., Indonesian labels).

## Screens (Indonesian, mobile-first)

1. **Dashboard** (`/rental`) — cards: total armada, mobil keluar (out), sewa aktif,
   pengembalian hari ini / overdue; list of recent rentals.
2. **Armada** (`/rental/vehicles`) — list of cars with status badge; add/edit form
   (plate, name, type, daily_rate_thb, deposit_thb, status, photo, notes).
3. **Penyewa** (`/rental/renters`) — list; add/edit form; renter detail shows
   rental history.
4. **Sewa** (`/rental/rentals`) — list with status filter. New-rental wizard:
   pick available car → pick/create renter → start/end dates → auto-compute days,
   total, deposit (editable) + fx_rate → save (sets vehicle status `rented`,
   rental `booked`). Detail page:
   - status control (booked → out → returned),
   - payment ledger (deposit/rental/refund) in THB with IDR display,
   - two handover panels (pickup, return).
5. **Handover form** — odometer_km, fuel_level, oil_level, condition notes;
   photo + video capture via native `<input type="file" accept capture>` →
   upload to `rental-media`; signature pad (hand-rolled `<canvas>`, no new dep);
   submit creates/updates the `out` or `in` handover. Return panel renders the
   pickup readings/photos alongside for comparison.
6. **Pembayaran** — surfaced inside rental detail (ledger). A standalone
   `/rental/payments` list view aggregates recent payments across rentals.

### Status transitions
- Rental: `booked` → `out` (on pickup handover saved) → `returned` (on return
  handover saved) ; `cancelled` allowed from booked. Vehicle status follows:
  `available` ↔ `rented`, manual `maintenance`.

## Reuse vs New

**Reuse:** `lib/supabase/client|server`, `components/admin/ui.tsx` primitives,
`lib/currency.ts` / `ThbIdrConverter` for IDR display, FX-snapshot pattern from
tour orders, route-group + role-gate pattern, `AdminBottomNav` structure.

**New:**
- `app/rental/` (login, layout, panel routes).
- `lib/rental/` (`role.ts`, `types.ts`, data helpers, `rentalNumber.ts`).
- `components/rental/` (`RentalShell`, `RentalBottomNav`, view components, forms,
  `SignaturePad.tsx`, `MediaUpload.tsx`).
- Supabase tables (6) + storage bucket. SQL provided in plan; applied manually in
  dashboard once project is live.

## Decisions

- **Signature:** hand-rolled `<canvas>` component — avoid a new dependency for a
  simple capture.
- **Media:** native file input with `capture` for camera/video; upload straight to
  Supabase Storage; store only the path in DB.
- **Currency:** THB is source of truth; IDR is display-only via per-rental
  `fx_rate`.
- **i18n:** admin UI is Indonesian-only; not added to `lib/translations.ts`.

## Out of Scope (v1)

- Customer-facing self-service online booking.
- Automated invoice/contract PDF generation and email/WhatsApp sending.
- Telematics / live GPS / odometer integration.
- Multi-language admin.
- Maintenance scheduling beyond a manual `maintenance` status.

## Verification

Built against the patterns above; functional verification (auth gate, CRUD,
uploads, signature, ledger math) happens once the Supabase project is live —
same gating as the existing tour admin.
