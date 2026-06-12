"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Order, Payment, Invoice } from "@/lib/admin/types";
import OrderForm from "@/components/admin/OrderForm";
import PaymentsCard from "@/components/admin/PaymentsCard";
import { formatDate } from "@/lib/admin/utils";
import { btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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

  if (error) return <ErrorNote message={error} />;
  if (!order) return <p className="text-gray-400">Memuat…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">
          {order.order_number}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/orders/${order.id}/job-order`}
            className={btnSecondaryCls}
          >
            Job Order
          </Link>
          <Link
            href={`/admin/orders/${order.id}/invoice/new`}
            className={btnSecondaryCls}
          >
            + Invoice
          </Link>
        </div>
      </div>

      <PaymentsCard
        orderId={order.id}
        priceIdr={Number(order.price_idr)}
        payments={payments}
        onChanged={load}
      />

      {invoices.length > 0 && (
        <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-[#1B2A4A]">Invoice</h2>
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
        </section>
      )}

      <OrderForm order={order} onSaved={load} />
    </div>
  );
}
