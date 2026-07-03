"use client";

import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import {
  getPackage,
  packageTitle,
  cheapestPackagePrice,
  attractionImage,
} from "@/lib/packages";
import { cityNames, attractionNames } from "@/lib/translations";
import { waLink, fillTemplate } from "@/lib/site";

export default function PackageDetailContent({ packageId }: { packageId: string }) {
  const { t } = useLanguage();
  const pkg = getPackage(packageId)!; // page calls notFound() for unknown ids
  const title = packageTitle(pkg);
  const price = cheapestPackagePrice(pkg);
  const tagline = t.packages.taglines[pkg.id as keyof typeof t.packages.taglines];
  const description =
    t.packages.descriptions[pkg.id as keyof typeof t.packages.descriptions];

  const waMessage = fillTemplate(t.packages.waMessage, { name: title });

  return (
    <main className="pt-16">
      <section className="relative h-64 sm:h-80">
        <Image
          src={pkg.image}
          alt={title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#1B2A4A]/50 flex items-end">
          <div className="max-w-6xl mx-auto w-full px-4 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#F5C518] text-[#1B2A4A] text-xs font-bold px-3 py-1 rounded-full">
                {fillTemplate(t.packages.durationLong, {
                  days: pkg.days,
                  nights: pkg.nights,
                })}
              </span>
              {pkg.badge && (
                <span className="bg-white/90 text-[#1B2A4A] text-xs font-bold px-3 py-1 rounded-full">
                  {t.packages.badges[pkg.badge]}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
              {title}
            </h1>
            <p className="text-white/80">{tagline}</p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <p className="text-gray-600">{description}</p>

          <h2 className="text-2xl font-bold text-[#1B2A4A] mt-8 mb-6">
            {t.tourDetail.itineraryTitle}
          </h2>
          <ol className="relative border-l-2 border-[#F5C518] ml-4 space-y-10">
            {pkg.itinerary.map((day, i) => {
              const isFirst = i === 0;
              const isLast = i === pkg.itinerary.length - 1;
              return (
                <li key={i} className="ml-8 relative">
                  <span className="absolute -left-[49px] top-0 w-8 h-8 rounded-full bg-[#F5C518] text-[#1B2A4A] text-sm font-extrabold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="font-bold text-[#1B2A4A]">
                    {fillTemplate(t.packages.dayLabel, { day: i + 1 })} —{" "}
                    {cityNames[day.cityId]}
                  </p>
                  {isFirst && (
                    <p className="text-sm text-gray-500">{t.packages.arrivalNote}</p>
                  )}
                  <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {day.attractionIds.map((attractionId) => {
                      const image = attractionImage(day.cityId, attractionId);
                      return (
                        <li
                          key={attractionId}
                          className="rounded-xl overflow-hidden bg-white shadow-sm"
                        >
                          {image && (
                            <div className="relative h-24">
                              <Image
                                src={image}
                                alt={attractionNames[attractionId]}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 50vw, 20vw"
                              />
                            </div>
                          )}
                          <p className="px-2.5 py-2 text-xs font-semibold text-[#1B2A4A]">
                            {attractionNames[attractionId]}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  {isLast && (
                    <p className="mt-3 text-sm text-gray-500">
                      {t.packages.departureNote}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="grid sm:grid-cols-2 gap-6 mt-10">
            <div>
              <h3 className="font-bold text-[#1B2A4A] mb-2">
                {t.packages.includedTitle}
              </h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {t.packages.includedItems.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-[#1B2A4A] mb-2">
                {t.packages.excludedTitle}
              </h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {t.packages.excludedItems.map((item) => (
                  <li key={item}>✗ {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-[#1B2A4A]">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {pkg.cityIds.map((id) => cityNames[id]).join(" · ")}
          </p>
          {price != null && (
            <p className="mt-3 font-bold text-[#1B2A4A]">
              {t.common.from} {price.toLocaleString()} {t.common.thb}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-3">{t.packages.priceNote}</p>
          <a
            href={waLink(waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-btn w-full mt-4 justify-center"
          >
            {t.packages.waButton}
          </a>
        </aside>
      </section>

      {/* Custom-plan banner: different plan? contact us. */}
      <section className="bg-[#1B2A4A]">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {t.packages.customTitle}
            </h2>
            <p className="text-white/70 mt-1 max-w-xl">{t.packages.customDesc}</p>
          </div>
          <a
            href={waLink(t.packages.customWaMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-btn shrink-0"
          >
            {t.packages.customButton}
          </a>
        </div>
      </section>
    </main>
  );
}
