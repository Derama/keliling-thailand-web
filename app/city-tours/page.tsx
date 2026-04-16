"use client";

import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";

export default function CityToursPage() {
  const { language } = useLanguage();
  const ct = extendedTranslations[language].cityTours;

  return (
    <main className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-4">
            {ct.header.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            {ct.header.title}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {ct.header.subtitle}
          </p>
        </div>
      </section>

      {/* Tour Packages Grid */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-3">
              {ct.tours.eyebrow}
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
              {ct.tours.title}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ct.tours.items.map((tour, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 p-6 sm:p-8 hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="text-4xl mb-4">{tour.emoji}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {tour.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
                  {tour.desc}
                </p>
                <div className="mt-auto space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>⏱</span>
                    <span>{tour.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1B2A4A]">
                    <span>💰</span>
                    <span>{tour.from}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-3">
              {ct.includes.eyebrow}
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
              {ct.includes.title}
            </h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <ul className="space-y-4">
              {ct.includes.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 text-[#25D366] text-lg font-bold flex-shrink-0">
                    ✓
                  </span>
                  <span className="text-gray-700 text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F5C518] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1B2A4A] mb-4">
            {ct.cta.title}
          </h2>
          <p className="text-[#1B2A4A]/80 text-lg mb-8 max-w-xl mx-auto">
            {ct.cta.subtitle}
          </p>
          <a
            href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
            className="whatsapp-btn"
          >
            {ct.cta.btn}
          </a>
        </div>
      </section>
    </main>
  );
}
