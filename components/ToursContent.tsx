"use client";

import { useLanguage } from "@/components/LanguageContext";
import { usePlanBuilder } from "@/components/PlanBuilderContext";
import { cities } from "@/lib/tours";
import CityCard from "@/components/CityCard";

export default function ToursContent() {
  const { t } = useLanguage();
  const { openPlanner } = usePlanBuilder();

  return (
    <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.tours.title}</h1>
      <p className="text-gray-600 mt-2 max-w-2xl">{t.tours.subtitle}</p>
      <button
        onClick={openPlanner}
        className="mt-6 bg-[#F5C518] text-[#1B2A4A] font-bold px-6 py-3 rounded-full hover:brightness-95 transition"
      >
        {t.planner.openButton}
      </button>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {cities.map((c) => (
          <CityCard key={c.id} city={c} />
        ))}
      </div>
    </main>
  );
}
