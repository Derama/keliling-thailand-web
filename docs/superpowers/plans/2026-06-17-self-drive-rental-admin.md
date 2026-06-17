# Self-Drive Car Rental Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a back-end admin for a new self-drive (no-driver) car rental business inside the existing Keliling Thailand Next.js app, behind a separate `/rental` login, with fleet, renters, rentals, pricing/payments, and a pickup/return handover inspection (photos, video, odometer, fuel/oil, signature).

**Architecture:** New `/rental` route group mirroring the existing `app/admin` tour admin: a Supabase-auth-gated `(panel)` layout, a hub page with tab views + dedicated detail routes for drill-ins. New role `"rental"` in `app_metadata`. New `lib/rental/` (pure logic + types) and `components/rental/` (shell + views + forms). Money stored in THB, IDR shown via a per-rental `fx_rate` snapshot. Six new Supabase tables + a private Storage bucket.

**Tech Stack:** Next.js 16 (App Router) / React 19 / TypeScript, Tailwind v4, `@supabase/ssr` (browser + server clients already in `lib/supabase/`). Pure-logic tests run with plain `node` `.test.mjs` files (matches `lib/currency.test.mjs`). No UI test harness exists; UI/DB tasks verify via `npm run lint`, `npm run build`, and manual checks once Supabase is live.

**Conventions to follow (already in the repo):**
- Admin UI is **Indonesian-only**; do not touch `lib/translations.ts`.
- Reuse `components/admin/ui.tsx` (`Field`, `inputCls`, `btnCls`, `btnSecondaryCls`, `ErrorNote`).
- Reuse `lib/admin/utils.ts` (`formatIDR`, `formatTHB`, `formatDate`, `isoLocal`).
- Views are `"use client"` and fetch via `createClient()` from `@/lib/supabase/client` inside `useEffect`.
- Brand colors: `#F5C518` yellow, `#1B2A4A` navy, `#25D366` WhatsApp green.
- Commit after each task. Branch is `admin-dashboard`.

**Note on TDD:** Strict test-first applies to the pure-logic modules (Tasks 3–4). UI and Supabase-wiring tasks have no automated harness in this project and the Supabase project is not yet live (same gating as the tour admin), so their "verify" steps are lint + build + a written manual-check checklist.

---

## File Structure

**Create:**
- `docs/superpowers/sql/rental-schema.sql` — DDL + storage bucket (applied manually in Supabase dashboard)
- `lib/rental/types.ts` — interfaces, status unions, label/color maps
- `lib/rental/pricing.ts` — `rentalDays`, `rentalTotal`
- `lib/rental/pricing.test.mjs`
- `lib/rental/rentalNumber.ts` — `buildRentalNumber`
- `lib/rental/rentalNumber.test.mjs`
- `lib/rental/role.ts` — `isRentalUser`
- `app/rental/layout.tsx`
- `app/rental/login/page.tsx`
- `app/rental/(panel)/layout.tsx`
- `app/rental/(panel)/page.tsx` — hub with tabs
- `app/rental/(panel)/rentals/new/page.tsx`
- `app/rental/(panel)/rentals/[id]/page.tsx`
- `components/rental/RentalShell.tsx`
- `components/rental/RentalBottomNav.tsx`
- `components/rental/SignaturePad.tsx`
- `components/rental/MediaUpload.tsx`
- `components/rental/HandoverForm.tsx`
- `components/rental/VehicleForm.tsx`
- `components/rental/RenterForm.tsx`
- `components/rental/RentalWizard.tsx`
- `components/rental/RentalDetail.tsx`
- `components/rental/views/DashboardView.tsx`
- `components/rental/views/VehiclesView.tsx`
- `components/rental/views/RentersView.tsx`
- `components/rental/views/RentalsView.tsx`
- `components/rental/views/PaymentsView.tsx`

**Reuse (no change):** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `components/admin/ui.tsx`, `lib/admin/utils.ts`, `lib/currency.ts`.

---

## Task 1: Database schema + storage bucket

**Files:**
- Create: `docs/superpowers/sql/rental-schema.sql`

This SQL is applied by hand in the Supabase SQL editor when the project is live. It is committed as the source of truth.

- [ ] **Step 1: Write the schema file**

```sql
-- Self-drive car rental admin schema.
-- Money stored in THB; IDR is display-only via rentals.fx_rate.

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  name text not null,
  type text,
  daily_rate_thb numeric not null default 0,
  deposit_thb numeric not null default 0,
  status text not null default 'available',     -- available | rented | maintenance
  photo_path text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists renters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  license_no text,
  license_photo_path text,
  origin_city text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists rentals (
  id uuid primary key default gen_random_uuid(),
  rental_number text not null unique,
  vehicle_id uuid not null references vehicles(id),
  renter_id uuid not null references renters(id),
  start_date date not null,
  end_date date not null,
  days int not null default 1,
  daily_rate_thb numeric not null default 0,
  deposit_thb numeric not null default 0,
  total_thb numeric not null default 0,
  fx_rate numeric not null default 0,
  status text not null default 'booked',         -- booked | out | returned | cancelled
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rental_handovers (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references rentals(id) on delete cascade,
  kind text not null,                            -- out | in
  odometer_km int,
  fuel_level text,                               -- full | 3-4 | 1-2 | 1-4 | empty
  oil_level text,                                -- ok | low
  signature text,                                -- PNG data-URL
  inspected_at timestamptz not null default now(),
  notes text,
  unique (rental_id, kind)
);

create table if not exists handover_media (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references rental_handovers(id) on delete cascade,
  type text not null,                            -- photo | video
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists rental_payments (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references rentals(id) on delete cascade,
  kind text not null,                            -- deposit | rental | refund
  amount_thb numeric not null default 0,
  paid_at timestamptz not null default now(),
  method text,
  note text
);

-- Private storage bucket for handover photos/videos + license photos.
insert into storage.buckets (id, name, public)
values ('rental-media', 'rental-media', false)
on conflict (id) do nothing;

-- RLS: any authenticated user may read/write rental tables. The /rental panel
-- already gates by app_metadata.role = 'rental' at the layout level; tighten
-- per-role here later if tour staff and rental staff must be DB-isolated.
alter table vehicles enable row level security;
alter table renters enable row level security;
alter table rentals enable row level security;
alter table rental_handovers enable row level security;
alter table handover_media enable row level security;
alter table rental_payments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['vehicles','renters','rentals','rental_handovers','handover_media','rental_payments']
  loop
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true);',
      t || '_authenticated_all', t
    );
  end loop;
end $$;

-- Storage policies for the rental-media bucket (authenticated read/write).
create policy "rental_media_read" on storage.objects
  for select to authenticated using (bucket_id = 'rental-media');
create policy "rental_media_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'rental-media');
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/sql/rental-schema.sql
git commit -m "Add self-drive rental DB schema + storage bucket SQL"
```

---

## Task 2: Rental types

**Files:**
- Create: `lib/rental/types.ts`

- [ ] **Step 1: Write the types module**

