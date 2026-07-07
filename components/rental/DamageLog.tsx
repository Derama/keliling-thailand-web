"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HandoverDamage, DamageSeverity } from "@/lib/rental/types";
import {
  DAMAGE_PANELS,
  DAMAGE_SEVERITIES,
  DAMAGE_SEVERITY_LABELS,
} from "@/lib/rental/types";
import Select from "@/components/admin/Select";
import { inputCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

const BUCKET = "rental-media";

type Item = { damage: HandoverDamage; url: string | null };

async function loadDamages(handoverId: string): Promise<Item[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("handover_damages")
    .select("*")
    .eq("handover_id", handoverId)
    .order("created_at");
  const damages = (data ?? []) as HandoverDamage[];
  return Promise.all(
    damages.map(async (d) => {
      if (!d.photo_path) return { damage: d, url: null };
      const { data: s } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(d.photo_path, 3600);
      return { damage: d, url: s?.signedUrl ?? null };
    })
  );
}

function DamageList({
  items,
  onDelete,
}: {
  items: Item[];
  onDelete?: (d: HandoverDamage) => void;
}) {
  if (items.length === 0)
    return <p className="text-xs text-gray-400">Tidak ada kerusakan tercatat.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {items.map(({ damage, url }) => (
        <li key={damage.id} className="flex items-center gap-3 py-2 text-sm">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={damage.panel} className="h-12 w-12 rounded object-cover" />
          ) : (
            <span className="h-12 w-12 rounded bg-gray-100" />
          )}
          <span className="flex-1">
            <span className="font-medium">{damage.panel}</span>
            {" · "}
            {DAMAGE_SEVERITY_LABELS[damage.severity]}
            {damage.note ? <span className="text-gray-500"> — {damage.note}</span> : null}
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(damage)}
              className="px-2 py-2 text-xs text-red-600 hover:underline"
            >
              Hapus
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function DamageLog({
  handoverId,
  compareHandoverId,
}: {
  handoverId: string;
  /** Pickup handover id — shows its damages read-only for comparison. */
  compareHandoverId?: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [compareItems, setCompareItems] = useState<Item[]>([]);
  const [panel, setPanel] = useState(DAMAGE_PANELS[0]);
  const [severity, setSeverity] = useState<DamageSeverity>("lecet");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    loadDamages(handoverId)
      .then(setItems)
      .catch((e: Error) => setError(`Gagal memuat: ${e.message}`));
    if (compareHandoverId) {
      setCompareItems([]);
      loadDamages(compareHandoverId)
        .then(setCompareItems)
        .catch((e: Error) => setError(`Gagal memuat: ${e.message}`));
    }
  }, [handoverId, compareHandoverId]);

  // Intentional: `load` clears the stale compare list synchronously when ids change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [load]);

  async function add() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    let photoPath: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      photoPath = `damages/${handoverId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(photoPath, file);
      if (upErr) {
        setError(`Gagal unggah foto: ${upErr.message}`);
        setBusy(false);
        return;
      }
    }
    const { error: insErr } = await supabase.from("handover_damages").insert({
      handover_id: handoverId,
      panel,
      severity,
      note: note.trim() || null,
      photo_path: photoPath,
    });
    if (insErr) {
      if (photoPath) await supabase.storage.from(BUCKET).remove([photoPath]);
      setError(`Gagal simpan: ${insErr.message}`);
      setBusy(false);
      return;
    }
    setNote("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
    load();
  }

  async function remove(d: HandoverDamage) {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("handover_damages").delete().eq("id", d.id);
    if (error) {
      setError(`Gagal hapus: ${error.message}`);
      setBusy(false);
      return;
    }
    if (d.photo_path) await supabase.storage.from(BUCKET).remove([d.photo_path]);
    load();
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {compareHandoverId && (
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium text-gray-500">
            Kerusakan saat keluar (pembanding)
          </p>
          <DamageList items={compareItems} />
        </div>
      )}

      <span className="block text-sm font-medium text-gray-700">Catatan kerusakan</span>
      <DamageList items={items} onDelete={busy ? undefined : remove} />

      <div className="grid gap-2 sm:grid-cols-4 sm:items-end">
        <Select
          value={panel}
          onChange={setPanel}
          options={DAMAGE_PANELS.map((p) => ({ value: p, label: p }))}
        />
        <Select
          value={severity}
          onChange={(v) => setSeverity(v as DamageSeverity)}
          options={DAMAGE_SEVERITIES.map((s) => ({ value: s, label: DAMAGE_SEVERITY_LABELS[s] }))}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputCls}
          placeholder="Catatan (opsional)"
        />
        <div className="flex items-center gap-2">
          <label className={`${btnSecondaryCls} cursor-pointer text-xs`}>
            {file ? "1 foto" : "Foto"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          <button type="button" onClick={add} disabled={busy} className={`${btnSecondaryCls} text-xs`}>
            {busy ? "Menyimpan…" : "+ Tambah"}
          </button>
        </div>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
