"use client";

import { useEffect, useId, useRef } from "react";
import { useLanguage } from "@/components/LanguageContext";
import PackageCard from "@/components/PackageCard";
import { tourPackages } from "@/lib/packages";
import { waLink } from "@/lib/site";

export default function HomePackageBrowserModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
      className="planner-overlay fixed inset-0 z-[70] flex items-end justify-center bg-[#1B2A4A]/80 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="planner-panel flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#FEF9EC] shadow-2xl sm:max-h-[90dvh] sm:max-w-6xl sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#1B2A4A]/10 bg-[#FEF9EC] px-5 py-5 sm:px-8 sm:py-6">
          <div className="min-w-0 text-left">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#B8930A]">
              {t.packages.tabPackages}
            </p>
            <h2
              id={titleId}
              className="mt-1 text-2xl font-extrabold text-[#1B2A4A] sm:text-3xl"
            >
              {t.home.packageBrowser.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#1B2A4A]/65 sm:text-base">
              {t.home.packageBrowser.description}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t.home.packageBrowser.close}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#1B2A4A]/10 bg-white text-[#1B2A4A] transition-[transform,background-color,border-color] duration-150 hover:border-[#F5C518] hover:bg-[#F5C518]/15 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/70"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeWidth={2.25} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          <div className="package-browser-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tourPackages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}

            <a
              href={waLink(t.packages.customWaMessage)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.home.packageBrowser.customAria}
              className="flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#1B2A4A]/25 bg-white/60 p-7 text-center transition-colors hover:border-[#F5C518] hover:bg-[#F5C518]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/70"
            >
              <span className="text-4xl" aria-hidden="true">
                ✨
              </span>
              <h3 className="mt-3 text-lg font-bold text-[#1B2A4A]">
                {t.packages.customTitle}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#1B2A4A]/65">
                {t.packages.customDesc}
              </p>
              <span className="mt-5 rounded-full bg-[#F5C518] px-5 py-2.5 text-sm font-extrabold text-[#1B2A4A]">
                {t.packages.customButton}
              </span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
