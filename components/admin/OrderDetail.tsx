"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer, Payment, Invoice } from "@/lib/admin/types";
import OrderForm from "@/components/admin/OrderForm";
import OrderFinanceCard from "@/components/admin/OrderFinanceCard";
import PaymentsCard from "@/components/admin/PaymentsCard";
import ItineraryBuilderView from "@/components/admin/views/ItineraryBuilderView";
import InvoiceBuilderView from "@/components/admin/views/InvoiceBuilderView";
import JobOrderBuilderView from "@/components/admin/views/JobOrderBuilderView";
import { formatPrintedAt, formatIDR } from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

type Tab = "pembayaran" | "invoice" | "joborder" | "itinerary";

const TAB_TITLES: Record<Tab, string> = {
  pembayaran: "Pembayaran & Detail",
  invoice: "Invoice",
  joborder: "Job Order",
  itinerary: "Itinerary",
};

const TAB_ORDER: Tab[] = ["pembayaran", "invoice", "joborder", "itinerary"];

/**
 * Order detail body — a tabbed workspace for one order: payments, the single
 * invoice builder, job order, itinerary, and order/customer detail. Rendered
 * inside a wide printIsolate modal from the orders list, and on the standalone
 * detail page.
 *
 * `showHeading` hides the order-number title when the surrounding modal already
 * shows it. `onChanged` lets the list refresh after edits/payments.
 */
export default function OrderDetail({
  id,
  showHeading = true,
  onChanged,
  onDeleted,
}: {
  id: string;
  showHeading?: boolean;
  onChanged?: () => void;
  /** Called after the order is deleted so a wrapping modal can close. */
  onDeleted?: () => void;
}) {
  const [order, setOrder] = useState<OrderWithCustomer | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<Tab>("pembayaran");
  // Keep-alive: a tab mounts the first time it's opened and then stays mounted
  // (just hidden) so re-clicking is instant — no re-fetch, no lost scroll/state.
  const [visited, setVisited] = useState<Set<Tab>>(new Set(["pembayaran"]));

  function openTab(t: Tab) {
    setVisited((prev) => (prev.has(t) ? prev : new Set(prev).add(t)));
    setTab(t);
  }

  const load = useCallback(() => {
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, customers(*)")
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
    setReloadKey((k) => k + 1);
    onChanged?.();
  }, [load, onChanged]);

  async function onDelete() {
    if (!order) return;
    if (
      !confirm(
        `Hapus order ${order.order_number}? Pembayaran, invoice, dan dokumen terkait ikut terhapus. Tindakan ini permanen.`
      )
    )
      return;
    const { error } = await createClient()
      .from("orders")
      .delete()
      .eq("id", order.id);
    if (error) {
      setError(`Gagal menghapus: ${error.message}`);
      return;
    }
    onDeleted?.();
  }

  if (error) return <ErrorNote message={error} />;
  if (!order) return <p className="text-gray-400">Memuat…</p>;

  const invoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount_idr), 0);
  // Show the builder's sequential document numbers (INV-YYYY-NNNN) only.
  const invoiceNumbers = invoices
    .map((inv) => inv.invoice_number)
    .filter((n): n is string => !!n && n.startsWith("INV-"))
    .join(" · ");
  const price = Number(order.price_idr);
  const paid = payments.reduce((sum, p) => sum + Number(p.amount_idr), 0);
  const diff = invoiced - price;

  return (
    <div className="space-y-4">
      {/* Header — hidden when printing a builder tab. */}
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          {showHeading && (
            <h1 className="text-2xl font-bold text-[#1B2A4A]">
              {order.order_number}
            </h1>
          )}
          {order.customers && (
            <p className="mt-0.5 text-sm text-gray-600">
              {order.customers.name}
              {order.customers.phone && (
                <>
                  {" · "}
                  <a
                    href={`https://wa.me/${order.customers.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#25D366] hover:underline"
                  >
                    {order.customers.phone}
                  </a>
                </>
              )}
            </p>
          )}
          {order.last_printed_at && (
            <p className="mt-0.5 text-xs text-gray-400">
              Terakhir dicetak {formatPrintedAt(new Date(order.last_printed_at))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {tab === "pembayaran" && (
            <button
              type="submit"
              form="order-edit-form"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1B2A4A] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Simpan perubahan
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Hapus
          </button>
        </div>
      </div>

      {/* Tab bar — hidden when printing. One scrollable row on phones so the
          four tabs never wrap into a ragged second line. */}
      <div className="no-print no-scrollbar flex gap-1 overflow-x-auto border-b border-gray-200 sm:flex-wrap">
        {TAB_ORDER.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => openTab(t)}
              aria-pressed={active}
              className={`-mb-px shrink-0 rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
                active
                  ? "border-[#1B2A4A] text-[#1B2A4A]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {TAB_TITLES[t]}
            </button>
          );
        })}
      </div>

      {/* The modal is fixed-height (see Modal `wide`) so tabs never resize it. */}
      <div>
      {visited.has("pembayaran") && (
        <div className={`space-y-6 ${tab === "pembayaran" ? "" : "hidden"}`}>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <div className="flex min-w-0 flex-col gap-4">
          <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-gray-500">Harga (dari invoice)</p>
              <p className="text-lg font-bold text-[#1B2A4A]">{formatIDR(price)}</p>
              {invoiceNumbers && (
                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  {invoiceNumbers}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total bayar</p>
              <p className="text-lg font-bold text-[#1B2A4A]">{formatIDR(paid)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Sisa</p>
              <p
                className={`text-lg font-bold ${
                  price - paid <= 0 ? "text-green-700" : "text-amber-700"
                }`}
              >
                {formatIDR(Math.max(0, price - paid))}
              </p>
            </div>
            <div className="sm:col-span-3">
              {invoices.length === 0 ? (
                <p className="text-xs text-gray-400">
                  Belum ada invoice — harga akan terisi dari invoice.
                </p>
              ) : diff === 0 ? (
                <p className="text-xs font-medium text-green-700">
                  Harga cocok dengan {invoices.length} invoice ✓
                </p>
              ) : (
                <p className="text-xs font-medium text-amber-700">
                  Harga belum cocok: total invoice {formatIDR(invoiced)} vs harga{" "}
                  {formatIDR(price)}.
                </p>
              )}
            </div>
          </section>
          <PaymentsCard
            orderId={order.id}
            priceIdr={price}
            payments={payments}
            onChanged={refresh}
            className="lg:flex-1"
          />
          </div>
          <div className="no-print min-w-0">
            <OrderForm
              order={order}
              onSaved={refresh}
              formId="order-edit-form"
              hideSubmit
            />
          </div>
        </div>
        <div className="no-print">
          <OrderFinanceCard order={order} reloadKey={reloadKey} />
        </div>
        </div>
      )}

      {visited.has("invoice") && (
        <div className={tab === "invoice" ? "" : "hidden"}>
          <InvoiceBuilderView orderId={order.id} onInvoiceSaved={refresh} />
        </div>
      )}
      {visited.has("joborder") && (
        <div className={tab === "joborder" ? "" : "hidden"}>
          <JobOrderBuilderView orderId={order.id} />
        </div>
      )}
      {visited.has("itinerary") && (
        <div className={tab === "itinerary" ? "" : "hidden"}>
          <ItineraryBuilderView orderId={order.id} />
        </div>
      )}
      </div>
    </div>
  );
}
