"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalWithRefs, RentalStatus } from "@/lib/rental/types";
import { RENTAL_STATUSES, RENTAL_STATUS_LABELS, RENTAL_STATUS_COLORS } from "@/lib/rental/types";
import { formatTHB, formatDate } from "@/lib/admin/utils";
import { btnCls, ErrorNote } from "@/components/admin/ui";

export default function RentalsView() {
  const [rentals, setRentals] = useState<RentalWithRefs[]>([]);
  const [filter, setFilter] = useState<RentalStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("rentals")
      .select("*, vehicles(*), renters(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRentals((data as RentalWithRefs[]) ?? []);
      });
  }, []);

  const shown = filter === "all" ? rentals : rentals.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Sewa</h1>
        <Link href="/rental/rentals/new" className={btnCls}>
          + Sewa baru
        </Link>
      </div>

      <div className="flex flex-wrap gap-1">
        {(["all", ...RENTAL_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === s ? "bg-[#1B2A4A] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {s === "all" ? "Semua" : RENTAL_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />

      <div className="space-y-2">
        {shown.map((r) => (
          <Link
            key={r.id}
            href={`/rental/rentals/${r.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-[#1B2A4A]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#1B2A4A]">
                {r.rental_number} · {r.vehicles?.name}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RENTAL_STATUS_COLORS[r.status]}`}>
                {RENTAL_STATUS_LABELS[r.status]}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {r.renters?.name} · {formatDate(r.start_date)} → {formatDate(r.end_date)} · {formatTHB(r.total_thb)}
            </div>
          </Link>
        ))}
        {shown.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
            Belum ada sewa.
          </p>
        )}
      </div>
    </div>
  );
}
