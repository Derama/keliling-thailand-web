"use client";

import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";

export default function AboutPage() {
  const { language } = useLanguage();
  const about = extendedTranslations[language].about;

  return (
    <main className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-4">
            {about.header.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            {about.header.title}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {about.header.subtitle}
          </p>
        </div>
      </section>

      {/* Company Story */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-3">
              {about.story.eyebrow}
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10">
              {about.story.title}
            </h2>
            <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
              <p>{about.story.p1}</p>
              <p>{about.story.p2}</p>
              <p>{about.story.p3}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#1B2A4A] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {about.stats.map((stat, i) => (
              <div key={i}>
                <div className="text-4xl sm:text-5xl font-extrabold text-[#F5C518] mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-300 text-sm font-medium uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Grid */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-3">
              {about.values.eyebrow}
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
              {about.values.title}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {about.values.items.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 p-6 sm:p-8 bg-gray-50 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F5C518] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1B2A4A] mb-4">
            {about.cta.title}
          </h2>
          <p className="text-[#1B2A4A]/80 text-lg mb-8 max-w-xl mx-auto">
            {about.cta.subtitle}
          </p>
          <a
            href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
            className="whatsapp-btn"
          >
            {about.cta.btn}
          </a>
        </div>
      </section>
    </main>
  );
}
