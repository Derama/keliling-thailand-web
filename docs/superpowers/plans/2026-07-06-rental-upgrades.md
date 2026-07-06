# Rental Admin Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/rental` admin with full-price-only pricing (deposit hidden), a signed printable T&C rental agreement, and a structured per-panel damage log.

**Architecture:** UI-only deposit removal (DB columns stay, default 0). T&C clauses live in code (`lib/rental/terms.ts`), agreed via required checkbox on the pickup handover; a new print route renders the agreement. Damage log is a new `handover_damages` table + `DamageLog` component embedded in `HandoverForm`, photos to the existing private `rental-media` bucket.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Supabase (client-side, `createClient` from `@/lib/supabase/client`).

Spec: `docs/superpowers/specs/2026-07-06-rental-upgrades-design.md`

**Notes for the implementer:**
- Admin UI is Indonesian-only. No test framework configured; pure-logic tests are plain `.mjs` run with `node`. These upgrades are CRUD/UI — no new pure logic, so verification = `npm run build` + `npm run lint` + existing `.mjs` tests.
- The SQL file is applied MANUALLY by the owner in the Supabase SQL editor — never attempt to run it.
- Reuse UI primitives: `Field`, `inputCls`, `btnCls`, `btnSecondaryCls`, `ErrorNote` from `@/components/admin/ui`; `Select` from `@/components/admin/Select` (never native `<select>`).

---

### Task 1: SQL migration file + domain types

**Files:**
- Create: `docs/superpowers/sql/rental-upgrades.sql`
- Modify: `lib/rental/types.ts`

- [ ] **Step 1: Create the SQL file**

```sql
-- Rental admin upgrades (2026-07-06): T&C agreement columns + structured damage log.
-- Run manually in the Supabase SQL editor (same workflow as rental-schema.sql).

alter table rental_handovers add column if not exists terms_agreed boolean not null default false;
alter table rental_handovers add column if not exists terms_version text;

create table if not exists handover_damages (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references rental_handovers(id) on delete cascade,
  panel text not null,
  severity text not null,        -- lecet | penyok | pecah
  note text,
  photo_path text,               -- rental-media bucket
  created_at timestamptz not null default now()
);

alter table handover_damages enable row level security;
create policy handover_damages_authenticated_all on handover_damages
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Update `lib/rental/types.ts`**

Add `terms_agreed` / `terms_version` to `RentalHandover` (after `oil_level`):

```ts
export interface RentalHandover {
  id: string;
  rental_id: string;
  kind: HandoverKind;
  odometer_km: number | null;
  fuel_level: FuelLevel | null;
  oil_level: string | null;
  terms_agreed: boolean;
  terms_version: string | null;
  signature: string | null;
  inspected_at: string;
  notes: string | null;
}
```

Add after the `HandoverMedia` interface:

```ts
export type DamageSeverity = "lecet" | "penyok" | "pecah";

export interface HandoverDamage {
  id: string;
  handover_id: string;
  panel: string;
  severity: DamageSeverity;
  note: string | null;
  photo_path: string | null;
  created_at: string;
}
```

Add after `FUEL_LEVEL_LABELS`:

```ts
export const DAMAGE_PANELS: string[] = [
  "Bumper depan",
  "Bumper belakang",
  "Kap mesin",
  "Atap",
  "Bagasi",
  "Pintu depan kiri",
  "Pintu depan kanan",
  "Pintu belakang kiri",
  "Pintu belakang kanan",
  "Spion kiri",
  "Spion kanan",
  "Lampu depan",
  "Lampu belakang",
  "Velg depan kiri",
  "Velg depan kanan",
  "Velg belakang kiri",
  "Velg belakang kanan",
  "Kaca depan",
  "Kaca belakang",
];

export const DAMAGE_SEVERITIES: DamageSeverity[] = ["lecet", "penyok", "pecah"];