```typescript
// Self-drive rental domain types. Mirrors lib/admin/types.ts conventions.
// Admin UI is Indonesian-only.

export type VehicleStatus = "available" | "rented" | "maintenance";
export type RentalStatus = "booked" | "out" | "returned" | "cancelled";
export type HandoverKind = "out" | "in";
export type PaymentKind = "deposit" | "rental" | "refund";
export type FuelLevel = "full" | "3-4" | "1-2" | "1-4" | "empty";

export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  type: string | null;
  daily_rate_thb: number;
  deposit_thb: number;
  status: VehicleStatus;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface Renter {
  id: string;
  name: string;
  phone: string | null;
  license_no: string | null;
  license_photo_path: string | null;
  origin_city: string | null;
  notes: string | null;
  created_at: string;
}

export interface Rental {
  id: string;
  rental_number: string;
  vehicle_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  days: number;
  daily_rate_thb: number;
  deposit_thb: number;
  total_thb: number;
  fx_rate: number;
  status: RentalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Rental joined with vehicle + renter (select("*, vehicles(*), renters(*)")). */
export interface RentalWithRefs extends Rental {
  vehicles: Vehicle;
  renters: Renter;
}

export interface RentalHandover {
  id: string;
  rental_id: string;
  kind: HandoverKind;
  odometer_km: number | null;
  fuel_level: FuelLevel | null;
  oil_level: string | null;
  signature: string | null;
  inspected_at: string;
  notes: string | null;
}

export interface HandoverMedia {
  id: string;
  handover_id: string;
  type: "photo" | "video";
  storage_path: string;
  created_at: string;
}

export interface RentalPayment {
  id: string;
  rental_id: string;
  kind: PaymentKind;
  amount_thb: number;
  paid_at: string;
  method: string | null;
  note: string | null;
}

export const VEHICLE_STATUSES: VehicleStatus[] = [
  "available",
  "rented",
  "maintenance",
];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: "Tersedia",
  rented: "Disewa",
  maintenance: "Servis",
};

export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  available: "bg-green-100 text-green-800",
  rented: "bg-yellow-100 text-yellow-800",
  maintenance: "bg-gray-200 text-gray-700",
};

export const RENTAL_STATUSES: RentalStatus[] = [
  "booked",
  "out",
  "returned",
  "cancelled",
];

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  booked: "Dipesan",
  out: "Keluar",
  returned: "Kembali",
  cancelled: "Batal",
};

export const RENTAL_STATUS_COLORS: Record<RentalStatus, string> = {
  booked: "bg-blue-100 text-blue-800",
  out: "bg-yellow-100 text-yellow-800",
  returned: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const FUEL_LEVELS: FuelLevel[] = ["full", "3-4", "1-2", "1-4", "empty"];

export const FUEL_LEVEL_LABELS: Record<FuelLevel, string> = {
  full: "Penuh",
  "3-4": "3/4",
  "1-2": "1/2",
  "1-4": "1/4",
  empty: "Kosong",
};

export const PAYMENT_KINDS: PaymentKind[] = ["deposit", "rental", "refund"];

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  deposit: "Deposit",
  rental: "Sewa",
  refund: "Refund",
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `lib/rental/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/rental/types.ts
git commit -m "Add rental domain types"
```

---

## Task 3: Pricing logic (TDD)

**Files:**
- Create: `lib/rental/pricing.ts`
- Test: `lib/rental/pricing.test.mjs`

`rentalDays` = calendar days between `start_date` and `end_date` (YYYY-MM-DD), minimum 1 (a same-day rental counts as 1 day). `rentalTotal` = days × dailyRate.

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert";
import { test } from "node:test";
import { rentalDays, rentalTotal } from "./pricing.ts";

test("rentalDays counts the span between two dates", () => {
  assert.strictEqual(rentalDays("2026-06-17", "2026-06-20"), 3);
});

test("rentalDays returns 1 for a same-day rental", () => {
  assert.strictEqual(rentalDays("2026-06-17", "2026-06-17"), 1);
});

test("rentalDays returns 1 when end is before start", () => {
  assert.strictEqual(rentalDays("2026-06-20", "2026-06-17"), 1);
});

test("rentalDays returns 0 for missing input", () => {
  assert.strictEqual(rentalDays("", "2026-06-20"), 0);
  assert.strictEqual(rentalDays("2026-06-17", ""), 0);
});

test("rentalDays is not shifted by timezone", () => {
  // Pure date math must not depend on UTC offset.
  assert.strictEqual(rentalDays("2026-12-31", "2027-01-02"), 2);
});

test("rentalTotal multiplies days by daily rate", () => {
  assert.strictEqual(rentalTotal(3, 1200), 3600);
});

test("rentalTotal is 0 for non-positive inputs", () => {
  assert.strictEqual(rentalTotal(0, 1200), 0);
  assert.strictEqual(rentalTotal(3, 0), 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/rental/pricing.test.mjs`
