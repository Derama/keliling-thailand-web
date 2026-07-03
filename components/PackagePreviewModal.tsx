"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import {
  TourPackage,
  packageTitle,
  cheapestPackagePrice,
} from "@/lib/packages";
import { attractionNames, cityNames } from "@/lib/translations";
import { waLink, fillTemplate } from "@/lib/site";

interface PackagePreviewModalProps {
  pkg: TourPackage;
  onClose: () => void;
}

export default function PackagePreviewModal({
  pkg,
  onClose,
}: PackagePreviewModalProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const title = packageTitle(pkg);
  const price = cheapestPackagePrice(pkg);
  const tagline = t.packages.taglines[pkg.id as keyof typeof t.packages.taglines];
  const waMessage = fillTemplate(t.packages.waMessage, { name: title });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="destination-preview-overlay fixed inset-0 z-[60] flex items-end justify-center bg-[#1B2A4A]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="destination-preview-panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#FEF9EC] shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="relative min-h-52 shrink-0 sm:min-h-60">
          <Image
            src={pkg.image}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 672px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1B2A4A]/85 via-transparent to-[#1B2A4A]/20" />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t.home.destinationPreview.close}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-[#FEF9EC] text-[#1B2A4A] shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2.25} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute inset-x-5 bottom-5 text-white sm:inset-x-7 sm:bottom-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F5C518] px-3 py-1 text-xs font-extrabold text-[#1B2A4A]">
                {fillTemplate(t.packages.durationLong, {
                  days: pkg.days,
                  nights: pkg.nights,
                })}
              </span>
              {pkg.badge && (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-[#1B2A4A]">
                  {t.packages.badges[pkg.badge]}
                </span>
              )}
            </div>
            <h2 id={titleId} className="mt-2 text-2xl font-extrabold sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-white/85">{tagline}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-bold uppercase tracking-wide text-[#1B2A4A]/60">
              {t.tourDetail.itineraryTitle}
            </p>
            {price != null && (
              <p className="shrink-0 font-extrabold text-[#1B2A4A]">
                {t.common.from} {price.toLocaleString()} {t.common.thb}
              </p>
            )}
          </div>

          <ol className="relative mt-4">
            {/* Timeline rail — stops at the last dot. */}
            <span
              aria-hidden="true"
              className="absolute bottom-6 left-[13px] top-3 w-0.5 rounded-full bg-[#F5C518]/40"
            />
            {pkg.itinerary.map((day, i) => {
              const isFirst = i === 0;
              const isLast = i === pkg.itinerary.length - 1;
              return (
                <li
                  key={i}
                  className="package-preview-day relative flex gap-3 pb-4 last:pb-0"
                  style={{ animationDelay: `${120 + i * 45}ms` }}
                >
                  <span className="z-10 mt-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F5C518] text-xs font-extrabold text-[#1B2A4A] shadow-sm">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#1B2A4A]/50">
                      {fillTemplate(t.packages.dayLabel, { day: i + 1 })}
                    </p>
                    <p className="font-bold text-[#1B2A4A]">{cityNames[day.cityId]}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-[#1B2A4A]/70">
                      {day.attractionIds
                        .map((id) => attractionNames[id] ?? id)
                        .join(" · ")}
                    </p>
                    {(isFirst || isLast) && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#1B2A4A]/50">
                        <svg
                          className="h-3.5 w-3.5 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 19h12M12 3l7 11H5l7-11z"
                            transform={isLast ? "rotate(180 12 11)" : undefined}
                          />
                        </svg>
                        {isFirst ? t.packages.arrivalNote : t.packages.departureNote}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Pinned footer — CTAs stay visible while the day list scrolls. */}
        <div className="shrink-0 border-t border-[#1B2A4A]/10 bg-[#FEF9EC] px-5 py-4 sm:px-7">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 font-bold text-[#1B2A4A]/70 transition-colors hover:text-[#1B2A4A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/70"
            >
              {t.home.destinationPreview.close}
            </button>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <a
                href={waLink(waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn justify-center"
              >
                {t.packages.waButton}
              </a>
              <Link
                href={`/tours/packages/${pkg.id}`}
                className="rounded-full bg-[#F5C518] px-6 py-3 text-center font-extrabold text-[#1B2A4A] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1B2A4A]/30"
              >
                {t.home.destinationPreview.viewDetails}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