export const DAMAGE_SEVERITY_LABELS: Record<DamageSeverity, string> = {
  lecet: "Lecet",
  penyok: "Penyok",
  pecah: "Pecah",
};
```

Shrink `PAYMENT_KINDS` (the `PaymentKind` union and `PAYMENT_KIND_LABELS` keep `deposit` so legacy rows still render):

```ts
export const PAYMENT_KINDS: PaymentKind[] = ["rental", "refund"];
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: compiles clean (nothing references the new types yet; `PAYMENT_KINDS` change is used by `RentalDetail` — still type-safe).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/sql/rental-upgrades.sql lib/rental/types.ts
git commit -m "feat(rental): schema + types for T&C agreement and damage log"
```

---

### Task 2: Remove deposit from UI (full price only)

**Files:**
- Modify: `components/rental/RentalWizard.tsx`
- Modify: `components/rental/VehicleForm.tsx`
- Modify: `components/rental/views/VehiclesView.tsx:67`
- Modify: `components/rental/RentalDetail.tsx`

- [ ] **Step 1: `RentalWizard.tsx`** — delete the deposit state/snapshot/field, insert 0.

Delete line 22 (`const [deposit, setDeposit] = useState("");`). In `chooseVehicle` delete `setDeposit(String(v.deposit_thb));` and update the comment above it to `// When a vehicle is chosen, snapshot its rate into the editable field.`. In the insert payload replace `deposit_thb: Number(deposit) || 0,` with `deposit_thb: 0,`. Delete the whole `<Field label="Deposit (THB)">…</Field>` block (lines 163-165).

- [ ] **Step 2: `VehicleForm.tsx`** — remove deposit from draft + form.

Delete `deposit_thb: string;` from `Draft`, `deposit_thb: v ? String(v.deposit_thb) : "",` from `toDraft`, change the submit row to `deposit_thb: 0,` (literal — table column is `not null`), and delete the `<Field label="Deposit (THB)">…</Field>` block.

- [ ] **Step 3: `VehiclesView.tsx`** — line 67, drop the deposit segment:

```tsx
{v.plate} · {formatTHB(v.daily_rate_thb)}/hari
```

- [ ] **Step 4: `RentalDetail.tsx`** — remove deposit display + default pay kind.

Change line 24 to `const [payKind, setPayKind] = useState<PaymentKind>("rental");`. Delete the Deposit info block (lines 139-142):

```tsx
        <div>
          <p className="text-sm text-gray-500">Deposit</p>
          <p>{formatTHB(rental.deposit_thb)}</p>
        </div>
```

Update the ledger comment (line 102) to `// Ledger: rental (and legacy deposit) inflow; refund outflow.` — the reduce itself is already correct.

- [ ] **Step 5: Verify + commit**

Run: `npm run build && npm run lint`
Expected: clean (watch for unused-import errors, e.g. `formatTHB` still used elsewhere in each file — it is).

```bash
git add components/rental
git commit -m "feat(rental): full-price pricing — remove deposit from all forms and views"
```

---

### Task 3: T&C clause module

**Files:**
- Create: `lib/rental/terms.ts`

- [ ] **Step 1: Create `lib/rental/terms.ts`**