Expected: FAIL — cannot find module `./pricing.ts` / `rentalDays is not a function`.
(Node 22+ runs `.ts` via type-stripping. If the runner cannot import `.ts`, rename the source to `pricing.mjs` and keep a `pricing.ts` re-export — but try `.ts` first; the repo's `currency.test.mjs` imports `currency.ts` the same way.)

- [ ] **Step 3: Write the implementation**

```typescript
// Pure rental pricing. No timezone dependence: parse YYYY-MM-DD as UTC noon
// so day-count is stable regardless of the machine's offset.

function toUtcDays(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.floor(ms / 86_400_000);
}

/** Calendar days between start and end (inclusive of at least 1). 0 if input invalid. */
export function rentalDays(start: string, end: string): number {
  const a = toUtcDays(start);
  const b = toUtcDays(end);
  if (a === null || b === null) return 0;
  return Math.max(1, b - a);
}

/** days × dailyRate, clamped at 0. */
export function rentalTotal(days: number, dailyRate: number): number {
  if (!Number.isFinite(days) || !Number.isFinite(dailyRate)) return 0;
  if (days <= 0 || dailyRate <= 0) return 0;
  return days * dailyRate;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/rental/pricing.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/rental/pricing.ts lib/rental/pricing.test.mjs
git commit -m "Add rental pricing logic (days, total)"
```

---

## Task 4: Rental number generator (TDD)

**Files:**
- Create: `lib/rental/rentalNumber.ts`
- Test: `lib/rental/rentalNumber.test.mjs`

Format `R-YYMM-NN`, matching the tour admin's `KT-YYMM-NN` style (see `lib/admin/utils.ts:buildDocNumber`). `count` = how many rental numbers already exist for this month.

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert";
import { test } from "node:test";
import { buildRentalNumber } from "./rentalNumber.ts";

test("builds R-YYMM-NN from count", () => {
  const d = new Date(2026, 5, 17); // June 2026 (month is 0-based)
  assert.strictEqual(buildRentalNumber(0, d), "R-2606-01");
  assert.strictEqual(buildRentalNumber(4, d), "R-2606-05");
});

test("zero-pads month and sequence", () => {
  const d = new Date(2026, 0, 9); // January
  assert.strictEqual(buildRentalNumber(0, d), "R-2601-01");
});

test("sequence past 9 keeps two digits", () => {
  const d = new Date(2026, 5, 1);
  assert.strictEqual(buildRentalNumber(11, d), "R-2606-12");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/rental/rentalNumber.test.mjs`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Write the implementation**

```typescript
/** Rental reference like R-2606-01. `count` = existing numbers this month. */
export function buildRentalNumber(count: number, date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `R-${yy}${mm}-${String(count + 1).padStart(2, "0")}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/rental/rentalNumber.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/rental/rentalNumber.ts lib/rental/rentalNumber.test.mjs
git commit -m "Add rental number generator"
```

---

## Task 5: Rental role guard

**Files:**
- Create: `lib/rental/role.ts`

- [ ] **Step 1: Write the module**

```typescript
import type { User } from "@supabase/supabase-js";

// Rental staff role, stored server-side in user.app_metadata.role = "rental"
// (carried in the JWT, not user-editable). Separate from tour admin roles.
export function isRentalUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "rental";
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `lib/rental/role.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/rental/role.ts
git commit -m "Add rental role guard"
```

---

## Task 6: Rental section layout + login page

**Files:**
- Create: `app/rental/layout.tsx`
- Create: `app/rental/login/page.tsx`

- [ ] **Step 1: Write the section layout**

`app/rental/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Rental", template: "%s | Rental Keliling Thailand" },
  robots: { index: false, follow: false },
};

export default function RentalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen w-full bg-gray-50">{children}</div>;
}
```

- [ ] **Step 2: Write the login page**

`app/rental/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";

export default function RentalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email atau password salah.");
      setBusy(false);
      return;
    }
    router.push("/rental");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-lg"
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-[#1B2A4A]">Keliling Thailand</p>
          <p className="text-sm text-gray-500">Rental Mobil Lepas Kunci</p>
        </div>
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            autoComplete="current-password"
          />
        </Field>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className={`${btnCls} w-full justify-center`}>
          {busy ? "Masuk…" : "Masuk"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: no errors. (`/rental/login` compiles; the panel routes come next.)

- [ ] **Step 4: Commit**

```bash
git add app/rental/layout.tsx app/rental/login/page.tsx
git commit -m "Add rental section layout + login page"
```

---

## Task 7: Panel auth gate + shell + bottom nav

**Files:**
- Create: `app/rental/(panel)/layout.tsx`
- Create: `components/rental/RentalShell.tsx`
- Create: `components/rental/RentalBottomNav.tsx`

- [ ] **Step 1: Write the bottom nav**

`components/rental/RentalBottomNav.tsx` (same interaction model as `AdminBottomNav`, but all tabs fit so no overflow sheet is needed):

```tsx
"use client";

type NavTab = { id: string; label: string };

export default function RentalBottomNav({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly NavTab[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const itemCls = (on: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
      on ? "text-[#F5C518]" : "text-white/70"
    }`;

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-[#1B2A4A] pb-[env(safe-area-inset-bottom)] sm:hidden">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onSelect(t.id)} className={itemCls(active === t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Write the shell**

`components/rental/RentalShell.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RentalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/rental/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-[#1B2A4A] px-4 py-3 text-white sm:px-6">
        <Link href="/rental" className="leading-tight">
          <p className="font-bold">Keliling Thailand</p>
          <p className="text-xs text-white/60">Rental · Lepas Kunci</p>
        </Link>
        <button
          onClick={logout}
          className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Keluar
        </button>
      </header>
      <main className="mx-auto max-w-6xl p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Write the panel layout (auth + role gate)**

`app/rental/(panel)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRentalUser } from "@/lib/rental/role";
import RentalShell from "@/components/rental/RentalShell";

export default async function RentalPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rental/login");
  if (!isRentalUser(user)) redirect("/rental/login");

  return <RentalShell>{children}</RentalShell>;
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds. (The panel `page.tsx` is added in Task 8; until then `/rental` 404s, which is fine — the layout compiles.)

- [ ] **Step 5: Commit**

```bash
git add app/rental/\(panel\)/layout.tsx components/rental/RentalShell.tsx components/rental/RentalBottomNav.tsx
git commit -m "Add rental panel auth gate, shell, bottom nav"
```

---

## Task 8: Hub page with tabs (stub views)

**Files:**
- Create: `app/rental/(panel)/page.tsx`
- Create: `components/rental/views/DashboardView.tsx` (stub)
- Create: `components/rental/views/VehiclesView.tsx` (stub)
- Create: `components/rental/views/RentersView.tsx` (stub)
- Create: `components/rental/views/RentalsView.tsx` (stub)
- Create: `components/rental/views/PaymentsView.tsx` (stub)

Build the tab hub first against placeholder views; Tasks 9–18 fill each view in. Stubs make the page compile and let you verify navigation early.

- [ ] **Step 1: Write the five stub views**

Each file (replace `NAME`/`Label` per file):
- `DashboardView.tsx` → component `DashboardView`, heading "Dashboard"
- `VehiclesView.tsx` → component `VehiclesView`, heading "Armada"
- `RentersView.tsx` → component `RentersView`, heading "Penyewa"
- `RentalsView.tsx` → component `RentalsView`, heading "Sewa"
- `PaymentsView.tsx` → component `PaymentsView`, heading "Pembayaran"

Stub template (example for `DashboardView.tsx`):

```tsx
"use client";

export default function DashboardView() {
  return <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>;
}
```

- [ ] **Step 2: Write the hub page**

`app/rental/(panel)/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import DashboardView from "@/components/rental/views/DashboardView";
import VehiclesView from "@/components/rental/views/VehiclesView";
import RentersView from "@/components/rental/views/RentersView";
import RentalsView from "@/components/rental/views/RentalsView";
import PaymentsView from "@/components/rental/views/PaymentsView";
import RentalBottomNav from "@/components/rental/RentalBottomNav";

type Tab = { id: string; label: string; View: React.ComponentType };

const TABS: readonly Tab[] = [
  { id: "dashboard", label: "Dashboard", View: DashboardView },
  { id: "vehicles", label: "Armada", View: VehiclesView },
  { id: "renters", label: "Penyewa", View: RentersView },
  { id: "rentals", label: "Sewa", View: RentalsView },
  { id: "payments", label: "Pembayaran", View: PaymentsView },
];

const STORAGE_KEY = "rental-tab";

export default function RentalPage() {
  const [active, setActive] = useState<string>(TABS[0].id);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount localStorage sync, avoids hydration mismatch
    if (saved && TABS.some((t) => t.id === saved)) setActive(saved);
  }, []);

  function select(id: string) {
    setActive(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const ActiveView = TABS.find((t) => t.id === active)?.View ?? TABS[0].View;

  return (
    <div className="space-y-6">
      <div className="hidden flex-wrap gap-1 border-b border-gray-200 sm:flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            className={`-mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              active === t.id
                ? "border-b-2 border-[#F5C518] text-[#1B2A4A]"
                : "text-gray-500 hover:text-[#1B2A4A]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ActiveView />

      <RentalBottomNav tabs={TABS} active={active} onSelect={select} />
    </div>
  );
}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: success; `/rental` route appears in the build output.

- [ ] **Step 4: Commit**

```bash
git add app/rental/\(panel\)/page.tsx components/rental/views
git commit -m "Add rental hub page with tab navigation and stub views"
```

---

## Task 9: Vehicles (Armada) — form + view

**Files:**
- Create: `components/rental/VehicleForm.tsx`
- Modify: `components/rental/views/VehiclesView.tsx`

- [ ] **Step 1: Write the vehicle form**

`components/rental/VehicleForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle, VehicleStatus } from "@/lib/rental/types";
import { VEHICLE_STATUSES, VEHICLE_STATUS_LABELS } from "@/lib/rental/types";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

interface Draft {
  plate: string;
  name: string;
  type: string;
  daily_rate_thb: string;
  deposit_thb: string;
  status: VehicleStatus;
  notes: string;
}

function toDraft(v: Vehicle | null): Draft {
  return {
    plate: v?.plate ?? "",
    name: v?.name ?? "",
    type: v?.type ?? "",
    daily_rate_thb: v ? String(v.daily_rate_thb) : "",
    deposit_thb: v ? String(v.deposit_thb) : "",
    status: v?.status ?? "available",
    notes: v?.notes ?? "",
  };
}

export default function VehicleForm({
  vehicle,
  onSaved,
  onCancel,
}: {
  vehicle: Vehicle | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(vehicle));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const row = {
      plate: draft.plate.trim(),
      name: draft.name.trim(),
      type: draft.type.trim() || null,
      daily_rate_thb: Number(draft.daily_rate_thb) || 0,
      deposit_thb: Number(draft.deposit_thb) || 0,
      status: draft.status,
      notes: draft.notes.trim() || null,
    };
    const supabase = createClient();
    const { error } = vehicle
      ? await supabase.from("vehicles").update(row).eq("id", vehicle.id)
      : await supabase.from("vehicles").insert(row);
    if (error) {
      setError(`Gagal menyimpan: ${error.message}`);
      setBusy(false);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-[#1B2A4A]">
        {vehicle ? "Edit mobil" : "Tambah mobil"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plat nomor">
          <input required value={draft.plate} onChange={(e) => set("plate", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Nama / model">
          <input required value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Toyota Vios 2022" />
        </Field>
        <Field label="Tipe">
          <input value={draft.type} onChange={(e) => set("type", e.target.value)} className={inputCls} placeholder="Sedan / SUV" />
        </Field>
        <Field label="Status">
          <select value={draft.status} onChange={(e) => set("status", e.target.value as VehicleStatus)} className={inputCls}>
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>{VEHICLE_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Tarif / hari (THB)">
          <input type="number" min="0" value={draft.daily_rate_thb} onChange={(e) => set("daily_rate_thb", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Deposit (THB)">
          <input type="number" min="0" value={draft.deposit_thb} onChange={(e) => set("deposit_thb", e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Catatan">
        <textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
      </Field>
      <ErrorNote message={error} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondaryCls}>
          Batal
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Write the vehicles view**

Replace `components/rental/views/VehiclesView.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle } from "@/lib/rental/types";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS } from "@/lib/rental/types";
import { formatTHB } from "@/lib/admin/utils";
import { btnCls, ErrorNote } from "@/components/admin/ui";
import VehicleForm from "@/components/rental/VehicleForm";

