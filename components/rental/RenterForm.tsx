"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Renter } from "@/lib/rental/types";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

interface Draft {
  name: string;
  phone: string;
  license_no: string;
  origin_city: string;
  notes: string;
}

function toDraft(r: Renter | null): Draft {
  return {
    name: r?.name ?? "",
    phone: r?.phone ?? "",
    license_no: r?.license_no ?? "",
    origin_city: r?.origin_city ?? "",
    notes: r?.notes ?? "",
  };
}

export default function RenterForm({
  renter,
  onSaved,
  onCancel,
}: {
  renter: Renter | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(renter));
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
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      license_no: draft.license_no.trim() || null,
      origin_city: draft.origin_city.trim() || null,
      notes: draft.notes.trim() || null,
    };
    const supabase = createClient();
    const { error } = renter
      ? await supabase.from("renters").update(row).eq("id", renter.id)
      : await supabase.from("renters").insert(row);
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
        {renter ? "Edit penyewa" : "Tambah penyewa"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama">
          <input required value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="WhatsApp">
          <input value={draft.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="628…" />
        </Field>
        <Field label="No. SIM">
          <input value={draft.license_no} onChange={(e) => set("license_no", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Kota asal">
          <input value={draft.origin_city} onChange={(e) => set("origin_city", e.target.value)} className={inputCls} />
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
