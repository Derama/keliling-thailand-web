"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Customer, Order } from "@/lib/admin/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/admin/types";
import { formatIDR, formatDate } from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCustomer(data);
      });
    supabase
      .from("orders")
      .select("*")
      .eq("customer_id", id)
      .order("trip_start", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!customer) return <p className="text-gray-400">Memuat…</p>;

  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.price_idr), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2A4A]">{customer.name}</h1>
        <p className="text-sm text-gray-500">
          {customer.origin_city ?? "—"} ·{" "}
          {customer.phone ? (
            <a
              href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#25D366] hover:underline"
            >
              {customer.phone}
            </a>
          ) : (
            "tanpa nomor"
          )}
        </p>
        {customer.notes && (
          <p className="mt-2 text-sm text-gray-600">{customer.notes}</p>
        )}
      </div>
      <p className="text-sm text-gray-600">
        {orders.length} order · total {formatIDR(totalSpent)}
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Tanggal trip</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Harga</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
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
                <td className="px-4 py-3">{formatDate(o.trip_start)}</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