export default function VehiclesView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined);
  // undefined = form closed; null = adding new; Vehicle = editing

  const load = useCallback(() => {
    createClient()
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setVehicles(data ?? []);
      });
  }, []);

  useEffect(load, [load]);

  if (editing !== undefined) {
    return (
      <VehicleForm
        vehicle={editing}
        onSaved={() => {
          setEditing(undefined);
          load();
        }}
        onCancel={() => setEditing(undefined)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Armada</h1>
        <button onClick={() => setEditing(null)} className={btnCls}>
          + Mobil
        </button>
      </div>
      <ErrorNote message={error} />

      <div className="grid gap-2 sm:grid-cols-2">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => setEditing(v)}
            className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[#1B2A4A]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#1B2A4A]">{v.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VEHICLE_STATUS_COLORS[v.status]}`}>
                {VEHICLE_STATUS_LABELS[v.status]}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {v.plate} · {formatTHB(v.daily_rate_thb)}/hari · deposit {formatTHB(v.deposit_thb)}
            </div>
          </button>
        ))}
        {vehicles.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400 sm:col-span-2">
            Belum ada mobil. Tekan “+ Mobil”.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: success.

- [ ] **Step 4: Manual check (when Supabase is live)**

- Log in at `/rental/login` as a `rental` user → land on `/rental`.
- Open Armada → "+ Mobil" → save → row appears with status badge and THB rate.
- Tap a row → edit → change status → save → reflects in list.

- [ ] **Step 5: Commit**

```bash
git add components/rental/VehicleForm.tsx components/rental/views/VehiclesView.tsx
git commit -m "Add rental fleet (Armada) CRUD"
```

---

## Task 10: Renters (Penyewa) — form + view

**Files:**
- Create: `components/rental/RenterForm.tsx`
- Modify: `components/rental/views/RentersView.tsx`

- [ ] **Step 1: Write the renter form**

`components/rental/RenterForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Renter } from "@/lib/rental/types";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

interface Draft {
  name: string;
  phone: string;
  license_no: string;
  origin_city: string;
  notes: string;
}

function toDraft(r: Renter | null): Draft {
  return {
    name: r?.name ?? "",
    phone: r?.phone ?? "",
    license_no: r?.license_no ?? "",
    origin_city: r?.origin_city ?? "",
    notes: r?.notes ?? "",
  };
}

export default function RenterForm({
  renter,
  onSaved,
  onCancel,
}: {
  renter: Renter | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(renter));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const row = {
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      license_no: draft.license_no.trim() || null,
      origin_city: draft.origin_city.trim() || null,
      notes: draft.notes.trim() || null,
    };
    const supabase = createClient();
    const { error } = renter
      ? await supabase.from("renters").update(row).eq("id", renter.id)
      : await supabase.from("renters").insert(row);
    if (error) {
      setError(`Gagal menyimpan: ${error.message}`);
      setBusy(false);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-[#1B2A4A]">
        {renter ? "Edit penyewa" : "Tambah penyewa"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama">
          <input required value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="WhatsApp">
          <input value={draft.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="628…" />
        </Field>
        <Field label="No. SIM">
          <input value={draft.license_no} onChange={(e) => set("license_no", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Kota asal">
          <input value={draft.origin_city} onChange={(e) => set("origin_city", e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Catatan">
        <textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
      </Field>
      <ErrorNote message={error} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondaryCls}>
          Batal
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Write the renters view**

Replace `components/rental/views/RentersView.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Renter } from "@/lib/rental/types";
import { btnCls, inputCls, ErrorNote } from "@/components/admin/ui";
import RenterForm from "@/components/rental/RenterForm";

export default function RentersView() {
  const [renters, setRenters] = useState<Renter[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Renter | null | undefined>(undefined);

  const load = useCallback(() => {
    createClient()
      .from("renters")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRenters(data ?? []);
      });
  }, []);

  useEffect(load, [load]);

  if (editing !== undefined) {
    return (
      <RenterForm
        renter={editing}
        onSaved={() => {
          setEditing(undefined);
          load();
        }}
        onCancel={() => setEditing(undefined)}
      />
    );
  }

  const filtered = renters.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Penyewa</h1>
        <button onClick={() => setEditing(null)} className={btnCls}>
          + Penyewa
        </button>
      </div>
      <input
        placeholder="Cari nama…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${inputCls} max-w-sm`}
      />
      <ErrorNote message={error} />

      <div className="space-y-2">
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => setEditing(r)}
            className="block w-full rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[#1B2A4A]"
          >
            <span className="font-semibold text-[#1B2A4A]">{r.name}</span>
            <div className="mt-1 text-sm text-gray-500">
              {r.phone ?? "—"} · SIM {r.license_no ?? "—"} · {r.origin_city ?? "—"}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
            Belum ada penyewa.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add components/rental/RenterForm.tsx components/rental/views/RentersView.tsx
git commit -m "Add rental renters (Penyewa) CRUD"
```

---

## Task 11: Rentals list view

**Files:**
- Modify: `components/rental/views/RentalsView.tsx`

- [ ] **Step 1: Write the rentals list**

Replace `components/rental/views/RentalsView.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalWithRefs, RentalStatus } from "@/lib/rental/types";
import { RENTAL_STATUSES, RENTAL_STATUS_LABELS, RENTAL_STATUS_COLORS } from "@/lib/rental/types";
import { formatTHB, formatDate } from "@/lib/admin/utils";
import { btnCls, ErrorNote } from "@/components/admin/ui";

