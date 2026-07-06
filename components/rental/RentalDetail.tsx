"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalWithRefs, RentalPayment, PaymentKind, RentalHandover } from "@/lib/rental/types";
import HandoverForm from "@/components/rental/HandoverForm";
import {
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_COLORS,
  PAYMENT_KINDS,
  PAYMENT_KIND_LABELS,
} from "@/lib/rental/types";
import { formatTHB, formatIDR, formatDate } from "@/lib/admin/utils";
import { convertThbToIdr } from "@/lib/currency";
import Select from "@/components/admin/Select";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

export default function RentalDetail({ rentalId }: { rentalId: string }) {
  const [rental, setRental] = useState<RentalWithRefs | null>(null);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [pickup, setPickup] = useState<RentalHandover | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payKind, setPayKind] = useState<PaymentKind>("rental");
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
    supabase
      .from("rental_handovers")
      .select("*")
      .eq("rental_id", rentalId)
      .eq("kind", "out")
      .maybeSingle()
      .then(({ data }) => setPickup((data as RentalHandover | null) ?? null));
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

  // Ledger: rental (and legacy deposit) inflow; refund outflow.
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
          {"“Kembali”"} / {"“Batal”"} otomatis menjadikan mobil tersedia lagi.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Pembayaran</h2>
        <form onSubmit={addPayment} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <Field label="Jenis">
            <Select
              value={payKind}
              onChange={(v) => setPayKind(v as PaymentKind)}
              options={PAYMENT_KINDS.map((k) => ({ value: k, label: PAYMENT_KIND_LABELS[k] }))}
            />
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

      <HandoverForm rentalId={rental.id} kind="out" />
      <HandoverForm rentalId={rental.id} kind="in" compareTo={pickup} />
    </div>
  );
}
