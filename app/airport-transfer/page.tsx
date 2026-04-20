"use client";

import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";

const AT_WA = {
  id: "Halo Keliling Thailand! Saya ingin memesan Airport Transfer. [dari: Airport Transfer Page]",
  en: "Hello Keliling Thailand! I'd like to book an Airport Transfer. [from: Airport Transfer Page]",
  th: "สวัสดี Keliling Thailand! ฉันต้องการจองรับส่งสนามบิน [จาก: Airport Transfer Page]",
} as const;

export default function AirportTransferPage() {
  const { language } = useLanguage();
  const at = extendedTranslations[language].airportTransfer;

  return (
    <main className="min-h-[100dvh] bg-white pt-20">
      {/* Hero */}
      <section
        style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #253d6b 100%)" }}
        className="relative py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-4">
            {at.header.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            {at.header.title}
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            {at.header.subtitle}
          </p>
        </div>
      </section>

      {/* Routes Table */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-3">
              {at.routes.eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              {at.routes.title}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <thead>
                <tr className="bg-[#F5C518] text-[#1B2A4A]">
                  <th className="text-left px-3 py-3 sm:px-6 sm:py-4 font-semibold">{at.routes.colFrom}</th>
                  <th className="text-left px-3 py-3 sm:px-6 sm:py-4 font-semibold">{at.routes.colTo}</th>
                  <th className="text-left px-3 py-3 sm:px-6 sm:py-4 font-semibold">{at.routes.colDuration}</th>
                </tr>
              </thead>
              <tbody>
                {at.routes.items.map((route, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-white" : "bg-amber-50"}
                  >
                    {i === 0 ? (
                      <td
                        rowSpan={at.routes.items.length}
                        className="align-top px-3 py-3 sm:px-6 sm:py-4 text-gray-800 font-semibold"
                      >
                        {at.routes.airportLabel}
                      </td>
                    ) : null}
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-gray-700">{route.to}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-[#F5C518] font-semibold">
                      {route.duration}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="bg-amber-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-3">
              {at.includes.eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              {at.includes.title}
            </h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <ul className="space-y-4">
              {at.includes.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 text-[#F5C518] text-lg font-bold flex-shrink-0">
                    ✓
                  </span>
                  <span className="text-gray-700 text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* What's Not Included */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-3">
              {at.notIncluded.eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              {at.notIncluded.title}
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <ul className="space-y-3">
              {at.notIncluded.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-amber-50/50 px-5 py-4">
                  <span className="mt-0.5 text-[#1B2A4A] font-bold flex-shrink-0">&bull;</span>
                  <span className="text-gray-700 text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="bg-amber-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-3">
              {at.pricing.eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              {at.pricing.title}
            </h2>
          </div>
          <div className="max-w-sm mx-auto rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
            <p className="text-gray-500 text-sm mb-2">{at.pricing.from}</p>
            <p className="text-6xl font-extrabold text-[#1B2A4A] mb-4">
              {at.pricing.price}
            </p>
            <p className="text-gray-500 text-sm">{at.pricing.note}</p>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section
        style={{ background: "#1B2A4A" }}
        className="py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F5C518] font-bold text-xs uppercase tracking-widest mb-3">
            {at.header.eyebrow}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            {at.cta.title}
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
            {at.cta.subtitle}
          </p>
          <a
            href={`https://wa.me/66647646597?text=${encodeURIComponent(AT_WA[language])}`}
            className="whatsapp-btn"
          >
            {at.cta.btn}
          </a>
        </div>
      </section>
    </main>
  );
}
