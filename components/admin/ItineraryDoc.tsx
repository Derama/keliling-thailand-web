"use client";

import PrintDoc from "@/components/admin/PrintDoc";
import { formatDate } from "@/lib/admin/utils";
import type { ItineraryDay } from "@/lib/admin/itinerary";

export default function ItineraryDoc({
  tripTitle,
  customer,
  pax,
  notes,
  days,
}: {
  tripTitle: string;
  customer: string;
  pax: string;
  notes: string;
  days: ItineraryDay[];
}) {
  return (
    <PrintDoc title="Itinerary" docNumber={tripTitle || "—"}>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <div>
          {customer && (
            <p>
              <span className="text-gray-500">Untuk: </span>
              <span className="font-semibold">{customer}</span>
            </p>
          )}
          {pax && (
            <p>
              <span className="text-gray-500">Pax: </span>
              {pax}
            </p>
          )}
        </div>
        {tripTitle && (
          <p className="text-right text-lg font-bold text-[#1B2A4A]">
            {tripTitle}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {days.map((d, i) => (
          <section key={d.id} className="overflow-hidden rounded-lg border border-gray-200">
            <div className="flex items-center justify-between bg-[#1B2A4A] px-4 py-2.5 text-white">
              <span className="font-bold">
                Hari {i + 1}
                {d.title ? ` · ${d.title}` : ""}
              </span>
              {d.date && (
                <span className="text-sm font-medium text-[#F5C518]">
                  {formatDate(d.date)}
                </span>
              )}
            </div>
            <ul className="divide-y divide-gray-100">
              {d.activities.map((a) => (
                <li key={a.id} className="flex gap-3 px-4 py-2 text-sm">
                  <span className="min-w-16 font-semibold text-[#1B2A4A]">
                    {a.time || "—"}
                  </span>
                  <span className="flex-1">{a.text || "—"}</span>
                </li>
              ))}
              {d.activities.length === 0 && (
                <li className="px-4 py-2 text-sm text-gray-400">
                  Belum ada kegiatan.
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>

      {notes && (
        <div className="rounded-lg border-l-4 border-[#F5C518] bg-gray-50 p-4 text-sm">
          <p className="mb-1 font-semibold text-[#1B2A4A]">Catatan</p>
          <p className="whitespace-pre-line">{notes}</p>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Keliling Thailand · WhatsApp untuk pertanyaan & pemesanan.
      </p>
    </PrintDoc>
  );
}
