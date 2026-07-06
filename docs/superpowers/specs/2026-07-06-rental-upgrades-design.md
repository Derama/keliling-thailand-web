# Rental Admin Upgrades — Full Price, T&C Agreement, Damage Log

Date: 2026-07-06
Status: approved

Upgrades the existing self-drive rental admin (`/rental`, built 2026-06-17) with three changes requested by the owner: full-price-only pricing (no deposit/down payment), a printable terms-and-conditions rental agreement signed at pickup, and a structured per-panel damage log replacing reliance on the free-text condition note.

## A. Full price, no deposit (UI-only removal)

Deposit disappears from the UI; DB columns stay (default 0) so no migration and no data risk.

- `components/rental/RentalWizard.tsx`: remove the deposit input; insert `deposit_thb: 0`. Total remains `days × daily_rate` (already the behavior of `lib/rental/pricing.ts`).
- `components/rental/VehicleForm.tsx`: remove deposit input; save `deposit_thb: 0`.
- `components/rental/views/VehiclesView.tsx`: remove "deposit …" from the list row.
- `components/rental/RentalDetail.tsx`: remove the deposit display line. Payment form offers only **Sewa | Refund** (`PAYMENT_KINDS` shrinks to `["rental", "refund"]`); `PAYMENT_KIND_LABELS` keeps the `deposit` entry so any existing deposit rows still render. Ledger math unchanged: rental = inflow, refund = outflow, deposit rows (legacy) count as inflow.
- `lib/rental/types.ts`: `PaymentKind` union keeps `"deposit"` (legacy rows), `PAYMENT_KINDS` constant drops it. `deposit_thb` fields stay in interfaces (DB still returns them).

## B. Terms & conditions + printable agreement

- New `lib/rental/terms.ts`: `TERMS_VERSION` (e.g. `"2026-07-06"`) and `RENTAL_TERMS: string[]` — ~10 standard Indonesian self-drive clauses: valid SIM/driving license required; vehicle returned with same fuel level; renter liable for damage/loss during rental period; traffic fines/tolls/parking borne by renter; late return charged one extra day per 24h (grace period 2 hours); no subrental, racing, illegal use, or driving outside agreed region; vehicle returned in clean/reasonable condition; accidents must be reported immediately; owner not liable for renter's belongings; force majeure clause.
- Pickup handover (`HandoverForm`, `kind="out"` only): collapsible T&C section + required checkbox "Penyewa menyetujui syarat & ketentuan" — save blocked until checked. The existing signature pad signs inspection + agreement together.
- Schema: `rental_handovers` gains `terms_agreed boolean not null default false` and `terms_version text`.
- New printable page `app/rental/(panel)/rentals/[id]/agreement/page.tsx` (client): business header, rental number, renter (name, phone, license no), vehicle (name, plate), dates + days, full price (THB, IDR via fx_rate), pickup condition (odometer, fuel, damage list), numbered T&C clauses, renter signature image from pickup handover, date line. Print via `window.print()` with print CSS (hide nav/buttons). Link/button from `RentalDetail`.

## C. Structured damage log

- New table:

```sql
create table if not exists handover_damages (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references rental_handovers(id) on delete cascade,
  panel text not null,
  severity text not null,        -- lecet | penyok | pecah
  note text,
  photo_path text,               -- rental-media bucket
  created_at timestamptz not null default now()
);
```

- Fixed panel list (Indonesian labels) in `lib/rental/types.ts`: bumper depan, bumper belakang, kap mesin, atap, bagasi, pintu depan kiri, pintu depan kanan, pintu belakang kiri, pintu belakang kanan, spion kiri, spion kanan, lampu depan, lampu belakang, velg depan kiri, velg depan kanan, velg belakang kiri, velg belakang kanan, kaca depan, kaca belakang.
- Severity: `lecet` (scratch) | `penyok` (dent) | `pecah` (broken/cracked).
- New `components/rental/DamageLog.tsx`, rendered inside `HandoverForm` once the handover row exists (same gating as MediaUpload): add-damage row (panel Select + severity Select + note input + optional photo upload to `rental-media` under `damages/<handoverId>/`), list of recorded damages with photo thumbnail (signed URL) and delete button.
- Return handover panel (`kind="in"`) shows the pickup damage list read-only above its own log, so staff can spot NEW damage (renter liability).
- The free-text "Catatan kondisi / lecet" field stays as a general note, relabeled "Catatan umum".
- Agreement print page includes the pickup damage list.

## SQL delivery

One new file `docs/superpowers/sql/rental-upgrades.sql`: `handover_damages` table + RLS (same authenticated-all policy pattern) + the two `rental_handovers` columns via `alter table ... add column if not exists`. Owner runs it manually in the Supabase SQL editor, same workflow as `rental-schema.sql`.

## Non-goals

- No online booking, no deposit migration/column drop, no editable-T&C admin UI, no tap-on-diagram damage markers.

## Testing

- `npm run build` + `npm run lint` clean.
- Existing pure-logic tests (`pricing.test.mjs`, `rentalNumber.test.mjs`) still pass; no new pure logic expected (damage log is CRUD).
- Live smoke on dev server: create rental (no deposit field), pickup handover with T&C checkbox + damage entry + photo, agreement page renders and prints.
