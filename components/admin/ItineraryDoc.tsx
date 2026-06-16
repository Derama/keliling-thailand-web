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

      <div className="space-y-6">
        {days.map((d, i) => (
          <section
            key={d.id}
            className="itin-day overflow-hidden rounded-lg border border-gray-200"
          >
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

            {d.places.length > 0 && (
              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 p-4">
                {d.places.map((p) => (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-lg border border-gray-200"
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
                        {p.name}
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-semibold text-[#1B2A4A]">{p.name}</p>
                      {p.desc && (
                        <p className="mt-0.5 text-xs text-gray-500">{p.desc}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
