"use client";

import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";

export default function AirportTransferPage() {
  const { language } = useLanguage();
  const at = extendedTranslations[language].airportTransfer;

  return (
    <main className="min-h-screen bg-white pt-16">
      {/* Hero */}
      <section className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-4">
            {at.header.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            {at.header.title}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {at.header.subtitle}
          </p>
        </div>
      </section>

      {/* Routes Table */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-3">
              {at.routes.eyebrow}
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
              {at.routes.title}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <thead>
                <tr className="bg-[#1B2A4A] text-white">
                  <th className="text-left px-6 py-4 font-semibold">From</th>
                  <th className="text-left px-6 py-4 font-semibold">To</th>
                  <th className="text-left px-6 py-4 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {at.routes.items.map((route, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      {route.from}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{route.to}</td>
                    <td className="px-6 py-4 text-[#F5C518] font-semibold">
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
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-3">
              {at.includes.eyebrow}
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
              {at.includes.title}
            </h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <ul className="space-y-4">
              {at.includes.items.map((item, i) => (
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

      {/* Pricing Card */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-3">
              {at.pricing.eyebrow}
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
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

      {/* CTA */}
      <section className="bg-[#F5C518] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1B2A4A] mb-4">
            {at.cta.title}
          </h2>
          <p className="text-[#1B2A4A]/80 text-lg mb-8 max-w-xl mx-auto">
            {at.cta.subtitle}
          </p>
          <a
            href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
            className="whatsapp-btn"
          >
            {at.cta.btn}
          </a>
        </div>
      </section>
    </main>
  );
}
