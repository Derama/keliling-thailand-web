"use client";

import { useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import ThbIdrConverter from "@/components/ThbIdrConverter";
import { vehicles, cheapestVehiclePrice, type Vehicle } from "@/lib/tours";
import {
  PUBLIC_FLEET_KEYS,
  PUBLIC_PRICE_GROUPS,
} from "@/lib/publicPriceBook";
import { waLink, fillTemplate } from "@/lib/site";

/** Photo area for one vehicle. Renders a slider when the vehicle has a gallery. */
function VehicleGallery({ vehicle }: { vehicle: Vehicle }) {
  const slides = vehicle.images ?? [vehicle.image];
  const labels = vehicle.imageLabels ?? [];
  const [i, setI] = useState(0);
  const many = slides.length > 1;
  const go = (next: number) => setI((next + slides.length) % slides.length);

  return (
    <div className="relative h-52 bg-gray-100">
      {slides.map((src, idx) => (
        <Image
          key={src}
          src={src}
          alt={labels[idx] ?? ""}
          fill
          className={`object-contain transition-opacity duration-500 ${
            idx === i ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 640px) 100vw, 50vw"
        />
      ))}

      {many && (
        <>
          {labels[i] && (
            <span className="absolute top-2 left-2 rounded-full bg-[#1B2A4A]/80 text-white text-xs font-medium px-2.5 py-1">
              {labels[i]}
            </span>
          )}
          <button
            type="button"
            onClick={() => go(i - 1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-full bg-white/85 text-[#1B2A4A] shadow hover:bg-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(i + 1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-full bg-white/85 text-[#1B2A4A] shadow hover:bg-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Photo ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-5 bg-[#1B2A4A]" : "w-1.5 bg-[#1B2A4A]/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function FleetContent() {
  const { language, t } = useLanguage();
  const numberLocale =
    language === "id" ? "id-ID" : language === "th" ? "th-TH" : "en-US";

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
              <VehicleGallery vehicle={v} />
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
                  aria-label={`${t.common.whatsapp} – ${info.name}`}
                  className="whatsapp-btn inline-flex mt-4"
                >
                  {t.common.whatsapp}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-16" aria-labelledby="complete-price-list">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B28716]">
              2026
            </p>
            <h2
              id="complete-price-list"
              className="mt-1 text-3xl font-extrabold text-[#1B2A4A]"
            >
              {t.fleet.priceList.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t.fleet.priceList.subtitle}
            </p>
          </div>
          <p className="text-sm font-semibold text-[#1B2A4A]">
            {t.fleet.priceList.included}
          </p>
        </div>

        <div className="mt-7 space-y-5">
          {PUBLIC_PRICE_GROUPS.map((group) => (
            <div
              key={group.id}
              className="overflow-hidden rounded-2xl border border-[#1B2A4A]/25 bg-[#FEF9EC]"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <caption className="sr-only">
                    {t.fleet.priceList.groups[group.id]}
                  </caption>
                  <thead>
                    <tr className="bg-[#1B2A4A] text-center text-[#FEF9EC]">
                      <th
                        scope="col"
                        className="w-[34%] px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.12em]"
                      >
                        <span className="block text-[#F5C518]">
                          {t.fleet.priceList.groups[group.id]}
                        </span>
                        <span className="mt-1 block text-[10px] font-medium tracking-[0.08em] text-[#FEF9EC]/65">
                          {t.fleet.priceList.route}
                        </span>
                      </th>
                      {PUBLIC_FLEET_KEYS.map((fleet) => (
                        <th
                          key={fleet}
                          scope="col"
                          className="w-[11%] px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.08em]"
                        >
                          {t.fleet.priceList.fleet[fleet]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.services.map((service) => {
                      const detail = t.fleet.priceList.details[service.id];

                      return (
                        <tr
                          key={service.id}
                          className="border-t border-[#1B2A4A]/10 transition-colors hover:bg-[#F5C518]/8"
                        >
                          <th
                            scope="row"
                            className="px-5 py-4 text-center font-bold text-[#1B2A4A]"
                          >
                            {t.fleet.priceList.routes[service.id]}
                            {detail && (
                              <span className="mt-1 block text-xs font-normal text-gray-500">
                                {detail}
                              </span>
                            )}
                          </th>
                          {PUBLIC_FLEET_KEYS.map((fleet) => {
                            const price = service.prices?.[fleet];

                            return (
                              <td
                                key={fleet}
                                className="px-3 py-4 text-center font-semibold tabular-nums text-[#1B2A4A]"
                              >
                                {price != null ? (
                                  <>
                                    <span className="mr-0.5 text-xs font-medium text-[#B28716]">
                                      ฿
                                    </span>
                                    {price.toLocaleString(numberLocale)}
                                  </>
                                ) : (
                                  <span className="inline-block max-w-24 text-xs font-bold leading-snug text-[#9A7113]">
                                    {t.fleet.priceList.contact}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <ThbIdrConverter />
      </section>

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
