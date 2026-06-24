"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Order, Payment, Invoice } from "@/lib/admin/types";
import OrderForm from "@/components/admin/OrderForm";
import PaymentsCard from "@/components/admin/PaymentsCard";
import { formatDate, formatPrintedAt, formatIDR } from "@/lib/admin/utils";
import { btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

/**
 * Order detail body — payments, invoices, edit form. Rendered both on the
 * standalone detail page and inside a modal from the orders list.
 *
 * `showHeading` hides the order-number title when the surrounding modal already
 * shows it. `onChanged` lets the list refresh after edits/payments.
 */
export default function OrderDetail({
  id,
  showHeading = true,
  onChanged,
}: {
  id: string;
  showHeading?: boolean;
  onChanged?: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrder(data);
      });
    supabase
      .from("payments")
      .select("*")
      .eq("order_id", id)
      .order("paid_at")
      .then(({ data }) => setPayments(data ?? []));
    supabase
      .from("invoices")
      .select("*")
      .eq("order_id", id)
      .order("issued_at")
      .then(({ data }) => setInvoices(data ?? []));
  }, [id]);

  useEffect(load, [load]);

  const refresh = useCallback(() => {
    load();
    onChanged?.();
  }, [load, onChanged]);

  if (error) return <ErrorNote message={error} />;
  if (!order) return <p className="text-gray-400">Memuat…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {showHeading && (
            <h1 className="text-2xl font-bold text-[#1B2A4A]">
              {order.order_number}
            </h1>
          )}
          {order.last_printed_at && (
            <p className="mt-0.5 text-xs text-gray-400">
              Terakhir dicetak {formatPrintedAt(new Date(order.last_printed_at))}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/orders/${order.id}/itinerary`}
            className={btnSecondaryCls}
          >
            Itinerary
          </Link>
          <Link
            href={`/admin/orders/${order.id}/brochure`}
            className={btnSecondaryCls}
          >
            Brosur
          </Link>
          <Link
            href={`/admin/orders/${order.id}/invoice-builder`}
            className={btnSecondaryCls}
          >
            Invoice
          </Link>
          <Link
            href={`/admin/orders/${order.id}/job-order-builder`}
            className={btnSecondaryCls}
          >
            Job Order
          </Link>
        </div>
      </div>

      <PaymentsCard
        orderId={order.id}
        priceIdr={Number(order.price_idr)}
        payments={payments}
        onChanged={refresh}
      />

      <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-[#1B2A4A]">Invoice akunting</h2>
          <Link
            href={`/admin/orders/${order.id}/invoice/new`}
            className={btnSecondaryCls}
          >
            + Invoice
          </Link>
        </div>
        {invoices.length > 0 ? (
          <>
            {(() => {
              const invoiced = invoices.reduce(
                (sum, inv) => sum + Number(inv.amount_idr),
                0
              );
              const price = Number(order.price_idr);
              const diff = invoiced - price;
              return (
                <p className="text-sm">
                  Total invoice <strong>{formatIDR(invoiced)}</strong> dari harga{" "}
                  {formatIDR(price)} —{" "}
                  {diff === 0 ? (
                    <span className="font-semibold text-green-700">cocok</span>
                  ) : diff > 0 ? (
                    <span className="font-semibold text-amber-700">
                      lebih {formatIDR(diff)}
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-700">
                      kurang {formatIDR(-diff)}
                    </span>
                  )}
                </p>
              );
            })()}
            <ul className="divide-y divide-gray-100 text-sm">
              {invoices.map((inv) => (
                <li key={inv.id} className="py-2">
                  <Link
                    href={`/admin/orders/${order.id}/invoice/${inv.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {inv.invoice_number}
                  </Link>{" "}
                  <span className="text-gray-500">
                    · {formatDate(inv.issued_at)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-gray-400">Belum ada invoice akunting.</p>
        )}
      </section>

      <OrderForm order={order} onSaved={refresh} />
    </div>
  );
}
