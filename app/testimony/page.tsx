"use client";

import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations, translations } from "@/lib/translations";

export default function TestimonyPage() {
  const { language } = useLanguage();
  const testimony = extendedTranslations[language].testimony;
  const featured = translations[language].testimonialItems;
  const more = translations[language].moreTestimonialItems;

  return (
    <main className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-4">
            {testimony.header.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            {testimony.header.title}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {testimony.header.subtitle}
          </p>
        </div>
      </section>

      {/* Featured Testimonials */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {featured.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 p-6 sm:p-8 flex flex-col shadow-sm"
              >
                <div className="flex mb-4">
                  {Array.from({ length: item.stars }).map((_, s) => (
                    <span key={s} className="text-[#F5C518] text-xl">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed flex-1 mb-6">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* More Testimonials Grid */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {more.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 p-6 bg-white hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex">
                    {Array.from({ length: item.stars }).map((_, s) => (
                      <span key={s} className="text-[#F5C518] text-sm">
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-white bg-[#1B2A4A] px-2 py-1 rounded-full font-medium">
                    {item.service}
                  </span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-4">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F5C518] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1B2A4A] mb-4">
            {testimony.header.title}
          </h2>
          <p className="text-[#1B2A4A]/80 text-lg mb-8 max-w-xl mx-auto">
            {testimony.header.subtitle}
          </p>
          <a
            href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
            className="whatsapp-btn"
          >
            Chat WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