export default function RentalsView() {
  const [rentals, setRentals] = useState<RentalWithRefs[]>([]);
  const [filter, setFilter] = useState<RentalStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("rentals")
      .select("*, vehicles(*), renters(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRentals((data as RentalWithRefs[]) ?? []);
      });
  }, []);

  const shown = filter === "all" ? rentals : rentals.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Sewa</h1>
        <Link href="/rental/rentals/new" className={btnCls}>
          + Sewa baru
        </Link>
      </div>

      <div className="flex flex-wrap gap-1">
        {(["all", ...RENTAL_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === s ? "bg-[#1B2A4A] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {s === "all" ? "Semua" : RENTAL_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />

      <div className="space-y-2">
        {shown.map((r) => (
          <Link
            key={r.id}
            href={`/rental/rentals/${r.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-[#1B2A4A]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#1B2A4A]">
                {r.rental_number} · {r.vehicles?.name}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RENTAL_STATUS_COLORS[r.status]}`}>
                {RENTAL_STATUS_LABELS[r.status]}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {r.renters?.name} · {formatDate(r.start_date)} → {formatDate(r.end_date)} · {formatTHB(r.total_thb)}
            </div>
          </Link>
        ))}
        {shown.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
            Belum ada sewa.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: success. (The `/rental/rentals/new` and `/rental/rentals/[id]` routes are added next; the links resolve after Tasks 12–13.)

- [ ] **Step 3: Commit**

```bash
git add components/rental/views/RentalsView.tsx
git commit -m "Add rentals list view with status filter"
```

---

## Task 12: New-rental wizard

**Files:**
- Create: `app/rental/(panel)/rentals/new/page.tsx`
- Create: `components/rental/RentalWizard.tsx`

Flow: pick an available vehicle → pick/create renter → choose dates → auto-compute days/total/deposit (rate + deposit snapshot from the vehicle, editable) + `fx_rate` → save. On save: insert the rental (status `booked`) and set the vehicle to `rented`.

- [ ] **Step 1: Write the route**

`app/rental/(panel)/rentals/new/page.tsx`:

```tsx
import RentalWizard from "@/components/rental/RentalWizard";

export default function NewRentalPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Sewa baru</h1>
      <RentalWizard />
    </div>
  );
}
```

- [ ] **Step 2: Write the wizard**

`components/rental/RentalWizard.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle, Renter } from "@/lib/rental/types";
import { rentalDays, rentalTotal } from "@/lib/rental/pricing";
import { buildRentalNumber } from "@/lib/rental/rentalNumber";
import { formatTHB, formatIDR } from "@/lib/admin/utils";
import { convertThbToIdr } from "@/lib/currency";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";

export default function RentalWizard() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [renterId, setRenterId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [deposit, setDeposit] = useState("");
  const [rate, setRate] = useState("");
  const [fx, setFx] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("vehicles")
      .select("*")
      .eq("status", "available")
      .order("name")
      .then(({ data }) => setVehicles(data ?? []));
    supabase
      .from("renters")
      .select("*")
      .order("name")
      .then(({ data }) => setRenters(data ?? []));
  }, []);

  // When a vehicle is chosen, snapshot its rate + deposit into the editable fields.
  function chooseVehicle(id: string) {
    setVehicleId(id);
    const v = vehicles.find((x) => x.id === id);
    if (v) {
      setRate(String(v.daily_rate_thb));
      setDeposit(String(v.deposit_thb));
    }
  }

  const days = rentalDays(start, end);
  const total = rentalTotal(days, Number(rate) || 0);
  const fxNum = Number(fx) || 0;
  const totalIdr = useMemo(() => convertThbToIdr(total, fxNum), [total, fxNum]);

  async function save() {
    setError(null);
    if (!vehicleId || !renterId || !start || !end) {
      setError("Lengkapi mobil, penyewa, dan tanggal.");
      return;
    }
    if (days <= 0) {
      setError("Tanggal selesai harus sama atau setelah tanggal mulai.");
      return;
    }
    setBusy(true);
    const supabase = createClient();

    const prefix = buildRentalNumber(0).slice(0, 8); // "R-YYMM-"
    const { count } = await supabase
      .from("rentals")
      .select("id", { count: "exact", head: true })
      .like("rental_number", `${prefix}%`);
    const rentalNumber = buildRentalNumber(count ?? 0);

    const { data, error: insErr } = await supabase
      .from("rentals")
      .insert({
        rental_number: rentalNumber,
        vehicle_id: vehicleId,
        renter_id: renterId,
        start_date: start,
        end_date: end,
        days,
        daily_rate_thb: Number(rate) || 0,
        deposit_thb: Number(deposit) || 0,
        total_thb: total,
        fx_rate: fxNum,
        status: "booked",
        notes: notes.trim() || null,
      })
      .select("id")
      .single();
    if (insErr) {
      setError(`Gagal membuat sewa: ${insErr.message}`);
      setBusy(false);
      return;
    }

    const { error: vehErr } = await supabase
      .from("vehicles")
      .update({ status: "rented" })
      .eq("id", vehicleId);
    if (vehErr) {
      setError(`Sewa dibuat, tapi status mobil gagal diubah: ${vehErr.message}`);
      setBusy(false);
      return;
    }

    router.push(`/rental/rentals/${data.id}`);
  }

  return (
    <div className="max-w-2xl space-y-5">
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Mobil &amp; penyewa</h2>
        <Field label="Mobil (tersedia)">
          <select value={vehicleId} onChange={(e) => chooseVehicle(e.target.value)} className={inputCls}>
            <option value="">— pilih —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.plate} · {formatTHB(v.daily_rate_thb)}/hari
              </option>
            ))}
          </select>
        </Field>
        <Field label="Penyewa">
          <select value={renterId} onChange={(e) => setRenterId(e.target.value)} className={inputCls}>
            <option value="">— pilih —</option>
            {renters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.origin_city ? `(${r.origin_city})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-gray-500">
          Penyewa baru dibuat dulu di tab Penyewa.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Tanggal &amp; harga</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mulai">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Selesai">
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tarif / hari (THB)">
            <input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Deposit (THB)">
            <input type="number" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Kurs (IDR per 1 THB)">
            <input type="number" min="0" step="0.01" value={fx} onChange={(e) => setFx(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <p>
            <span className="text-gray-500">Durasi:</span> {days} hari
          </p>
          <p>
            <span className="text-gray-500">Total:</span> {formatTHB(total)}
            {totalIdr != null && <span className="text-gray-500"> ≈ {formatIDR(totalIdr)}</span>}
          </p>
        </div>
        <Field label="Catatan">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </Field>
      </section>

      <ErrorNote message={error} />
      <button onClick={save} disabled={busy} className={btnCls}>
        {busy ? "Menyimpan…" : "Buat sewa"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: success.

- [ ] **Step 4: Manual check (when Supabase is live)**

- Create a vehicle (Armada) and a renter (Penyewa) first.
- Sewa → "+ Sewa baru" → pick vehicle (rate/deposit auto-fill) → pick renter → set dates → durasi + total compute → set kurs → IDR estimate shows → "Buat sewa" → redirect to detail; vehicle now shows "Disewa" in Armada.

- [ ] **Step 5: Commit**

```bash
git add app/rental/\(panel\)/rentals/new/page.tsx components/rental/RentalWizard.tsx
git commit -m "Add new-rental wizard"
```

---

## Task 13: Rental detail — status + payments ledger

**Files:**
- Create: `app/rental/(panel)/rentals/[id]/page.tsx`
- Create: `components/rental/RentalDetail.tsx`

The detail page loads the rental (with vehicle + renter), shows status controls, a payments ledger, and (after Task 16) two handover panels. This task builds everything except the handover panels, which are wired in Task 16.

- [ ] **Step 1: Write the route**

`app/rental/(panel)/rentals/[id]/page.tsx`:

```tsx
import RentalDetail from "@/components/rental/RentalDetail";

export default async function RentalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RentalDetail rentalId={id} />;
}
```

- [ ] **Step 2: Write the detail component**

`components/rental/RentalDetail.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalWithRefs, RentalPayment, PaymentKind } from "@/lib/rental/types";
import {
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_COLORS,
  PAYMENT_KINDS,
  PAYMENT_KIND_LABELS,
} from "@/lib/rental/types";
import { formatTHB, formatIDR, formatDate } from "@/lib/admin/utils";
import { convertThbToIdr } from "@/lib/currency";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

export default function RentalDetail({ rentalId }: { rentalId: string }) {
  const [rental, setRental] = useState<RentalWithRefs | null>(null);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payKind, setPayKind] = useState<PaymentKind>("deposit");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");

  const load = useCallback(() => {
    const supabase = createClient();
    supabase
      .from("rentals")
      .select("*, vehicles(*), renters(*)")
      .eq("id", rentalId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRental(data as RentalWithRefs);
      });
    supabase
      .from("rental_payments")
      .select("*")
      .eq("rental_id", rentalId)
      .order("paid_at", { ascending: false })
      .then(({ data }) => setPayments(data ?? []));
  }, [rentalId]);

  useEffect(load, [load]);

  async function setStatus(status: RentalWithRefs["status"]) {
    const supabase = createClient();
    const { error } = await supabase
      .from("rentals")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", rentalId);
    if (error) {
      setError(error.message);
      return;
    }
    // Reflect vehicle availability when the car comes back or is cancelled.
    if (rental && (status === "returned" || status === "cancelled")) {
      await supabase.from("vehicles").update({ status: "available" }).eq("id", rental.vehicle_id);
    }
    load();
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(payAmount) || 0;
    if (amount <= 0) return;
    const supabase = createClient();
    const { error } = await supabase.from("rental_payments").insert({
      rental_id: rentalId,
      kind: payKind,
      amount_thb: amount,
      method: payMethod.trim() || null,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setPayAmount("");
    setPayMethod("");
    load();
  }

  if (!rental) {
    return (
      <div className="space-y-3">
        <ErrorNote message={error} />
        <p className="text-gray-400">Memuat…</p>
      </div>
    );
  }

  // Ledger: deposit + rental are inflows; refund is an outflow.
  const balance = payments.reduce(
    (sum, p) => sum + (p.kind === "refund" ? -p.amount_thb : p.amount_thb),
    0
  );
  const totalIdr = convertThbToIdr(rental.total_thb, rental.fx_rate);

  return (
    <div className="space-y-5">
      <Link href="/rental" className="text-sm text-gray-500 hover:underline">
        ← Kembali
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">{rental.rental_number}</h1>
          <p className="text-gray-500">
            {rental.vehicles?.name} · {rental.renters?.name}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${RENTAL_STATUS_COLORS[rental.status]}`}>
          {RENTAL_STATUS_LABELS[rental.status]}
        </span>
      </div>

      <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <p className="text-sm text-gray-500">Periode</p>
          <p>{formatDate(rental.start_date)} → {formatDate(rental.end_date)} ({rental.days} hari)</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total</p>
          <p>
            {formatTHB(rental.total_thb)}
            {totalIdr != null && <span className="text-gray-500"> ≈ {formatIDR(totalIdr)}</span>}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Deposit</p>
          <p>{formatTHB(rental.deposit_thb)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Tarif/hari</p>
          <p>{formatTHB(rental.daily_rate_thb)}</p>
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Status</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStatus("out")} className={btnCls}>Tandai keluar</button>
          <button onClick={() => setStatus("returned")} className={btnCls}>Tandai kembali</button>
          <button onClick={() => setStatus("cancelled")} className={btnSecondaryCls}>Batalkan</button>
        </div>
        <p className="text-xs text-gray-500">
          “Kembali” / “Batal” otomatis menjadikan mobil tersedia lagi.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Pembayaran</h2>
        <form onSubmit={addPayment} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <Field label="Jenis">
            <select value={payKind} onChange={(e) => setPayKind(e.target.value as PaymentKind)} className={inputCls}>
              {PAYMENT_KINDS.map((k) => (
                <option key={k} value={k}>{PAYMENT_KIND_LABELS[k]}</option>
              ))}
            </select>
          </Field>
          <Field label="Jumlah (THB)">
            <input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Metode">
            <input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inputCls} placeholder="Cash / transfer" />
          </Field>
          <button type="submit" className={btnCls}>Tambah</button>
        </form>

        <div className="divide-y divide-gray-100">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {PAYMENT_KIND_LABELS[p.kind]} · {formatDate(p.paid_at.slice(0, 10))}
                {p.method ? ` · ${p.method}` : ""}
              </span>
              <span className={p.kind === "refund" ? "text-red-700" : "text-green-700"}>
                {p.kind === "refund" ? "-" : "+"}{formatTHB(p.amount_thb)}
              </span>
            </div>
          ))}
          {payments.length === 0 && <p className="py-2 text-sm text-gray-400">Belum ada pembayaran.</p>}
        </div>
        <p className="text-sm font-semibold">
          Saldo diterima: {formatTHB(balance)}
        </p>
      </section>

      <ErrorNote message={error} />

      {/* Handover panels are inserted here in Task 16. */}
      <div id="handover-panels" data-rental-id={rental.id} />
    </div>
  );
}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: success.

