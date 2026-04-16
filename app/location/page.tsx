"use client";

import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";

export default function LocationPage() {
  const { language } = useLanguage();
  const loc = extendedTranslations[language].location;

  return (
    <main className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-4">
            {loc.header.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            {loc.header.title}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {loc.header.subtitle}
          </p>
        </div>
      </section>

      {/* City Grid */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-3">
              {loc.cities.eyebrow}
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
              {loc.cities.title}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loc.cities.items.map((city, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 p-6 sm:p-8 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{city.emoji}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {city.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {city.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Note Box */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto rounded-2xl border border-gray-200 p-8 text-center bg-white shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {loc.note.title}
            </h3>
            <p className="text-gray-600 mb-6">{loc.note.desc}</p>
            <a
              href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
              className="whatsapp-btn"
            >
              {loc.note.btn}
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F5C518] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1B2A4A] mb-4">
            {loc.note.title}
          </h2>
          <p className="text-[#1B2A4A]/80 text-lg mb-8 max-w-xl mx-auto">
            {loc.note.desc}
          </p>
          <a
            href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
            className="whatsapp-btn"
          >
            {loc.note.btn}
          </a>
        </div>
      </section>
    </main>
  );
}
