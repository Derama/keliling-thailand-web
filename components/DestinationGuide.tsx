"use client";

import { useLanguage } from "@/components/LanguageContext";
import { getCity, cheapestPrice } from "@/lib/tours";
import { cityNames } from "@/lib/translations";
import { fillTemplate } from "@/lib/site";

// SEO content section for /tours/[city]: destination intro, trip facts,
// price table, and FAQ. The Indonesian default renders on the server, so
// crawlers index it; the FAQPage JSON-LD lives in the page route.
export default function DestinationGuide({ cityId }: { cityId: string }) {
  const { t } = useLanguage();
  const city = getCity(cityId)!;
  const g = t.destinationGuide;
  const name = cityNames[cityId];
  const intro =
    (g.intros as Record<string, readonly string[]>)[cityId] ?? [];
  const vars = {
    city: name,
    minPrice: (cheapestPrice(cityId) ?? 0).toLocaleString(),
    duration: city.durationHours,
  };

  return (
    <section className="max-w-6xl mx-auto px-4 pb-14 space-y-12">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-[#1B2A4A] mb-4">
          {fillTemplate(g.aboutTitle, vars)}
        </h2>
        {intro.map((p) => (
          <p key={p.slice(0, 32)} className="text-gray-600 leading-relaxed mb-3">
            {p}
          </p>
        ))}

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {city.driveFromBangkok && (
            <>
              <div className="rounded-xl bg-gray-50 p-4">
                <dt className="text-xs text-gray-500">{g.factDistance}</dt>
                <dd className="font-bold text-[#1B2A4A]">
                  ±{city.driveFromBangkok.km} km
                </dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <dt className="text-xs text-gray-500">{g.factDriveTime}</dt>
                <dd className="font-bold text-[#1B2A4A]">
                  ±{city.driveFromBangkok.hours} {t.common.hours}
                </dd>
              </div>
            </>
          )}
          <div className="rounded-xl bg-gray-50 p-4">
            <dt className="text-xs text-gray-500">{g.factDuration}</dt>
            <dd className="font-bold text-[#1B2A4A]">
              {city.durationHours} {t.common.hours}
            </dd>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 col-span-2 sm:col-span-1">
            <dt className="text-xs text-gray-500">{g.factPickup}</dt>
            <dd className="font-bold text-[#1B2A4A] text-sm leading-snug">
              {g.factPickupValue}
            </dd>
          </div>
        </dl>
      </div>

      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-[#1B2A4A] mb-4">{g.faqTitle}</h2>
        <div className="space-y-3">
          {g.faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-xl border border-gray-200 px-5 py-4"
            >
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-[#1B2A4A]">
                {fillTemplate(faq.q, vars)}
                <span className="text-[#F5C518] transition-transform group-open:rotate-45 text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="text-gray-600 text-sm leading-relaxed mt-3">
                {fillTemplate(faq.a, vars)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
