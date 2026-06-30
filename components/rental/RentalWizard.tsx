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
