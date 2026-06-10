"use client";

import { useLanguage } from "@/components/LanguageContext";
import { cities } from "@/lib/tours";
import CityCard from "@/components/CityCard";

export default function ToursContent() {
  const { t } = useLanguage();

  return (
    <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.tours.title}</h1>
      <p className="text-gray-600 mt-2 max-w-2xl">{t.tours.subtitle}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {cities.map((c) => (
          <CityCard key={c.id} city={c} />
        ))}
      </div>
    </main>
  );
}
