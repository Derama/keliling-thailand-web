"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Payment } from "@/lib/admin/types";
import { formatIDR, formatDate, isoLocal } from "@/lib/admin/utils";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";

export default function PaymentsCard({
  orderId,
  priceIdr,
  payments,
  onChanged,
}: {
  orderId: string;
  priceIdr: number;
  payments: Payment[];
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => isoLocal());
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const paid = payments.reduce((sum, p) => sum + Number(p.amount_idr), 0);
  const balance = priceIdr - paid;

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("payments").insert({
      order_id: orderId,
      amount_idr: Number(amount),
      paid_at: paidAt,
      method: method || null,
    });
    if (error) setError(error.message);
    else {
      setAmount("");
      setMethod("");
      onChanged();
    }
    setBusy(false);
  }

  async function removePayment(id: string) {
    if (!confirm("Hapus pembayaran ini?")) return;
    const { error } = await createClient()
      .from("payments")
      .delete()
      .eq("id", id);
    if (error) setError(error.message);
    else onChanged();
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-[#1B2A4A]">Pembayaran</h2>
      <p className="text-sm">
        Dibayar <strong>{formatIDR(paid)}</strong> dari {formatIDR(priceIdr)} —{" "}
        {balance <= 0 ? (
          <span className="font-semibold text-green-700">LUNAS</span>
        ) : (
          <span className="font-semibold text-red-700">
            sisa {formatIDR(balance)}
          </span>
        )}
      </p>
      <ul className="divide-y divide-gray-100 text-sm">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2">
            <span>
              {formatDate(p.paid_at)} · {formatIDR(Number(p.amount_idr))}
              {p.method ? ` · ${p.method}` : ""}
            </span>
            <button
              onClick={() => removePayment(p.id)}
              className="text-xs text-red-500 hover:underline"
            >
              hapus
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addPayment} className="flex flex-wrap items-end gap-3">
        <Field label="Jumlah (IDR)">
          <input
            type="number"
            min="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Tanggal">
          <input
            type="date"
            required
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Metode">
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputCls}
            placeholder="Transfer BCA"
          />
        </Field>
        <button type="submit" disabled={busy} className={btnCls}>
          Catat
        </button>
      </form>
      <ErrorNote message={error} />
    </section>
  );
}
