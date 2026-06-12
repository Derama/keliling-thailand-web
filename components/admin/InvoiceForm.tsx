"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Order, InvoiceType, InvoiceLineItem } from "@/lib/admin/types";
import { INVOICE_TYPES, INVOICE_TYPE_LABELS } from "@/lib/admin/types";
import { buildDocNumber, formatIDR } from "@/lib/admin/utils";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";

export default function InvoiceForm({ order }: { order: Order }) {
  const router = useRouter();
  const [type, setType] = useState<InvoiceType>("deposit");
  const [items, setItems] = useState<InvoiceLineItem[]>([
    { description: `Paket tour ${order.order_number}`, amount_idr: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = items.reduce(
    (sum, it) => sum + (Number(it.amount_idr) || 0),
    0
  );

  function setItem(i: number, patch: Partial<InvoiceLineItem>) {
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const prefix = `KT-INV-${buildDocNumber("KT", 0).split("-")[1]}-`;
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .like("invoice_number", `${prefix}%`);
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: buildDocNumber("KT-INV", count ?? 0),
        order_id: order.id,
        type,
        amount_idr: total,
        line_items: items,
      })
      .select("id")
      .single();
    if (error) {
      setError(`Gagal membuat invoice: ${error.message}`);
      setBusy(false);
      return;
    }
    router.push(`/admin/orders/${order.id}/invoice/${data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">
        Invoice baru — {order.order_number}
      </h1>
      <Field label="Jenis">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as InvoiceType)}
          className={inputCls}
        >
          {INVOICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {INVOICE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Rincian</p>
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input
              required
              value={it.description}
              onChange={(e) => setItem(i, { description: e.target.value })}
              className={inputCls}
              placeholder="Deskripsi"
            />
            <input
              type="number"
              min="0"
              required
              value={it.amount_idr || ""}
              onChange={(e) =>
                setItem(i, { amount_idr: Number(e.target.value) })
              }
              className={`${inputCls} max-w-44`}
              placeholder="Jumlah IDR"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setItems((arr) => arr.filter((_, j) => j !== i))
                }
                className="text-sm text-red-500"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setItems((arr) => [...arr, { description: "", amount_idr: 0 }])
          }
          className="text-sm text-blue-600 hover:underline"
        >
          + baris
        </button>
      </div>
      <p className="text-sm">
        Total: <strong>{formatIDR(total)}</strong>
      </p>
      <ErrorNote message={error} />
      <button type="submit" disabled={busy || total <= 0} className={btnCls}>
        {busy ? "Membuat…" : "Buat invoice"}
      </button>
    </form>
  );
}