```ts
// Syarat & ketentuan sewa mobil lepas kunci. Ditampilkan di serah terima
// (keluar) dan dicetak di halaman perjanjian. Naikkan TERMS_VERSION bila
// isi klausul berubah.

export const TERMS_VERSION = "2026-07-06";

export const RENTAL_TERMS: string[] = [
  "Penyewa wajib memiliki SIM yang masih berlaku (SIM Internasional atau SIM Thailand) dan menunjukkannya saat serah terima kendaraan.",
  "Kendaraan dikembalikan dengan level BBM yang sama seperti saat serah terima. Kekurangan BBM akan ditagihkan ke penyewa.",
  "Segala kerusakan, kehilangan, atau kecelakaan selama masa sewa menjadi tanggung jawab penyewa, termasuk biaya perbaikan dan penggantian sesuai kondisi saat serah terima yang tercatat dalam dokumen ini.",
  "Denda tilang, biaya tol, parkir, dan pelanggaran lalu lintas selama masa sewa ditanggung sepenuhnya oleh penyewa, termasuk yang tertagih setelah masa sewa berakhir.",
  "Keterlambatan pengembalian dikenakan biaya satu hari sewa penuh untuk setiap 24 jam keterlambatan, dengan masa tenggang 2 jam.",
  "Kendaraan dilarang disewakan kembali kepada pihak lain, digunakan untuk balapan, kegiatan melanggar hukum, atau dibawa keluar dari wilayah yang disepakati tanpa izin tertulis dari pemilik.",
  "Kendaraan hanya boleh dikemudikan oleh penyewa yang tercantum dalam perjanjian ini.",
  "Setiap kecelakaan atau kerusakan wajib dilaporkan kepada pemilik segera (maksimal 1x24 jam) disertai foto dan kronologi kejadian.",
  "Pemilik tidak bertanggung jawab atas kehilangan barang pribadi penyewa yang tertinggal di dalam kendaraan.",
  "Kendaraan dikembalikan dalam kondisi wajar dan bersih. Biaya pembersihan ekstra (noda berat, bau rokok, pasir berlebih) dapat ditagihkan ke penyewa.",
  "Dalam kondisi kahar (force majeure) seperti bencana alam atau kebijakan pemerintah, kedua pihak akan menyelesaikan penyesuaian sewa secara musyawarah.",
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/rental/terms.ts
git commit -m "feat(rental): standard Indonesian T&C clauses module"
```

---

### Task 4: DamageLog component

**Files:**
- Create: `components/rental/DamageLog.tsx`

- [ ] **Step 1: Create `components/rental/DamageLog.tsx`**

