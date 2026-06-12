"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { City, cheapestPrice } from "@/lib/tours";
import { attractionNames, cityNames } from "@/lib/translations";

interface DestinationPreviewModalProps {
  city: City;
  onClose: () => void;
}

export default function DestinationPreviewModal({
  city,
  onClose,
}: DestinationPreviewModalProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const name = cityNames[city.id] ?? city.id;
  const price = cheapestPrice(city.id);

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
        <div className="relative min-h-52 sm:min-h-64">
          <Image
            src={city.image}
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
            <h2 id={titleId} className="text-3xl font-extrabold">
              {name}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              {city.durationHours} {t.common.hours} · {city.attractions.length}{" "}
              {t.tours.attractions}
            </p>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold uppercase text-[#1B2A4A]/60">
              {t.home.destinationPreview.highlights}
            </p>
            {price != null && (
              <p className="shrink-0 font-extrabold text-[#1B2A4A]">
                {t.common.from} {price.toLocaleString()} {t.common.thb}
              </p>
            )}
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {city.attractions.slice(0, 4).map((attraction) => (
              <li
                key={attraction.id}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-[#1B2A4A]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#F5C518]" />
                {attractionNames[attraction.id] ?? attraction.id}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 font-bold text-[#1B2A4A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/70"
            >
              {t.home.destinationPreview.close}
            </button>
            <Link
              href={`/tours/${city.id}`}
              className="rounded-full bg-[#F5C518] px-6 py-3 text-center font-extrabold text-[#1B2A4A] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1B2A4A]/30"
            >
              {t.home.destinationPreview.viewDetails}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
