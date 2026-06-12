"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer, OrderStatus } from "@/lib/admin/types";
import { ErrorNote, btnSecondaryCls } from "@/components/admin/ui";
import { isoLocal } from "@/lib/admin/utils";

const BAR_COLORS: Record<OrderStatus, string> = {
  inquiry: "bg-gray-300 text-gray-800",
  confirmed: "bg-blue-500 text-white",
  ongoing: "bg-[#F5C518] text-[#1B2A4A]",
  completed: "bg-green-500 text-white",
  cancelled: "bg-red-200 text-red-700 line-through",
};

export default function CalendarPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("orders")
      .select("*, customers(*)")
      .not("trip_start", "is", null)
      .neq("status", "cancelled")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders((data as OrderWithCustomer[]) ?? []);
      });
  }, []);

  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstWeekday = (new Date(year, mon, 1).getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      isoLocal(new Date(year, mon, i + 1))
    ),
  ];

  function tripsOn(day: string) {
    return orders.filter(
      (o) => o.trip_start! <= day && day <= (o.trip_end ?? o.trip_start!)
    );
  }

  const monthLabel = month.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const todayIso = isoLocal();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Kalender</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(new Date(year, mon - 1, 1))}
            className={btnSecondaryCls}
          >
            ←
          </button>
          <span className="min-w-40 text-center font-semibold">
            {monthLabel}
          </span>
          <button
            onClick={() => setMonth(new Date(year, mon + 1, 1))}
            className={btnSecondaryCls}
          >
            →
          </button>
        </div>
      </div>
      <ErrorNote message={error} />
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 text-sm">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <div
            key={d}
            className="bg-gray-50 px-2 py-2 text-center font-medium text-gray-500"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`min-h-24 bg-white p-1.5 ${
              day === todayIso ? "ring-2 ring-inset ring-[#F5C518]" : ""
            }`}
          >
            {day && (
              <>
                <p className="text-xs text-gray-400">
                  {Number(day.slice(8))}
                </p>
                <div className="mt-1 space-y-1">
                  {tripsOn(day).map((o) => (
                    <Link
                      key={o.id}
                      href={`/admin/orders/${o.id}`}
                      className={`block truncate rounded px-1.5 py-0.5 text-xs ${BAR_COLORS[o.status]}`}
                      title={`${o.order_number} · ${o.customers.name}`}
                    >
                      {o.customers.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
