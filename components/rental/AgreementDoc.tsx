"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentalWithRefs, RentalHandover, HandoverDamage } from "@/lib/rental/types";
import { DAMAGE_SEVERITY_LABELS, FUEL_LEVEL_LABELS } from "@/lib/rental/types";
import { RENTAL_TERMS } from "@/lib/rental/terms";
import { formatTHB, formatIDR, formatDate } from "@/lib/admin/utils";
import { convertThbToIdr } from "@/lib/currency";
import { btnCls } from "@/components/admin/ui";

export default function AgreementDoc({ rentalId }: { rentalId: string }) {
  const [rental, setRental] = useState<RentalWithRefs | null>(null);
  const [pickup, setPickup] = useState<RentalHandover | null>(null);
  const [damages, setDamages] = useState<HandoverDamage[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("rentals")
      .select("*, vehicles(*), renters(*)")
      .eq("id", rentalId)
      .single()
      .then(({ data }) => setRental(data as RentalWithRefs));
    supabase
      .from("rental_handovers")
      .select("*")
      .eq("rental_id", rentalId)
      .eq("kind", "out")
      .maybeSingle()
      .then(async ({ data }) => {
        const h = data as RentalHandover | null;
        setPickup(h);
        if (h) {
          const { data: d } = await supabase
            .from("handover_damages")
            .select("*")
            .eq("handover_id", h.id)
            .order("created_at");
          setDamages((d ?? []) as HandoverDamage[]);
        }
      });
  }, [rentalId]);

  if (!rental) return <p className="text-gray-400">Memuat…</p>;

  const totalIdr = convertThbToIdr(rental.total_thb, rental.fx_rate);

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-6 text-sm text-gray-900 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/rental/rentals/${rentalId}`} className="text-sm text-gray-500 hover:underline">
          ← Kembali
        </Link>
        <button onClick={() => window.print()} className={btnCls}>
          Cetak
        </button>
      </div>

      <header className="border-b-2 border-[#1B2A4A] pb-3 text-center">
        <h1 className="text-xl font-bold text-[#1B2A4A]">PERJANJIAN SEWA MOBIL LEPAS KUNCI</h1>
        <p className="text-gray-500">Keliling Thailand · No. {rental.rental_number}</p>
      </header>

      <section className="grid grid-cols-2 gap-x-6 gap-y-1">
        <p><span className="text-gray-500">Penyewa:</span> {rental.renters?.name}</p>
        <p><span className="text-gray-500">Telepon:</span> {rental.renters?.phone ?? "—"}</p>
        <p><span className="text-gray-500">No. SIM:</span> {rental.renters?.license_no ?? "—"}</p>
        <p><span className="text-gray-500">Kendaraan:</span> {rental.vehicles?.name} ({rental.vehicles?.plate})</p>
        <p>
          <span className="text-gray-500">Periode:</span>{" "}
          {formatDate(rental.start_date)} — {formatDate(rental.end_date)} ({rental.days} hari)
        </p>
        <p>
          <span className="text-gray-500">Harga total:</span> {formatTHB(rental.total_thb)}
          {totalIdr != null ? ` ≈ ${formatIDR(totalIdr)}` : ""}
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold text-[#1B2A4A]">Kondisi saat serah terima</h2>
        {pickup ? (
          <>
            <p>
              Odometer: {pickup.odometer_km ?? "—"} km · BBM:{" "}
              {pickup.fuel_level ? FUEL_LEVEL_LABELS[pickup.fuel_level] : "—"} · Oli:{" "}
              {pickup.oil_level === "low" ? "Kurang" : pickup.oil_level ? "OK" : "—"}
            </p>
            {damages.length > 0 ? (
              <ul className="mt-1 list-disc pl-5">
                {damages.map((d) => (
                  <li key={d.id}>
                    {d.panel} — {DAMAGE_SEVERITY_LABELS[d.severity]}
                    {d.note ? ` (${d.note})` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Tidak ada kerusakan tercatat saat serah terima.</p>
            )}
          </>
        ) : (
          <p className="text-gray-500">Serah terima belum dicatat.</p>
        )}
      </section>

      <section>
        <h2 className="mb-1 font-semibold text-[#1B2A4A]">Syarat &amp; ketentuan</h2>
        <ol className="list-decimal space-y-1 pl-5">
          {RENTAL_TERMS.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-2 gap-6 pt-4">
        <div className="text-center">
          <p className="mb-2 text-gray-500">Penyewa</p>
          {pickup?.signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pickup.signature} alt="tanda tangan penyewa" className="mx-auto h-20" />
          ) : (
            <div className="h-20" />
          )}
          <p className="border-t border-gray-300 pt-1">{rental.renters?.name}</p>
        </div>
        <div className="text-center">
          <p className="mb-2 text-gray-500">Pemilik</p>
          <div className="h-20" />
          <p className="border-t border-gray-300 pt-1">Keliling Thailand</p>
        </div>
      </section>

      <p className="text-xs text-gray-400">
        Ditandatangani {pickup ? formatDate(pickup.inspected_at.slice(0, 10)) : "—"} · Versi S&amp;K:{" "}
        {pickup?.terms_version ?? "—"}
      </p>
    </div>
  );
}