Follows the `MediaUpload` pattern (signed URLs, `rental-media` bucket). `compareHandoverId` renders the pickup damages read-only above the editable log (used on the return panel).

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HandoverDamage, DamageSeverity } from "@/lib/rental/types";
import {
  DAMAGE_PANELS,
  DAMAGE_SEVERITIES,
  DAMAGE_SEVERITY_LABELS,
} from "@/lib/rental/types";
import Select from "@/components/admin/Select";
import { inputCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

const BUCKET = "rental-media";

type Item = { damage: HandoverDamage; url: string | null };

async function loadDamages(handoverId: string): Promise<Item[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("handover_damages")
    .select("*")
    .eq("handover_id", handoverId)
    .order("created_at");
  const damages = (data ?? []) as HandoverDamage[];
  return Promise.all(
    damages.map(async (d) => {
      if (!d.photo_path) return { damage: d, url: null };
      const { data: s } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(d.photo_path, 3600);
      return { damage: d, url: s?.signedUrl ?? null };
    })
  );
}

function DamageList({
  items,
  onDelete,
}: {
  items: Item[];
  onDelete?: (d: HandoverDamage) => void;
}) {
  if (items.length === 0)
    return <p className="text-xs text-gray-400">Tidak ada kerusakan tercatat.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {items.map(({ damage, url }) => (
        <li key={damage.id} className="flex items-center gap-3 py-2 text-sm">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={damage.panel} className="h-12 w-12 rounded object-cover" />
          ) : (
            <span className="h-12 w-12 rounded bg-gray-100" />
          )}
          <span className="flex-1">
            <span className="font-medium">{damage.panel}</span>
            {" · "}
            {DAMAGE_SEVERITY_LABELS[damage.severity]}
            {damage.note ? <span className="text-gray-500"> — {damage.note}</span> : null}
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(damage)}
              className="text-xs text-red-600 hover:underline"
            >
              Hapus
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function DamageLog({
  handoverId,
  compareHandoverId,
}: {
  handoverId: string;
  /** Pickup handover id — shows its damages read-only for comparison. */
  compareHandoverId?: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [compareItems, setCompareItems] = useState<Item[]>([]);
  const [panel, setPanel] = useState(DAMAGE_PANELS[0]);
  const [severity, setSeverity] = useState<DamageSeverity>("lecet");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    loadDamages(handoverId).then(setItems);
    if (compareHandoverId) loadDamages(compareHandoverId).then(setCompareItems);
  }, [handoverId, compareHandoverId]);

  useEffect(load, [load]);

  async function add() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    let photoPath: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      photoPath = `damages/${handoverId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(photoPath, file);
      if (upErr) {
        setError(`Gagal unggah foto: ${upErr.message}`);
        setBusy(false);
        return;
      }
    }
    const { error: insErr } = await supabase.from("handover_damages").insert({
      handover_id: handoverId,
      panel,
      severity,
      note: note.trim() || null,
      photo_path: photoPath,
    });
    if (insErr) {
      setError(`Gagal simpan: ${insErr.message}`);
      setBusy(false);
      return;
    }
    setNote("");
    setFile(null);
    setBusy(false);
    load();
  }

  async function remove(d: HandoverDamage) {
    const supabase = createClient();
    if (d.photo_path) await supabase.storage.from(BUCKET).remove([d.photo_path]);
    const { error } = await supabase.from("handover_damages").delete().eq("id", d.id);
    if (error) {
      setError(`Gagal hapus: ${error.message}`);
      return;
    }
    load();
  }

  return (
    <div className="space-y-3">
      {compareHandoverId && (
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium text-gray-500">
            Kerusakan saat keluar (pembanding)
          </p>
          <DamageList items={compareItems} />
        </div>
      )}

      <span className="block text-sm font-medium text-gray-700">Catatan kerusakan</span>
      <DamageList items={items} onDelete={remove} />

      <div className="grid gap-2 sm:grid-cols-4 sm:items-end">
        <Select
          value={panel}
          onChange={setPanel}
          options={DAMAGE_PANELS.map((p) => ({ value: p, label: p }))}
        />
        <Select
          value={severity}
          onChange={(v) => setSeverity(v as DamageSeverity)}
          options={DAMAGE_SEVERITIES.map((s) => ({ value: s, label: DAMAGE_SEVERITY_LABELS[s] }))}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputCls}
          placeholder="Catatan (opsional)"
        />
        <div className="flex items-center gap-2">
          <label className={`${btnSecondaryCls} cursor-pointer text-xs`}>
            {file ? "1 foto" : "Foto"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          <button type="button" onClick={add} disabled={busy} className={`${btnSecondaryCls} text-xs`}>
            {busy ? "Menyimpan…" : "+ Tambah"}
          </button>
        </div>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run: `npm run build && npm run lint`
Expected: clean (component not yet mounted anywhere — that's Task 5).

```bash
git add components/rental/DamageLog.tsx
git commit -m "feat(rental): structured per-panel damage log component"
```

---

### Task 5: HandoverForm — T&C checkbox + DamageLog integration

**Files:**
- Modify: `components/rental/HandoverForm.tsx`

- [ ] **Step 1: Imports + state**

Add imports:

```tsx
import DamageLog from "@/components/rental/DamageLog";
import { RENTAL_TERMS, TERMS_VERSION } from "@/lib/rental/terms";
```

Add state after `const [notes, setNotes] = useState("");`:

```tsx
const [agreed, setAgreed] = useState(false);
```

In `load()`'s `if (h)` block add:

```tsx
setAgreed(h.terms_agreed ?? false);
```

- [ ] **Step 2: Save gating + payload**

At the top of `save()` add:

```tsx
if (kind === "out" && !agreed) {
  setError("Penyewa harus menyetujui syarat & ketentuan dulu.");
  return;
}
```

Extend the `row` object (after `notes`):

```tsx
...(kind === "out"
  ? { terms_agreed: agreed, terms_version: TERMS_VERSION }
  : {}),
```

- [ ] **Step 3: Relabel general note**

Change `<Field label="Catatan kondisi / lecet">` to `<Field label="Catatan umum">` and its placeholder to `"Catatan tambahan…"` (structured scratches now live in DamageLog).

- [ ] **Step 4: T&C section (pickup only)**

Insert between the notes Field and the signature block:

```tsx
{kind === "out" && (
  <div className="space-y-2 rounded-lg border border-gray-200 p-3">
    <details>
      <summary className="cursor-pointer text-sm font-medium text-[#1B2A4A]">
        Syarat &amp; ketentuan sewa
      </summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-gray-600">
        {RENTAL_TERMS.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
    </details>
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={agreed}
        onChange={(e) => setAgreed(e.target.checked)}
        className="mt-0.5"
      />
      <span>Penyewa menyetujui syarat &amp; ketentuan di atas</span>
    </label>
  </div>
)}
```

- [ ] **Step 5: Mount DamageLog**

Inside the existing `{handover && (…)}` block, above the `MediaUpload` lines:

```tsx
<DamageLog
  handoverId={handover.id}
  compareHandoverId={kind === "in" ? compareTo?.id : undefined}
/>
```

- [ ] **Step 6: Verify + commit**

Run: `npm run build && npm run lint`
Expected: clean.

```bash
git add components/rental/HandoverForm.tsx
git commit -m "feat(rental): T&C agreement checkbox at pickup + damage log in handovers"
```

---

### Task 6: Printable agreement page

**Files:**
- Create: `components/rental/AgreementDoc.tsx`
- Create: `app/rental/(panel)/rentals/[id]/agreement/page.tsx`
- Modify: `components/rental/RentalDetail.tsx` (add link button)

- [ ] **Step 1: Create `components/rental/AgreementDoc.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalWithRefs, RentalHandover, HandoverDamage } from "@/lib/rental/types";
import { DAMAGE_SEVERITY_LABELS, FUEL_LEVEL_LABELS } from "@/lib/rental/types";
import { RENTAL_TERMS } from "@/lib/rental/terms";
import { formatTHB, formatIDR, formatDate } from "@/lib/admin/utils";
import { convertThbToIdr } from "@/lib/currency";
import { btnCls } from "@/components/admin/ui";

export default function AgreementDoc({ rentalId }: { rentalId: string }) {
  const [rental, setRental] = useState<RentalWithRefs | null>(null);
  const [pickup, setPickup] = useState<RentalHandover | null>(null);
  const [damages, setDamages] = useState<HandoverDamage[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("rentals")
      .select("*, vehicles(*), renters(*)")
      .eq("id", rentalId)
      .single()
      .then(({ data }) => setRental(data as RentalWithRefs));
    supabase
      .from("rental_handovers")
      .select("*")
      .eq("rental_id", rentalId)
      .eq("kind", "out")
      .maybeSingle()
      .then(async ({ data }) => {
        const h = data as RentalHandover | null;
        setPickup(h);
        if (h) {
          const { data: d } = await supabase
            .from("handover_damages")
            .select("*")
            .eq("handover_id", h.id)
            .order("created_at");
          setDamages((d ?? []) as HandoverDamage[]);
        }
      });
  }, [rentalId]);

  if (!rental) return <p className="text-gray-400">Memuat…</p>;

  const totalIdr = convertThbToIdr(rental.total_thb, rental.fx_rate);

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-6 text-sm text-gray-900 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/rental/rentals/${rentalId}`} className="text-sm text-gray-500 hover:underline">
          ← Kembali
        </Link>
        <button onClick={() => window.print()} className={btnCls}>
          Cetak
        </button>
      </div>

      <header className="border-b-2 border-[#1B2A4A] pb-3 text-center">
        <h1 className="text-xl font-bold text-[#1B2A4A]">PERJANJIAN SEWA MOBIL LEPAS KUNCI</h1>
        <p className="text-gray-500">Keliling Thailand · No. {rental.rental_number}</p>
      </header>

      <section className="grid grid-cols-2 gap-x-6 gap-y-1">
        <p><span className="text-gray-500">Penyewa:</span> {rental.renters?.name}</p>
        <p><span className="text-gray-500">Telepon:</span> {rental.renters?.phone ?? "—"}</p>
        <p><span className="text-gray-500">No. SIM:</span> {rental.renters?.license_no ?? "—"}</p>
        <p><span className="text-gray-500">Kendaraan:</span> {rental.vehicles?.name} ({rental.vehicles?.plate})</p>
        <p>
          <span className="text-gray-500">Periode:</span>{" "}
          {formatDate(rental.start_date)} — {formatDate(rental.end_date)} ({rental.days} hari)
        </p>
        <p>
          <span className="text-gray-500">Harga total:</span> {formatTHB(rental.total_thb)}
          {totalIdr != null ? ` ≈ ${formatIDR(totalIdr)}` : ""}
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold text-[#1B2A4A]">Kondisi saat serah terima</h2>
        {pickup ? (
          <>
            <p>
              Odometer: {pickup.odometer_km ?? "—"} km · BBM:{" "}
              {pickup.fuel_level ? FUEL_LEVEL_LABELS[pickup.fuel_level] : "—"} · Oli:{" "}
              {pickup.oil_level === "low" ? "Kurang" : "OK"}
            </p>
            {damages.length > 0 ? (
              <ul className="mt-1 list-disc pl-5">
                {damages.map((d) => (
                  <li key={d.id}>
                    {d.panel} — {DAMAGE_SEVERITY_LABELS[d.severity]}
                    {d.note ? ` (${d.note})` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Tidak ada kerusakan tercatat saat serah terima.</p>
            )}
          </>
        ) : (
          <p className="text-gray-500">Serah terima belum dicatat.</p>
        )}
      </section>

      <section>
        <h2 className="mb-1 font-semibold text-[#1B2A4A]">Syarat &amp; ketentuan</h2>
        <ol className="list-decimal space-y-1 pl-5">
          {RENTAL_TERMS.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-2 gap-6 pt-4">
        <div className="text-center">
          <p className="mb-2 text-gray-500">Penyewa</p>
          {pickup?.signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pickup.signature} alt="tanda tangan penyewa" className="mx-auto h-20" />
          ) : (
            <div className="h-20" />
          )}
          <p className="border-t border-gray-300 pt-1">{rental.renters?.name}</p>
        </div>
        <div className="text-center">
          <p className="mb-2 text-gray-500">Pemilik</p>
          <div className="h-20" />
          <p className="border-t border-gray-300 pt-1">Keliling Thailand</p>
        </div>
      </section>

      <p className="text-xs text-gray-400">
        Ditandatangani {pickup ? formatDate(pickup.inspected_at.slice(0, 10)) : "—"} · Versi S&amp;K:{" "}
        {pickup?.terms_version ?? "—"}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/rental/(panel)/rentals/[id]/agreement/page.tsx`**

```tsx
import AgreementDoc from "@/components/rental/AgreementDoc";

export default async function RentalAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgreementDoc rentalId={id} />;
}
```

- [ ] **Step 3: Link from `RentalDetail.tsx`**

In the header block, next to the status badge (inside the same `flex flex-wrap items-center justify-between` div), wrap badge + link:

```tsx
<div className="flex items-center gap-2">
  <Link
    href={`/rental/rentals/${rental.id}/agreement`}
    className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
  >
    Perjanjian
  </Link>
  <span className={`rounded-full px-3 py-1 text-sm font-medium ${RENTAL_STATUS_COLORS[rental.status]}`}>
    {RENTAL_STATUS_LABELS[rental.status]}
  </span>
</div>
```

- [ ] **Step 4: Verify + commit**

Run: `npm run build && npm run lint`
Expected: clean.

```bash
git add components/rental/AgreementDoc.tsx "app/rental/(panel)/rentals/[id]/agreement/page.tsx" components/rental/RentalDetail.tsx
git commit -m "feat(rental): printable rental agreement page with T&C + signature"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full check**

Run: `npm run build && npm run lint && node lib/rental/pricing.test.mjs && node lib/rental/rentalNumber.test.mjs`
Expected: build + lint clean, both test files print passing output.

- [ ] **Step 2: Remind owner of manual step**

Tell the owner: run `docs/superpowers/sql/rental-upgrades.sql` in the Supabase SQL editor before using T&C save or damage log (otherwise inserts fail on missing table/columns).
