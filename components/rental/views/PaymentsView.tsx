"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalPayment } from "@/lib/rental/types";
import { PAYMENT_KIND_LABELS } from "@/lib/rental/types";
import { formatTHB, formatDate } from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

interface PaymentRow extends RentalPayment {
  rentals: { rental_number: string } | null;
}

export default function PaymentsView() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("rental_payments")
      .select("*, rentals(rental_number)")
      .order("paid_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data as PaymentRow[]) ?? []);
      });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Pembayaran</h1>
      <ErrorNote message={error} />

      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/rental/rentals/${p.rental_id}`}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
          >
            <span>
              <span className="font-medium text-[#1B2A4A]">{p.rentals?.rental_number ?? "—"}</span>
              {" · "}
              {PAYMENT_KIND_LABELS[p.kind]} · {formatDate(p.paid_at.slice(0, 10))}
              {p.method ? ` · ${p.method}` : ""}
            </span>
            <span className={p.kind === "refund" ? "text-red-700" : "text-green-700"}>
              {p.kind === "refund" ? "-" : "+"}{formatTHB(p.amount_thb)}
            </span>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-gray-400">Belum ada pembayaran.</p>
        )}
      </div>
    </div>
  );
}
