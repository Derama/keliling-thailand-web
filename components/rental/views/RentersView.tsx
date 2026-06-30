"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Renter } from "@/lib/rental/types";
import { btnCls, inputCls, ErrorNote } from "@/components/admin/ui";
import RenterForm from "@/components/rental/RenterForm";

export default function RentersView() {
  const [renters, setRenters] = useState<Renter[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Renter | null | undefined>(undefined);

  const load = useCallback(() => {
    createClient()
      .from("renters")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRenters(data ?? []);
      });
  }, []);

  useEffect(load, [load]);

  if (editing !== undefined) {
    return (
      <RenterForm
        renter={editing}
        onSaved={() => {
          setEditing(undefined);
          load();
        }}
        onCancel={() => setEditing(undefined)}
      />
    );
  }

  const filtered = renters.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Penyewa</h1>
        <button onClick={() => setEditing(null)} className={btnCls}>
          + Penyewa
        </button>
      </div>
      <input
        placeholder="Cari nama…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${inputCls} max-w-sm`}
      />
      <ErrorNote message={error} />

      <div className="space-y-2">
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => setEditing(r)}
            className="block w-full rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[#1B2A4A]"
          >
            <span className="font-semibold text-[#1B2A4A]">{r.name}</span>
            <div className="mt-1 text-sm text-gray-500">
              {r.phone ?? "—"} · SIM {r.license_no ?? "—"} · {r.origin_city ?? "—"}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
            Belum ada penyewa.
          </p>
        )}
      </div>
    </div>
  );
}
