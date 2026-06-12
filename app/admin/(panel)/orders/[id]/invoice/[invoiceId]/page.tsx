"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Invoice, OrderWithCustomer, Payment } from "@/lib/admin/types";
import InvoiceForm from "@/components/admin/InvoiceForm";
import InvoiceDoc from "@/components/admin/InvoiceDoc";
import { ErrorNote } from "@/components/admin/ui";

export default function InvoicePage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = use(params);
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
      .eq("id", id)
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
        .eq("order_id", id)
        .order("paid_at")
        .then(({ data }) => setPayments(data ?? []));
    }
  }, [id, invoiceId, isNew]);

  if (error) return <ErrorNote message={error} />;
  if (!order || (!isNew && !invoice))
    return <p className="text-gray-400">Memuat…</p>;

  return isNew ? (
    <InvoiceForm order={order} />
  ) : (
    <InvoiceDoc invoice={invoice!} order={order} payments={payments} />
  );
}
