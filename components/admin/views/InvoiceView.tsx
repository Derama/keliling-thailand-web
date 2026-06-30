"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Invoice, OrderWithCustomer, Payment } from "@/lib/admin/types";
import InvoiceForm from "@/components/admin/InvoiceForm";
import InvoiceDoc from "@/components/admin/InvoiceDoc";
import PrintTracker from "@/components/admin/PrintTracker";
import { ErrorNote } from "@/components/admin/ui";

/**
 * Accounting-invoice body — the "new" form or a printable invoice doc.
 * Used both by the standalone /invoice/[invoiceId] route and inside a modal
 * from the order detail. `invoiceId` is "new" or a uuid; after creation it
 * flips in place to the doc view (no navigation). `onChanged` lets the
 * surrounding order detail refresh its invoice list.
 */
export default function InvoiceView({
  orderId,
  invoiceId: initialId,
  onChanged,
}: {
  orderId: string;
  invoiceId: string;
  onChanged?: () => void;
}) {
  const [invoiceId, setInvoiceId] = useState(initialId);
  const isNew = invoiceId === "new";
  const [order, setOrder] = useState<OrderWithCustomer | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, customers(*)")
      .eq("id", orderId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrder(data as OrderWithCustomer);
      });
    if (!isNew) {
      supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single()
        .then(({ data, error }) => {
          if (error) setError(error.message);
          else setInvoice(data);
        });
      supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("paid_at")
        .then(({ data }) => setPayments(data ?? []));
    }
  }, [orderId, invoiceId, isNew]);

  if (error) return <ErrorNote message={error} />;
  if (!order || (!isNew && !invoice))
    return <p className="text-gray-400">Memuat…</p>;

  return isNew ? (
    <InvoiceForm
      order={order}
      onCreated={(id) => {
        setInvoiceId(id);
        onChanged?.();
      }}
    />
  ) : (
    <>
      <PrintTracker orderId={order.id} />
      <InvoiceDoc invoice={invoice!} order={order} payments={payments} />
    </>
  );
}
