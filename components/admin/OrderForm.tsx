"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Customer, Order, OrderStatus } from "@/lib/admin/types";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/admin/types";
import {
  buildDocNumber,
  formatIDR,
  formatTHB,
  profitTHB,
  profitIDR,
} from "@/lib/admin/utils";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import FxRateHint from "@/components/admin/FxRateHint";

interface Draft {
  customer_id: string;
  status: OrderStatus;
  trip_start: string;
  trip_end: string;
  pax: string;
  pickup_location: string;
  vehicle: string;
  driver_name: string;
  itinerary: string;
  price_idr: string;
  cost_thb: string;
  fx_rate: string;
  notes: string;
}

function toDraft(o: Order | null): Draft {
  return {
    customer_id: o?.customer_id ?? "",
    status: o?.status ?? "inquiry",
    trip_start: o?.trip_start ?? "",
    trip_end: o?.trip_end ?? "",
    pax: o?.pax != null ? String(o.pax) : "",
    pickup_location: o?.pickup_location ?? "",
    vehicle: o?.vehicle ?? "",
    driver_name: o?.driver_name ?? "",
    itinerary: o?.itinerary ?? "",
    price_idr: o ? String(o.price_idr) : "",
    cost_thb: o ? String(o.cost_thb) : "",
    fx_rate: o ? String(o.fx_rate) : "",
    notes: o?.notes ?? "",
  };
}

export default function OrderForm({
  order,
  onSaved,
}: {
  order: Order | null;
  /** Called after a successful update so the parent page can refetch. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(order));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custCity, setCustCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient()
      .from("customers")
      .select("*")
      .order("name")
      .then(({ data }) => setCustomers(data ?? []));
  }, []);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const numbers = {
    price_idr: Number(draft.price_idr) || 0,
    cost_thb: Number(draft.cost_thb) || 0,
    fx_rate: Number(draft.fx_rate) || 0,
  };
  const pThb = profitTHB(numbers);
  const pIdr = profitIDR(numbers);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    let customerId = draft.customer_id;
    if (newCustomer) {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: custName,
          phone: custPhone || null,
          origin_city: custCity || null,
        })
        .select("id")
        .single();
      if (error) {
        setError(`Gagal membuat customer: ${error.message}`);
        setBusy(false);
        return;
      }
      customerId = data.id;
    }
    if (!customerId) {
      setError("Pilih customer atau buat baru.");
      setBusy(false);
      return;
    }

    const row = {
      customer_id: customerId,
      status: draft.status,
      trip_start: draft.trip_start || null,
      trip_end: draft.trip_end || null,
      pax: draft.pax ? Number(draft.pax) : null,
      pickup_location: draft.pickup_location || null,
      vehicle: draft.vehicle || null,
      driver_name: draft.driver_name || null,
      itinerary: draft.itinerary || null,
      price_idr: numbers.price_idr,
      cost_thb: numbers.cost_thb,
      fx_rate: numbers.fx_rate,
      notes: draft.notes || null,
    };

    if (order) {
      const { error } = await supabase
        .from("orders")
        .update(row)
        .eq("id", order.id);
      if (error) {
        setError(`Gagal menyimpan: ${error.message}`);
        setBusy(false);
        return;
      }
      onSaved?.();
      setBusy(false);
    } else {
      const prefix = `KT-${buildDocNumber("KT", 0).split("-")[1]}-`;
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .like("order_number", `${prefix}%`);
      const orderNumber = buildDocNumber("KT", count ?? 0);
      const { data, error } = await supabase
        .from("orders")
        .insert({ ...row, order_number: orderNumber })
        .select("id")
        .single();
      if (error) {
        setError(`Gagal membuat order: ${error.message}`);
        setBusy(false);
        return;
      }
      router.push(`/admin/orders/${data.id}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Customer</h2>
        {!newCustomer ? (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Field label="Customer">
                <select
                  value={draft.customer_id}
                  onChange={(e) => set("customer_id", e.target.value)}
                  className={inputCls}
                >
                  <option value="">— pilih —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.origin_city ? `(${c.origin_city})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <button
              type="button"
              onClick={() => setNewCustomer(true)}
              className="pb-2 text-sm text-blue-600 hover:underline"
            >
              + Customer baru
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nama">
              <input
                required
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="WhatsApp">
              <input
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                className={inputCls}
                placeholder="628…"
              />
            </Field>
            <Field label="Kota asal">
              <input
                value={custCity}
                onChange={(e) => setCustCity(e.target.value)}
                className={inputCls}
              />
            </Field>
            <button
              type="button"
              onClick={() => setNewCustomer(false)}
              className="text-left text-sm text-gray-500 hover:underline"
            >
              ← pilih customer lama
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Trip</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) => set("status", e.target.value as OrderStatus)}
              className={inputCls}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mulai">
            <input
              type="date"
              value={draft.trip_start}
              onChange={(e) => set("trip_start", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Selesai">
            <input
              type="date"
              value={draft.trip_end}
              onChange={(e) => set("trip_end", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Jumlah pax">
            <input
              type="number"
              min="1"
              value={draft.pax}
              onChange={(e) => set("pax", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Lokasi jemput">
            <input
              value={draft.pickup_location}
              onChange={(e) => set("pickup_location", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Kendaraan">
            <input
              value={draft.vehicle}
              onChange={(e) => set("vehicle", e.target.value)}
              className={inputCls}
              placeholder="Van Commuter, dst."
            />
          </Field>
          <Field label="Nama sopir">
            <input
              value={draft.driver_name}
              onChange={(e) => set("driver_name", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Itinerary (muncul di job order)">
          <textarea
            rows={5}
            value={draft.itinerary}
            onChange={(e) => set("itinerary", e.target.value)}
            className={inputCls}
            placeholder={"Hari 1: Bangkok city tour\nHari 2: Pattaya…"}
          />
        </Field>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Harga &amp; biaya</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Harga jual (IDR)">
            <input
              type="number"
              min="0"
              value={draft.price_idr}
              onChange={(e) => set("price_idr", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Total biaya (THB)">
            <input
              type="number"
              min="0"
              value={draft.cost_thb}
              onChange={(e) => set("cost_thb", e.target.value)}
              className={inputCls}
            />
          </Field>
          <div>
            <Field label="Kurs (IDR per 1 THB)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.fx_rate}
                onChange={(e) => set("fx_rate", e.target.value)}
                className={inputCls}
              />
            </Field>
            <FxRateHint onApply={(r) => set("fx_rate", String(r))} />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Profit:{" "}
          {pThb === null ? (
            <span className="text-gray-400">isi kurs dulu</span>
          ) : (
            <span className={pThb >= 0 ? "text-green-700" : "text-red-700"}>
              {formatTHB(pThb)} ≈ {formatIDR(pIdr ?? 0)}
            </span>
          )}
        </p>
        <Field label="Catatan internal">
          <textarea
            rows={2}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={inputCls}
          />
        </Field>
      </section>

      <ErrorNote message={error} />
      <button type="submit" disabled={busy} className={btnCls}>
        {busy ? "Menyimpan…" : order ? "Simpan perubahan" : "Buat order"}
      </button>
    </form>
  );
}
