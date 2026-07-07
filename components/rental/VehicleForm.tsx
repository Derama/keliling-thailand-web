"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle, VehicleStatus } from "@/lib/rental/types";
import { VEHICLE_STATUSES, VEHICLE_STATUS_LABELS } from "@/lib/rental/types";
import Select from "@/components/admin/Select";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

interface Draft {
  plate: string;
  name: string;
  type: string;
  daily_rate_thb: string;
  status: VehicleStatus;
  notes: string;
}

function toDraft(v: Vehicle | null): Draft {
  return {
    plate: v?.plate ?? "",
    name: v?.name ?? "",
    type: v?.type ?? "",
    daily_rate_thb: v ? String(v.daily_rate_thb) : "",
    status: v?.status ?? "available",
    notes: v?.notes ?? "",
  };
}

export default function VehicleForm({
  vehicle,
  onSaved,
  onCancel,
}: {
  vehicle: Vehicle | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(vehicle));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const row = {
      plate: draft.plate.trim(),
      name: draft.name.trim(),
      type: draft.type.trim() || null,
      daily_rate_thb: Number(draft.daily_rate_thb) || 0,
      deposit_thb: 0,
      status: draft.status,
      notes: draft.notes.trim() || null,
    };
    const supabase = createClient();
    const { error } = vehicle
      ? await supabase.from("vehicles").update(row).eq("id", vehicle.id)
      : await supabase.from("vehicles").insert(row);
    if (error) {
      setError(`Gagal menyimpan: ${error.message}`);
      setBusy(false);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-[#1B2A4A]">
        {vehicle ? "Edit mobil" : "Tambah mobil"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plat nomor">
          <input required value={draft.plate} onChange={(e) => set("plate", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Nama / model">
          <input required value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Toyota Vios 2022" />
        </Field>
        <Field label="Tarif / hari (THB)">
          <input type="number" min="0" value={draft.daily_rate_thb} onChange={(e) => set("daily_rate_thb", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set("status", v as VehicleStatus)}
            options={VEHICLE_STATUSES.map((s) => ({ value: s, label: VEHICLE_STATUS_LABELS[s] }))}
          />
        </Field>
        <Field label="Tipe">
          <input value={draft.type} onChange={(e) => set("type", e.target.value)} className={inputCls} placeholder="Sedan / SUV" />
        </Field>
      </div>
      <Field label="Catatan">
        <textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
      </Field>
      <ErrorNote message={error} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondaryCls}>
          Batal
        </button>
      </div>
    </form>
  );
}
