"use client";

import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { vehicles, cheapestVehiclePrice } from "@/lib/tours";
import { waLink, fillTemplate } from "@/lib/site";

export default function FleetContent() {
  const { t } = useLanguage();

  return (
    <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.fleet.title}</h1>
      <p className="text-gray-600 mt-2 max-w-2xl">{t.fleet.subtitle}</p>

      <div className="grid sm:grid-cols-2 gap-6 mt-10">
        {vehicles.map((v) => {
          const info = t.fleet.vehicles[v.id];
          const price = cheapestVehiclePrice(v.id);
          const msg = fillTemplate(t.fleet.waMessage, { vehicle: t.vehicleNames[v.id] });
          return (
            <div
              key={v.id}
              className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="relative h-52 bg-gray-100">
                <Image
                  src={v.image}
                  alt={info.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <div className="p-5">
                <h2 className="font-bold text-[#1B2A4A] text-lg">{info.name}</h2>
                <p className="text-sm text-gray-500">{info.pax}</p>
                <p className="text-sm text-gray-600 mt-2">{info.desc}</p>
                {price != null && (
                  <p className="mt-3 font-bold text-[#1B2A4A]">
                    {fillTemplate(t.fleet.fromPrice, { price: price.toLocaleString() })}
                  </p>
                )}
                <a
                  href={waLink(msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-btn inline-flex mt-4"
                >
                  {t.common.whatsapp}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-14 rounded-2xl bg-[#1B2A4A] text-white p-8">
        <h2 className="text-2xl font-bold">{t.fleet.airportTitle}</h2>
        <p className="mt-2 text-white/80 max-w-2xl">{t.fleet.airportDesc}</p>
        <a
          href={waLink(t.fleet.airportWaMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn inline-flex mt-5"
        >
          {t.fleet.airportCta}
        </a>
      </section>
    </main>
  );
}
