"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle } from "@/lib/rental/types";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS } from "@/lib/rental/types";
import { formatTHB } from "@/lib/admin/utils";
import { btnCls, ErrorNote } from "@/components/admin/ui";
import VehicleForm from "@/components/rental/VehicleForm";

export default function VehiclesView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined);
  // undefined = form closed; null = adding new; Vehicle = editing

  const load = useCallback(() => {
    createClient()
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setVehicles(data ?? []);
      });
  }, []);

  useEffect(load, [load]);

  if (editing !== undefined) {
    return (
      <VehicleForm
        vehicle={editing}
        onSaved={() => {
          setEditing(undefined);
          load();
        }}
        onCancel={() => setEditing(undefined)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Armada</h1>
        <button onClick={() => setEditing(null)} className={btnCls}>
          + Mobil
        </button>
      </div>
      <ErrorNote message={error} />

      <div className="grid gap-2 sm:grid-cols-2">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => setEditing(v)}
            className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[#1B2A4A]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#1B2A4A]">{v.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VEHICLE_STATUS_COLORS[v.status]}`}>
                {VEHICLE_STATUS_LABELS[v.status]}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {v.plate} · {formatTHB(v.daily_rate_thb)}/hari
            </div>
          </button>
        ))}
        {vehicles.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400 sm:col-span-2">
            Belum ada mobil. Tekan &ldquo;+ Mobil&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
