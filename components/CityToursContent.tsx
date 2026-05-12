"use client";

import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";

const CT_WA = {
  id: "Halo Keliling Thailand! Saya tertarik dengan City Tour. [dari: City Tours Page]",
  en: "Hello Keliling Thailand! I'm interested in City Tours. [from: City Tours Page]",
  th: "สวัสดี Keliling Thailand! ฉันสนใจทัวร์เมือง [จาก: City Tours Page]",
} as const;

export default function CityToursContent() {
  const { language } = useLanguage();
  const ct = extendedTranslations[language].cityTours;

  return (
    <main className="min-h-[100dvh] bg-white pt-20">
      {/* Hero */}
      <section
        style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #253d6b 100%)" }}
        className="relative py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-4">
            {ct.header.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            {ct.header.title}
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            {ct.header.subtitle}
          </p>
        </div>
      </section>

      {/* Tour Packages Grid */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-3">
              {ct.tours.eyebrow}
            </p>
            <h2 className="font-extrabold text-3xl sm:text-4xl text-gray-900">
              {ct.tours.title}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ct.tours.items.map((tour, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 hover:border-[#F5C518] hover:shadow-md transition-all flex flex-col"
              >
                <div className="text-4xl mb-4">{tour.emoji}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {tour.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
                  {tour.desc}
                </p>
                <div className="mt-auto space-y-1.5 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>{tour.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#F5C518] font-bold shrink-0">฿</span>
                    <span className="text-[#F5C518] font-bold">{tour.from}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="bg-amber-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-3">
              {ct.includes.eyebrow}
            </p>
            <h2 className="font-extrabold text-3xl sm:text-4xl text-gray-900">
              {ct.includes.title}
            </h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <ul className="space-y-3">
              {ct.includes.items.map((item, i) => (
                <li key={i} className="flex items-center gap-3 bg-white rounded-xl px-5 py-4 shadow-sm border border-gray-100">
                  <span className="text-[#F5C518] text-lg font-bold flex-shrink-0">✓</span>
                  <span className="text-gray-700 text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-3">
              {ct.notIncluded.eyebrow}
            </p>
            <h2 className="font-extrabold text-3xl sm:text-4xl text-gray-900">
              {ct.notIncluded.title}
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <ul className="space-y-3">
              {ct.notIncluded.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-amber-50/50 px-5 py-4">
                  <span className="mt-0.5 text-[#1B2A4A] font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700 text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Navy CTA */}
      <section className="bg-[#1B2A4A] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-4">
            {ct.header.eyebrow}
          </p>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-white mb-4">
            {ct.cta.title}
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            {ct.cta.subtitle}
          </p>
          <a
            href={`https://wa.me/6285750923934?text=${encodeURIComponent(CT_WA[language])}`}
            className="whatsapp-btn"
          >
            {ct.cta.btn}
          </a>
        </div>
      </section>
    </main>
  );
}
