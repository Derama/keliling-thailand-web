"use client";

import { useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { getCity, availableVehicles, VehicleId } from "@/lib/tours";
import { cityNames, attractionNames } from "@/lib/translations";
import { waLink, fillTemplate } from "@/lib/site";

export default function TourDetailContent({ cityId }: { cityId: string }) {
  const { t } = useLanguage();
  const city = getCity(cityId)!; // page calls notFound() for unknown cities
  const vehicleOptions = availableVehicles(cityId);
  const [selected, setSelected] = useState<VehicleId>(vehicleOptions[0].id);

  const waMessage = fillTemplate(t.tourDetail.waMessage, {
    city: cityNames[cityId],
    duration: city.durationHours,
    vehicle: t.vehicleNames[selected],
  });

  return (
    <main className="pt-16">
      <section className="relative h-64 sm:h-80">
        <Image
          src={city.image}
          alt={cityNames[cityId]}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#1B2A4A]/50 flex items-end">
          <div className="max-w-6xl mx-auto w-full px-4 pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              {cityNames[cityId]}
            </h1>
            <p className="text-white/80">
              {t.tourDetail.duration}: {city.durationHours} {t.common.hours}
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2A4A] mb-4">
            {t.tourDetail.itineraryTitle}
          </h2>
          <ol className="relative border-l-2 border-[#F5C518] ml-2 space-y-4">
            {city.attractions.map((a) => (
              <li key={a.id} className="ml-5 relative">
                <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[#F5C518]" />
                <p className="font-semibold text-[#1B2A4A]">{attractionNames[a.id]}</p>
                <p className="text-sm text-gray-500">
                  ±{a.hours} {t.common.hours}
                </p>
              </li>
            ))}
          </ol>

          <div className="grid sm:grid-cols-2 gap-6 mt-10">
            <div>
              <h3 className="font-bold text-[#1B2A4A] mb-2">{t.tourDetail.includedTitle}</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {t.tourDetail.includedItems.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-[#1B2A4A] mb-2">{t.tourDetail.excludedTitle}</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {t.tourDetail.excludedItems.map((item) => (
                  <li key={item}>✗ {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-[#1B2A4A] mb-3">{t.tourDetail.chooseVehicle}</h2>
          <div className="space-y-2">
            {vehicleOptions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                  selected === v.id
                    ? "border-[#F5C518] bg-[#F5C518]/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span>
                  <span className="block font-semibold text-[#1B2A4A]">
                    {t.vehicleNames[v.id]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {v.pax} {t.common.pax}
                  </span>
                </span>
                <span className="font-bold text-[#1B2A4A]">
                  {city.prices[v.id]!.toLocaleString()} {t.common.thb}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">{t.tourDetail.priceNote}</p>
          <a
            href={waLink(waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-btn w-full mt-4 justify-center"
          >
            {t.tourDetail.waButton}
          </a>
        </aside>
      </section>
    </main>
  );
}
