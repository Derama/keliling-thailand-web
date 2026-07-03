"use client";

import { useCallback, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { usePlanBuilder } from "@/components/PlanBuilderContext";
import { cities } from "@/lib/tours";
import { tourPackages, TourPackage } from "@/lib/packages";
import { waLink } from "@/lib/site";
import CityCard from "@/components/CityCard";
import PackageCard from "@/components/PackageCard";
import PackagePreviewModal from "@/components/PackagePreviewModal";

type Tab = "packages" | "daily";

export default function ToursContent() {
  const { t } = useLanguage();
  const { openPlanner } = usePlanBuilder();
  const [tab, setTab] = useState<Tab>("packages");
  const [packagePreview, setPackagePreview] = useState<{
    pkg: TourPackage;
    trigger: HTMLButtonElement;
  } | null>(null);

  const closePackagePreview = useCallback(() => {
    const trigger = packagePreview?.trigger;
    setPackagePreview(null);
    window.requestAnimationFrame(() => trigger?.focus());
  }, [packagePreview]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "packages", label: t.packages.tabPackages },
    { id: "daily", label: t.packages.tabDaily },
  ];

  return (
    <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.packages.title}</h1>
      <p className="text-gray-600 mt-2 max-w-2xl">{t.packages.subtitle}</p>

      <div
        role="tablist"
        className="mt-6 inline-flex rounded-full bg-gray-100 p-1"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
              tab === item.id
                ? "bg-[#1B2A4A] text-white shadow"
                : "text-[#1B2A4A] hover:bg-gray-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "packages" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {tourPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onSelect={(selected, trigger) =>
                setPackagePreview({ pkg: selected, trigger })
              }
            />
          ))}
          {/* Custom-package card: users with a different plan contact us directly. */}
          <a
            href={waLink(t.packages.customWaMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-[#1B2A4A]/30 bg-[#1B2A4A]/[0.03] p-8 hover:border-[#F5C518] hover:bg-[#F5C518]/10 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/70"
          >
            <span className="text-4xl" aria-hidden="true">
              ✨
            </span>
            <h3 className="mt-3 font-bold text-[#1B2A4A] text-lg">
              {t.packages.customTitle}
            </h3>
            <p className="mt-2 text-sm text-gray-600">{t.packages.customDesc}</p>
            <span className="whatsapp-btn mt-5">{t.packages.customButton}</span>
          </a>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {cities.map((c) => (
              <CityCard
                key={c.id}
                city={c}
                onPlan={(city) => openPlanner(city.id)}
              />
            ))}
          </div>
          <section className="mt-12 border-t border-[#1B2A4A]/10 pt-8 text-center">
            <h2 className="text-2xl font-extrabold text-[#1B2A4A]">
              {t.packages.multiDayTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-gray-600">
              {t.packages.multiDayDesc}
            </p>
            <button
              type="button"
              onClick={() => openPlanner()}
              className="mt-5 rounded-full border-2 border-[#1B2A4A] px-6 py-3 font-bold text-[#1B2A4A] transition-colors hover:bg-[#1B2A4A] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/70"
            >
              {t.packages.multiDayButton}
            </button>
          </section>
        </>
      )}

      {packagePreview && (
        <PackagePreviewModal
          pkg={packagePreview.pkg}
          onClose={closePackagePreview}
        />
      )}
    </main>
  );
}
