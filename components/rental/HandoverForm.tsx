"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RentalHandover, HandoverKind, FuelLevel } from "@/lib/rental/types";
import { FUEL_LEVELS, FUEL_LEVEL_LABELS } from "@/lib/rental/types";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import Select from "@/components/admin/Select";
import SignaturePad, { type SignaturePadHandle } from "@/components/rental/SignaturePad";
import MediaUpload from "@/components/rental/MediaUpload";
import DamageLog from "@/components/rental/DamageLog";
import { RENTAL_TERMS, TERMS_VERSION } from "@/lib/rental/terms";

const TITLES: Record<HandoverKind, string> = {
  out: "Serah terima (keluar)",
  in: "Pengembalian (masuk)",
};

export default function HandoverForm({
  rentalId,
  kind,
  compareTo,
  onSaved,
}: {
  rentalId: string;
  kind: HandoverKind;
  /** Pickup readings to show alongside, when this is the return panel. */
  compareTo?: RentalHandover | null;
  /** Notifies the parent so it can refresh state derived from this handover. */
  onSaved?: () => void;
}) {
  const [handover, setHandover] = useState<RentalHandover | null>(null);
  const [odo, setOdo] = useState("");
  const [fuel, setFuel] = useState<FuelLevel>("full");
  const [oil, setOil] = useState("ok");
  const [notes, setNotes] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sigRef = useRef<SignaturePadHandle>(null);

  const load = useCallback(() => {
    createClient()
      .from("rental_handovers")
      .select("*")
      .eq("rental_id", rentalId)
      .eq("kind", kind)
      .maybeSingle()
      .then(({ data, error: loadErr }) => {
        if (loadErr) {
          setError(`Gagal memuat: ${loadErr.message}`);
          return;
        }
        const h = data as RentalHandover | null;
        setHandover(h);
        if (h) {
          setOdo(h.odometer_km != null ? String(h.odometer_km) : "");
          setFuel((h.fuel_level as FuelLevel) ?? "full");
          setOil(h.oil_level ?? "ok");
          setNotes(h.notes ?? "");
          setAgreed(h.terms_agreed ?? false);
        } else {
          setAgreed(false);
        }
      });
  }, [rentalId, kind]);

  useEffect(load, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    const signature = sigRef.current?.toDataURL() ?? handover?.signature ?? null;
    const row = {
      rental_id: rentalId,
      kind,
      odometer_km: odo ? Number(odo) : null,
      fuel_level: fuel,
      oil_level: oil || null,
      signature,
      notes: notes.trim() || null,
      ...(kind === "out"
        ? { terms_agreed: agreed, terms_version: TERMS_VERSION }
        : {}),
    };
    const { error } = await createClient()
      .from("rental_handovers")
      .upsert(row, { onConflict: "rental_id,kind" });
    if (error) {
      setError(`Gagal menyimpan: ${error.message}`);
      setBusy(false);
      return;
    }
    setBusy(false);
    load();
    onSaved?.();
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-[#1B2A4A]">{TITLES[kind]}</h2>

      {compareTo && (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Saat keluar: odometer {compareTo.odometer_km ?? "—"} km · bensin{" "}
          {compareTo.fuel_level ? FUEL_LEVEL_LABELS[compareTo.fuel_level] : "—"}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Odometer (km)">
          <input type="number" min="0" value={odo} onChange={(e) => setOdo(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Bensin">
          <Select
            value={fuel}
            onChange={(v) => setFuel(v as FuelLevel)}
            options={FUEL_LEVELS.map((f) => ({ value: f, label: FUEL_LEVEL_LABELS[f] }))}
          />
        </Field>
        <Field label="Oli">
          <Select
            value={oil}
            onChange={setOil}
            options={[
              { value: "ok", label: "OK" },
              { value: "low", label: "Kurang" },
            ]}
          />
        </Field>
      </div>

      <Field label="Catatan umum">
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Catatan tambahan…" />
      </Field>

      {kind === "out" && (
        <div className="space-y-2 rounded-lg border border-gray-200 p-3">
          <details open>
            <summary className="cursor-pointer text-sm font-medium text-[#1B2A4A]">
              Syarat &amp; ketentuan sewa
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-gray-600">
              {RENTAL_TERMS.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </details>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span>Penyewa menyetujui syarat &amp; ketentuan di atas</span>
          </label>
          <p className="text-xs text-gray-400">
            Wajib dicentang sebelum mobil bisa ditandai keluar.
          </p>
        </div>
      )}

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">Tanda tangan penyewa</span>
        {handover?.signature && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={handover.signature} alt="tanda tangan" className="mb-2 h-20 rounded border border-gray-200" />
        )}
        <SignaturePad ref={sigRef} />
      </div>

      <ErrorNote message={error} />
      <button onClick={save} disabled={busy} className={btnCls}>
        {busy ? "Menyimpan…" : handover ? "Perbarui" : "Simpan"}
      </button>

      {handover && (
        <div className="space-y-3 border-t border-gray-100 pt-3">
          <DamageLog
            handoverId={handover.id}
            compareHandoverId={kind === "in" ? compareTo?.id : undefined}
          />
          <MediaUpload handoverId={handover.id} type="photo" label="Foto" />
          <MediaUpload handoverId={handover.id} type="video" label="Video" />
        </div>
      )}
    </section>
  );
}
