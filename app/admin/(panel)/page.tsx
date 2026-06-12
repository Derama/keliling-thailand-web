"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer, Payment } from "@/lib/admin/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/admin/types";
import {
  formatIDR,
  formatTHB,
  formatDate,
  profitTHB,
  isoLocal,
} from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

const ACTIVE = ["confirmed", "ongoing", "completed"] as const;

function monthRange(offset: number): [string, string] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return [isoLocal(start), isoLocal(end)];
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1B2A4A]">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, customers(*)")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders((data as OrderWithCustomer[]) ?? []);
      });
    supabase
      .from("payments")
      .select("*")
      .then(({ data }) => setPayments(data ?? []));
  }, []);

  const active = orders.filter((o) =>
    (ACTIVE as readonly string[]).includes(o.status)
  );

  function monthStats(offset: number) {
    const [start, end] = monthRange(offset);
    const inMonth = active.filter(
      (o) => o.trip_start && o.trip_start >= start && o.trip_start < end
    );
    const revenue = inMonth.reduce((s, o) => s + Number(o.price_idr), 0);
    const profit = inMonth.reduce((s, o) => s + (profitTHB(o) ?? 0), 0);
    return { trips: inMonth.length, revenue, profit };
  }

  const thisMonth = monthStats(0);
  const lastMonth = monthStats(-1);

  const today = isoLocal();
  const upcoming = active
    .filter((o) => o.trip_start && o.trip_start >= today)
    .sort((a, b) => (a.trip_start! < b.trip_start! ? -1 : 1))
    .slice(0, 8);

  const paidByOrder = new Map<string, number>();
  for (const p of payments) {
    paidByOrder.set(
      p.order_id,
      (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount_idr)
    );
  }
  const outstanding = active.filter(
    (o) => Number(o.price_idr) > (paidByOrder.get(o.id) ?? 0)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
      <ErrorNote message={error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Trip bulan ini"
          value={String(thisMonth.trips)}
          sub={`bulan lalu: ${lastMonth.trips}`}
        />
        <StatCard
          label="Omzet bulan ini"
          value={formatIDR(thisMonth.revenue)}
          sub={`bulan lalu: ${formatIDR(lastMonth.revenue)}`}
        />
        <StatCard
          label="Profit bulan ini"
          value={formatTHB(thisMonth.profit)}
          sub={`bulan lalu: ${formatTHB(lastMonth.profit)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-[#1B2A4A]">Trip mendatang</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {upcoming.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between py-2"
              >
                <span>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>{" "}
                  · {o.customers.name}
                </span>
                <span className="text-gray-500">
                  {formatDate(o.trip_start)}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </span>
              </li>
            ))}
            {upcoming.length === 0 && (
              <li className="py-4 text-gray-400">
                Tidak ada trip mendatang.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-[#1B2A4A]">Belum lunas</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {outstanding.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between py-2"
              >
                <span>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>{" "}
                  · {o.customers.name}
                </span>
                <span className="font-medium text-red-700">
                  sisa{" "}
                  {formatIDR(
                    Number(o.price_idr) - (paidByOrder.get(o.id) ?? 0)
                  )}
                </span>
              </li>
            ))}
            {outstanding.length === 0 && (
              <li className="py-4 text-gray-400">Semua order lunas. 🎉</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