- [ ] **Step 4: Manual check (when Supabase is live)**

- Open a rental → status buttons change the badge; "Tandai kembali" sets the vehicle back to "Tersedia".
- Add a deposit payment (+), a rental payment (+), a refund (−) → ledger lists them and "Saldo diterima" nets correctly.

- [ ] **Step 5: Commit**

```bash
git add app/rental/\(panel\)/rentals/\[id\]/page.tsx components/rental/RentalDetail.tsx
git commit -m "Add rental detail with status controls and payment ledger"
```

---

## Task 14: Signature pad component

**Files:**
- Create: `components/rental/SignaturePad.tsx`

Hand-rolled `<canvas>` signature capture (no new dependency). Supports mouse + touch, a clear button, and exports a PNG data-URL via an imperative ref.

- [ ] **Step 1: Write the component**

`components/rental/SignaturePad.tsx`:

```tsx
"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface SignaturePadHandle {
  /** PNG data-URL, or null if nothing was drawn. */
  toDataURL: () => string | null;
  clear: () => void;
}

const WIDTH = 320;
const HEIGHT = 160;

const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  function ctx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const c = ctx();
    if (!c) return;
    drawing.current = true;
    const { x, y } = pos(e);
    c.beginPath();
    c.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const c = ctx();
    if (!c) return;
    const { x, y } = pos(e);
    c.lineWidth = 2;
    c.lineCap = "round";
    c.strokeStyle = "#1B2A4A";
    c.lineTo(x, y);
    c.stroke();
    dirty.current = true;
  }

  function stop() {
    drawing.current = false;
  }

  useImperativeHandle(ref, () => ({
    toDataURL: () => (dirty.current ? (canvasRef.current?.toDataURL("image/png") ?? null) : null),
    clear: () => {
      const c = ctx();
      if (c) c.clearRect(0, 0, WIDTH, HEIGHT);
      dirty.current = false;
    },
  }));

  return (
    <div className="space-y-1">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerLeave={stop}
        className="w-full touch-none rounded-lg border border-gray-300 bg-white"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      />
      <button
        type="button"
        onClick={() => {
          const c = ctx();
          if (c) c.clearRect(0, 0, WIDTH, HEIGHT);
          dirty.current = false;
        }}
        className="text-xs text-gray-500 hover:underline"
      >
        Hapus tanda tangan
      </button>
    </div>
  );
});

export default SignaturePad;
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: success (component is unused until Task 16 — that's fine).

- [ ] **Step 3: Commit**

```bash
git add components/rental/SignaturePad.tsx
git commit -m "Add hand-rolled signature pad component"
```

---

## Task 15: Media upload component

**Files:**
- Create: `components/rental/MediaUpload.tsx`

Uploads selected photos/videos to the `rental-media` Storage bucket and reports back the stored paths. Uses native `<input type="file">` with `capture` so phones can open the camera. Existing media for a handover is listed via signed URLs.

- [ ] **Step 1: Write the component**

`components/rental/MediaUpload.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HandoverMedia } from "@/lib/rental/types";
import { btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

const BUCKET = "rental-media";

export default function MediaUpload({
  handoverId,
  type,
  label,
}: {
  handoverId: string;
  type: "photo" | "video";
  label: string;
}) {
  const [items, setItems] = useState<{ media: HandoverMedia; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("handover_media")
      .select("*")
      .eq("handover_id", handoverId)
      .eq("type", type)
      .order("created_at");
    const media = data ?? [];
    const signed = await Promise.all(
      media.map(async (m) => {
        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(m.storage_path, 3600);
        return { media: m, url: s?.signedUrl ?? "" };
      })
    );
    setItems(signed);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoverId, type]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    for (const file of files) {
      const ext = file.name.split(".").pop() || (type === "photo" ? "jpg" : "mp4");
      const path = `${handoverId}/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) {
        setError(`Gagal unggah: ${upErr.message}`);
        setBusy(false);
        return;
      }
      const { error: insErr } = await supabase
        .from("handover_media")
        .insert({ handover_id: handoverId, type, storage_path: path });
      if (insErr) {
        setError(`Gagal simpan: ${insErr.message}`);
        setBusy(false);
        return;
      }
    }
    e.target.value = "";
    setBusy(false);
    load();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <label className={`${btnSecondaryCls} cursor-pointer text-xs`}>
          {busy ? "Mengunggah…" : "+ Tambah"}
          <input
            type="file"
            accept={type === "photo" ? "image/*" : "video/*"}
            capture="environment"
            multiple
            onChange={onPick}
            className="hidden"
          />
        </label>
      </div>
      <ErrorNote message={error} />
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ media, url }) =>
          type === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={media.id} src={url} alt="" className="h-24 w-full rounded-lg object-cover" />
          ) : (
            <video key={media.id} src={url} controls className="h-24 w-full rounded-lg object-cover" />
          )
        )}
        {items.length === 0 && <p className="col-span-3 text-xs text-gray-400">Belum ada {label.toLowerCase()}.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add components/rental/MediaUpload.tsx
git commit -m "Add handover media upload component"
```

---

## Task 16: Handover form + wire into rental detail

**Files:**
- Create: `components/rental/HandoverForm.tsx`
- Modify: `components/rental/RentalDetail.tsx`

A handover panel per side (`out` = serah/pickup, `in` = terima/return). It upserts the `rental_handovers` row (odometer, fuel, oil, signature, notes), then — once that row exists — shows `MediaUpload` for photos and video. The return panel shows the pickup readings for comparison.

- [ ] **Step 1: Write the handover form**

`components/rental/HandoverForm.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RentalHandover, HandoverKind, FuelLevel } from "@/lib/rental/types";
import { FUEL_LEVELS, FUEL_LEVEL_LABELS } from "@/lib/rental/types";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import SignaturePad, { type SignaturePadHandle } from "@/components/rental/SignaturePad";
import MediaUpload from "@/components/rental/MediaUpload";

const TITLES: Record<HandoverKind, string> = {
  out: "Serah terima (keluar)",
  in: "Pengembalian (masuk)",
};

export default function HandoverForm({
  rentalId,
  kind,
  compareTo,
}: {
  rentalId: string;
  kind: HandoverKind;
  /** Pickup readings to show alongside, when this is the return panel. */
  compareTo?: RentalHandover | null;
}) {
  const [handover, setHandover] = useState<RentalHandover | null>(null);
  const [odo, setOdo] = useState("");
  const [fuel, setFuel] = useState<FuelLevel>("full");
  const [oil, setOil] = useState("ok");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sigRef = useRef<SignaturePadHandle>(null);

  const load = useCallback(() => {
    createClient()
      .from("rental_handovers")
      .select("*")
      .eq("rental_id", rentalId)
      .eq("kind", kind)
      .maybeSingle()
      .then(({ data }) => {
        const h = data as RentalHandover | null;
        setHandover(h);
        if (h) {
          setOdo(h.odometer_km != null ? String(h.odometer_km) : "");
          setFuel((h.fuel_level as FuelLevel) ?? "full");
          setOil(h.oil_level ?? "ok");
          setNotes(h.notes ?? "");
        }
      });
  }, [rentalId, kind]);

  useEffect(load, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    const signature = sigRef.current?.toDataURL() ?? handover?.signature ?? null;
    const row = {
      rental_id: rentalId,
      kind,
      odometer_km: odo ? Number(odo) : null,
      fuel_level: fuel,
      oil_level: oil || null,
      signature,
      notes: notes.trim() || null,
    };
    const { error } = await createClient()
      .from("rental_handovers")
      .upsert(row, { onConflict: "rental_id,kind" });
    if (error) {
      setError(`Gagal menyimpan: ${error.message}`);
      setBusy(false);
      return;
    }
    setBusy(false);
    load();
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-[#1B2A4A]">{TITLES[kind]}</h2>

      {compareTo && (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Saat keluar: odometer {compareTo.odometer_km ?? "—"} km · bensin{" "}
          {compareTo.fuel_level ? FUEL_LEVEL_LABELS[compareTo.fuel_level] : "—"}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Odometer (km)">
          <input type="number" min="0" value={odo} onChange={(e) => setOdo(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Bensin">
          <select value={fuel} onChange={(e) => setFuel(e.target.value as FuelLevel)} className={inputCls}>
            {FUEL_LEVELS.map((f) => (
              <option key={f} value={f}>{FUEL_LEVEL_LABELS[f]}</option>
            ))}
          </select>
        </Field>
        <Field label="Oli">
          <select value={oil} onChange={(e) => setOil(e.target.value)} className={inputCls}>
            <option value="ok">OK</option>
            <option value="low">Kurang</option>
          </select>
        </Field>
      </div>

      <Field label="Catatan kondisi / lecet">
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Lecet pintu kanan, dst." />
      </Field>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">Tanda tangan penyewa</span>
        {handover?.signature && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={handover.signature} alt="tanda tangan" className="mb-2 h-20 rounded border border-gray-200" />
        )}
        <SignaturePad ref={sigRef} />
      </div>

      <ErrorNote message={error} />
      <button onClick={save} disabled={busy} className={btnCls}>
        {busy ? "Menyimpan…" : handover ? "Perbarui" : "Simpan"}
      </button>

      {handover && (
        <div className="space-y-3 border-t border-gray-100 pt-3">
          <MediaUpload handoverId={handover.id} type="photo" label="Foto" />
          <MediaUpload handoverId={handover.id} type="video" label="Video" />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Wire panels into the rental detail**

In `components/rental/RentalDetail.tsx`:

Add the imports near the top (after the existing `import` lines):

```tsx
import { useState as useReactState } from "react";
import type { RentalHandover } from "@/lib/rental/types";
import HandoverForm from "@/components/rental/HandoverForm";
```

Inside `RentalDetail`, add state and a loader for the pickup handover (used as the comparison reference for the return panel). Place after the existing `payments` state:

```tsx
  const [pickup, setPickup] = useReactState<RentalHandover | null>(null);
```

Extend the `load` callback body to also fetch the pickup handover (add inside the existing `load` function, before its closing brace):

```tsx
    supabase
      .from("rental_handovers")
      .select("*")
      .eq("rental_id", rentalId)
      .eq("kind", "out")
      .maybeSingle()
      .then(({ data }) => setPickup((data as RentalHandover | null) ?? null));
```

Replace the placeholder div from Task 13:

```tsx
      {/* Handover panels are inserted here in Task 16. */}
      <div id="handover-panels" data-rental-id={rental.id} />
```

with:

```tsx
      <HandoverForm rentalId={rental.id} kind="out" />
      <HandoverForm rentalId={rental.id} kind="in" compareTo={pickup} />
```

(If `useState` is already imported, you may use it directly instead of the `useReactState` alias and drop that extra import — the alias just avoids a duplicate-import edit.)

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: success.

- [ ] **Step 4: Manual check (when Supabase is live)**

- Open a rental → "Serah terima (keluar)": enter odometer/bensin/oli, draw signature, Simpan → photo/video uploaders appear → add a photo (camera on phone) → thumbnail shows.
- "Pengembalian (masuk)": the grey bar shows the pickup odometer + fuel for comparison; save return readings + photos independently.
- Reload page → saved readings, signature image, and media persist.

- [ ] **Step 5: Commit**

```bash
git add components/rental/HandoverForm.tsx components/rental/RentalDetail.tsx
git commit -m "Add handover inspection form with media + signature"
```

---

## Task 17: Dashboard view

**Files:**
- Modify: `components/rental/views/DashboardView.tsx`

- [ ] **Step 1: Write the dashboard**

Replace `components/rental/views/DashboardView.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalWithRefs } from "@/lib/rental/types";
import { RENTAL_STATUS_LABELS, RENTAL_STATUS_COLORS } from "@/lib/rental/types";
import { formatTHB, formatDate, isoLocal } from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

export default function DashboardView() {
  const [rentals, setRentals] = useState<RentalWithRefs[]>([]);
  const [fleetCount, setFleetCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("rentals")
      .select("*, vehicles(*), renters(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRentals((data as RentalWithRefs[]) ?? []);
      });
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setFleetCount(count ?? 0));
  }, []);

  const today = isoLocal();
  const out = rentals.filter((r) => r.status === "out");
  const dueToday = out.filter((r) => r.end_date === today);
  const overdue = out.filter((r) => r.end_date < today);

  const cards = [
    { label: "Total armada", value: fleetCount },
    { label: "Mobil keluar", value: out.length },
    { label: "Kembali hari ini", value: dueToday.length },
    { label: "Terlambat", value: overdue.length },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
      <ErrorNote message={error} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-2xl font-bold text-[#1B2A4A]">{c.value}</p>
            <p className="text-sm text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-[#1B2A4A]">Sewa terbaru</h2>
        {rentals.slice(0, 8).map((r) => (
          <Link
            key={r.id}
            href={`/rental/rentals/${r.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-[#1B2A4A]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#1B2A4A]">
                {r.rental_number} · {r.vehicles?.name}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RENTAL_STATUS_COLORS[r.status]}`}>
                {RENTAL_STATUS_LABELS[r.status]}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {r.renters?.name} · {formatDate(r.start_date)} → {formatDate(r.end_date)} · {formatTHB(r.total_thb)}
            </div>
          </Link>
        ))}
        {rentals.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
            Belum ada sewa.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add components/rental/views/DashboardView.tsx
git commit -m "Add rental dashboard view"
```

---

## Task 18: Payments aggregate view

**Files:**
- Modify: `components/rental/views/PaymentsView.tsx`

A read-only roll-up of recent payments across all rentals, each linking to its rental.

- [ ] **Step 1: Write the view**

Replace `components/rental/views/PaymentsView.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalPayment } from "@/lib/rental/types";
import { PAYMENT_KIND_LABELS } from "@/lib/rental/types";
import { formatTHB, formatDate } from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

interface PaymentRow extends RentalPayment {
  rentals: { rental_number: string } | null;
}

export default function PaymentsView() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("rental_payments")
      .select("*, rentals(rental_number)")
      .order("paid_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data as PaymentRow[]) ?? []);
      });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Pembayaran</h1>
      <ErrorNote message={error} />

      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/rental/rentals/${p.rental_id}`}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
          >
            <span>
              <span className="font-medium text-[#1B2A4A]">{p.rentals?.rental_number ?? "—"}</span>
              {" · "}
              {PAYMENT_KIND_LABELS[p.kind]} · {formatDate(p.paid_at.slice(0, 10))}
              {p.method ? ` · ${p.method}` : ""}
            </span>
            <span className={p.kind === "refund" ? "text-red-700" : "text-green-700"}>
              {p.kind === "refund" ? "-" : "+"}{formatTHB(p.amount_thb)}
            </span>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-gray-400">Belum ada pembayaran.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add components/rental/views/PaymentsView.tsx
git commit -m "Add payments aggregate view"
```

---

## Task 19: Final pass — lint, build, role-setup note

**Files:**
- Create: `docs/superpowers/sql/rental-role-setup.md`

- [ ] **Step 1: Write the operator note for creating a rental user**

`docs/superpowers/sql/rental-role-setup.md`:

```markdown
# Creating a rental staff account

The `/rental` panel requires `app_metadata.role = "rental"` (server-set, in the JWT).

1. Supabase Dashboard → Authentication → Users → Add user (email + password).
2. Set the role via the Admin API (not editable by the user). With the service-role key:

   ```bash
   curl -X PUT "$SUPABASE_URL/auth/v1/admin/users/<USER_ID>" \
     -H "apikey: $SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"app_metadata": {"role": "rental"}}'
   ```

3. Apply `docs/superpowers/sql/rental-schema.sql` in the SQL editor once.
4. Log in at `/rental/login`.

Tour admin accounts (`operation` / `marketing`) cannot access `/rental`, and rental
accounts cannot access `/admin` — each panel checks its own role.
```

- [ ] **Step 2: Full lint + build**

Run: `npm run lint && npm run build`
Expected: clean. Confirm routes present in build output: `/rental/login`, `/rental`, `/rental/rentals/new`, `/rental/rentals/[id]`.

- [ ] **Step 3: Run the pure-logic tests once more**

Run: `node --test lib/rental/pricing.test.mjs lib/rental/rentalNumber.test.mjs`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/sql/rental-role-setup.md
git commit -m "Add rental role-setup operator note"
```

---

## Self-Review (completed during plan authoring)

- **Spec coverage:** auth/separate login (T6–7), role `rental` (T5,T7,T19), vehicles (T9), renters (T10), rentals + pricing/deposit + fx (T3,T11,T12), status flow booked→out→returned/cancelled with vehicle sync (T12,T13), payment ledger deposit/rental/refund (T13,T18), handover out/in with odometer/fuel/oil/notes (T16), photos+video to Storage (T15,T16), signature (T14,T16), THB+IDR display (T12,T13), dashboard (T17), Indonesian UI throughout, schema/bucket (T1). All spec sections map to a task.
- **Placeholder scan:** no TBD/TODO; every code step contains complete code.
- **Type consistency:** view/form props, `RentalWithRefs`, `RentalHandover`, `HandoverMedia`, status/label maps, `rentalDays`/`rentalTotal`/`buildRentalNumber`/`isRentalUser` names are used identically across tasks. Bucket name `rental-media` consistent in T1/T15/T16.
- **Deviation noted:** spec listed per-route screens; plan uses the tour admin's hub-with-tabs + detail-route pattern for consistency. Rental number format `R-YYMM-NN` aligns to the existing `KT-YYMM-NN` style rather than the spec's illustrative `R-2026-0001`.
```
