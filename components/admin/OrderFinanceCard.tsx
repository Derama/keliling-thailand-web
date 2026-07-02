"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/admin/types";
import { formatIDR, formatTHB } from "@/lib/admin/utils";
import { loadOrderDoc } from "@/lib/admin/orderDocs";
import {
  invoiceTotals,
  lineCustomerTotal,
  lineOperatorTotal,
  type InvoiceLine,
} from "@/lib/admin/invoice";

/** The bits of the invoice builder draft we need for the breakdown. */
interface InvoiceDraft {
  lines: InvoiceLine[];
  idrRate: number;
}

/**
 * Read-only money breakdown for an order, shown in the Pembayaran tab. The
 * three headline figures come from the order (synced from the invoice on save);
 * the per-line detail is loaded from the saved invoice draft. Nothing is typed.
 *   1. Biaya ke customer  = what the customer pays us (customer total)
 *   2. Biaya ke operator  = what we pay the tour operator (operator total)
 *   3. Margin perusahaan  = customer − operator (our margin)
 */
export default function OrderFinanceCard({
  order,
  reloadKey = 0,
}: {
  order: Order;
  /** Bump to re-fetch the saved draft after the invoice is edited. */
  reloadKey?: number;
}) {
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadOrderDoc<InvoiceDraft>(order.id, "invoice").then((d) => {
      if (!cancelled) setDraft(d);
    });
    return () => {
      cancelled = true;
    };
    // reloadKey changes on every order refresh (e.g. after saving an edited
    // invoice), so the per-line table and operator margin stay in sync even
    // when the order's headline totals happen to be unchanged.
  }, [order.id, reloadKey]);

  const lines = draft?.lines ?? [];
  const totals = lines.length ? invoiceTotals(lines) : null;

  // Prefer the saved invoice draft — it reflects the invoice the moment it's
  // saved, without waiting for the separate "Simpan ke order" finance sync that
  // writes the order's price_idr / cost_thb / fx_rate. Fall back to those order
  // fields when there's no draft (e.g. an older order).
  const fx = Number(draft?.idrRate) > 0 ? Number(draft?.idrRate) : Number(order.fx_rate);
  const hasFx = fx > 0;

  const customerThb = totals
    ? totals.customerTotal
    : hasFx
      ? Number(order.price_idr) / fx
      : null;
  const operatorThb = totals ? totals.operatorTotal : Number(order.cost_thb) || null;
  const opMarginThb = totals ? totals.marginTotal : null;
  const marginThb =
    customerThb !== null && operatorThb !== null ? customerThb - operatorThb : null;

  const customerIdr =
    customerThb !== null && hasFx ? customerThb * fx : Number(order.price_idr) || null;
  const operatorIdr = operatorThb !== null && hasFx ? operatorThb * fx : null;
  const opMarginIdr = opMarginThb !== null && hasFx ? opMarginThb * fx : null;
  const marginIdr = marginThb !== null && hasFx ? marginThb * fx : null;

  const ready = customerThb !== null && operatorThb !== null;

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-[#1B2A4A]">Biaya &amp; margin</h2>
        <span className="text-xs text-gray-400">
          Otomatis dari invoice{hasFx ? ` · kurs ${formatIDR(fx)}/THB` : ""}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Cell label="Biaya ke customer" thb={customerThb} idr={customerIdr} tone="navy" />
        <Cell label="Biaya ke tour operator" thb={operatorThb} idr={operatorIdr} tone="navy" />
        <Cell
          label="Margin to Love bangkok"
          thb={opMarginThb}
          idr={opMarginIdr}
          tone="navy"
        />
        <Cell label="Margin perusahaan" thb={marginThb} idr={marginIdr} tone="margin" />
      </div>

      {!ready && (
        <p className="text-xs text-gray-400">
          Terisi setelah invoice (dengan modal &amp; kurs) disimpan.
        </p>
      )}

      {/* Per-line detail from the saved invoice (all THB). */}
      {lines.length > 0 && totals && (
        <div className="overflow-x-auto border-t border-gray-200 pt-4 mt-2">
          <p className="mb-3 text-xs font-medium text-gray-500">Rincian invoice</p>
          <table className="w-full min-w-[760px] text-sm tabular-nums [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead className="text-center text-xs text-gray-500">
              <tr className="border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 px-2 text-center font-medium">Qty</th>
                <th className="py-2 px-2 text-center font-medium">Modal</th>
                <th className="py-2 px-2 text-center font-medium">Margin to Love bangkok</th>
                <th className="py-2 px-2 text-center font-medium">Ke operator</th>
                <th className="py-2 px-2 text-center font-medium">Jual</th>
                <th className="py-2 px-2 text-center font-medium">Ke customer</th>
                <th className="py-2 pl-2 text-center font-medium">Margin KT</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 text-center">{l.desc || "Item"}</td>
                  <td className="py-2 px-2 text-center">
                    {l.qty}
                    {l.unit ? ` ${l.unit}` : ""}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-600">
                    {formatTHB(l.capital)}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-600">
                    {formatTHB(l.margin)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {formatTHB(lineOperatorTotal(l))}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-600">
                    {formatTHB(l.sell)}
                  </td>
                  <td className="py-2 px-2 text-center font-medium text-[#1B2A4A]">
                    {formatTHB(lineCustomerTotal(l))}
                  </td>
                  <td className="py-2 pl-2 text-center text-green-700">
                    {formatTHB(lineCustomerTotal(l) - lineOperatorTotal(l))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-semibold text-[#1B2A4A]">
                <td className="py-2 pr-3 text-center">Total</td>
                <td className="py-2 px-2" />
                <td className="py-2 px-2 text-center">{formatTHB(totals.capitalTotal)}</td>
                <td className="py-2 px-2 text-center">{formatTHB(totals.marginTotal)}</td>
                <td className="py-2 px-2 text-center">{formatTHB(totals.operatorTotal)}</td>
                <td className="py-2 px-2" />
                <td className="py-2 px-2 text-center">{formatTHB(totals.customerTotal)}</td>
                <td className="py-2 pl-2 text-center text-green-700">
                  {formatTHB(totals.customerTotal - totals.operatorTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

function Cell({
  label,
  thb,
  idr,
  tone,
}: {
  label: string;
  thb: number | null;
  idr: number | null;
  tone: "navy" | "margin";
}) {
  const color =
    tone === "margin"
      ? thb !== null && thb < 0
        ? "text-red-700"
        : "text-green-700"
      : "text-[#1B2A4A]";
  return (
    <div className="text-center">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>
        {thb !== null ? formatTHB(thb) : "—"}
      </p>
      <p className="text-xs text-gray-500">
        {idr !== null ? `≈ ${formatIDR(idr)}` : "—"}
      </p>
    </div>
  );
}
