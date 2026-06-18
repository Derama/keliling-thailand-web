"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

export default function OrdersView() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
          className={`${inputCls} w-auto`}
        >
          <option value="all">Semua status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          placeholder="Cari customer / nomor order…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} max-w-xs`}
        />
      </div>
      <ErrorNote message={error} />

      {/* Phone: card list */}
      <div className="space-y-2 sm:hidden">
        {filtered.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4"
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
            <p className="mt-1 text-sm text-gray-700">{o.customers.name}</p>
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
          </Link>
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
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Harga</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.customers.name}</td>
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
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
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
      >
        <OrderForm
          order={null}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}
