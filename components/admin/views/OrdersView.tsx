"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer, OrderStatus } from "@/lib/admin/types";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/admin/types";
import { formatIDR, formatDate } from "@/lib/admin/utils";
import { inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import Modal from "@/components/admin/Modal";
import OrderForm from "@/components/admin/OrderForm";
import OrderDetail from "@/components/admin/OrderDetail";

export default function OrdersView() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<OrderWithCustomer | null>(null);

  const load = useCallback(() => {
    createClient()
      .from("orders")
      .select("*, customers(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders((data as OrderWithCustomer[]) ?? []);
      });
  }, []);

  useEffect(load, [load]);

  async function onDelete(o: OrderWithCustomer) {
    if (
      !confirm(
        `Hapus order ${o.order_number}? Pembayaran, invoice, dan dokumen terkait ikut terhapus. Tindakan ini permanen.`
      )
    )
      return;
    const { error } = await createClient()
      .from("orders")
      .delete()
      .eq("id", o.id);
    if (error) {
      setError(`Gagal menghapus: ${error.message}`);
      return;
    }
    load();
  }

  const filtered = orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (query === "" ||
        o.customers.name.toLowerCase().includes(query.toLowerCase()) ||
        o.order_number.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Order</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={btnCls}
        >
          + Order baru
        </button>
      </div>
      <div className="space-y-3">
        {/* Status filter as chips — one scrollable row on phones (a native
            select there is cramped and inconsistent with the status pills). */}
        <div className="no-scrollbar -mx-4 -mt-1 flex gap-1.5 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {(["all", ...ORDER_STATUSES] as (OrderStatus | "all")[]).map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? s === "all"
                      ? "bg-[#1B2A4A] text-white"
                      : `${STATUS_COLORS[s]} ring-2 ring-[#1B2A4A]/25`
                    : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {s === "all" ? "Semua" : STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
        <input
          placeholder="Cari customer / nomor order…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} sm:max-w-xs`}
        />
      </div>
      <ErrorNote message={error} />

      {/* Phone: card list */}
      <div className="space-y-2 sm:hidden">
        {filtered.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelected(o)}
            className="block w-full rounded-xl border border-gray-200 bg-white p-4 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#1B2A4A]">
                {o.order_number}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}
              >
                {STATUS_LABELS[o.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-700">
              {o.customers.name}
              {o.customers.phone && (
                <span className="text-gray-400"> · {o.customers.phone}</span>
              )}
            </p>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
              <span>
                {formatDate(o.trip_start)}
                {o.trip_end && o.trip_end !== o.trip_start
                  ? ` – ${formatDate(o.trip_end)}`
                  : ""}
              </span>
              <span className="font-semibold text-[#1B2A4A]">
                {formatIDR(Number(o.price_idr))}
              </span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
            Tidak ada order.
          </p>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Telepon</th>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Harga</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                onClick={() => setSelected(o)}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-[#1B2A4A] hover:underline">
                    {o.order_number}
                  </span>
                </td>
                <td className="px-4 py-3">{o.customers.name}</td>
                <td className="px-4 py-3">
                  {o.customers.phone ? (
                    <a
                      href={`https://wa.me/${o.customers.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-[#25D366] hover:underline"
                    >
                      {o.customers.phone}
                    </a>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {formatDate(o.trip_start)}
                  {o.trip_end && o.trip_end !== o.trip_start
                    ? ` – ${formatDate(o.trip_end)}`
                    : ""}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {formatIDR(Number(o.price_idr))}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(o);
                    }}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Tidak ada order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Order baru"
        expanded
        printIsolate
      >
        <OrderForm
          order={null}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      </Modal>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.order_number ?? "Order"}
        wide
        expanded
        printIsolate
      >
        {selected && (
          <OrderDetail
            id={selected.id}
            showHeading={false}
            onChanged={load}
            onDeleted={() => {
              setSelected(null);
              load();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
