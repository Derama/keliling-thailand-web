"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalWithRefs } from "@/lib/rental/types";
import { RENTAL_STATUS_LABELS, RENTAL_STATUS_COLORS } from "@/lib/rental/types";
import { formatTHB, formatDate, isoLocal } from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

export default function DashboardView() {
  const [rentals, setRentals] = useState<RentalWithRefs[]>([]);
  const [fleetCount, setFleetCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("rentals")
      .select("*, vehicles(*), renters(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRentals((data as RentalWithRefs[]) ?? []);
      });
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setFleetCount(count ?? 0));
  }, []);

  const today = isoLocal();
  const out = rentals.filter((r) => r.status === "out");
  const dueToday = out.filter((r) => r.end_date === today);
  const overdue = out.filter((r) => r.end_date < today);

  const cards = [
    { label: "Total armada", value: fleetCount },
    { label: "Mobil keluar", value: out.length },
    { label: "Kembali hari ini", value: dueToday.length },
    { label: "Terlambat", value: overdue.length },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
      <ErrorNote message={error} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-2xl font-bold text-[#1B2A4A]">{c.value}</p>
            <p className="text-sm text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-[#1B2A4A]">Sewa terbaru</h2>
        {rentals.slice(0, 8).map((r) => (
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
        {rentals.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
            Belum ada sewa.
          </p>
        )}
      </div>
    </div>
  );
}
