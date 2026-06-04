"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations, itineraryTranslations } from "@/lib/translations";
import ItineraryWizard from "@/components/ItineraryWizard";

const CT_WA = {
  id: "Halo Keliling Thailand! Saya tertarik dengan City Tour. [dari: City Tours Page]",
  en: "Hello Keliling Thailand! I'm interested in City Tours. [from: City Tours Page]",
  th: "สวัสดี Keliling Thailand! ฉันสนใจทัวร์เมือง [จาก: City Tours Page]",
} as const;

export default function CityToursContent() {
  const { language } = useLanguage();
  const ct = extendedTranslations[language].cityTours;
  const itinUi = itineraryTranslations[language].ui;
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <main className="min-h-[100dvh] bg-white pt-20">
      {/* Hero */}
      <section
        style={{ background: "linear-gradient(135deg, #050505 0%, #2a2a2a 100%)" }}
        className="relative py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#FFC531] font-bold text-xs uppercase tracking-widest mb-4">
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

      {/* Step-by-step itinerary planner launcher */}
      <section className="bg-[#FAE7B8] py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#050505]/60">
            {itinUi.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-[#050505] sm:text-4xl">
            {itinUi.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#050505]/70">{itinUi.subtitle}</p>
          <button
            onClick={() => setWizardOpen(true)}
            className="mt-8 rounded-full border-2 border-[#050505] bg-[#FFC531] px-8 py-3.5 font-extrabold text-[#050505] shadow-[4px_4px_0_#050505] transition active:scale-95 hover:translate-x-[-1px] hover:translate-y-[-1px]"
          >
            {itinUi.step1} →
          </button>
        </div>
      </section>

      <ItineraryWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />

      {/* What's Included */}
      <section className="bg-[#FAE7B8] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#FFC531] font-bold text-xs uppercase tracking-widest mb-3">
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
                  <span className="text-[#FFC531] text-lg font-bold flex-shrink-0">✓</span>
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
            <p className="text-[#FFC531] font-bold text-xs uppercase tracking-widest mb-3">
              {ct.notIncluded.eyebrow}
            </p>
            <h2 className="font-extrabold text-3xl sm:text-4xl text-gray-900">
              {ct.notIncluded.title}
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <ul className="space-y-3">
              {ct.notIncluded.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-[#FAE7B8]/50 px-5 py-4">
                  <span className="mt-0.5 text-[#050505] font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700 text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Navy CTA */}
      <section className="bg-[#050505] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#FFC531] font-bold text-xs uppercase tracking-widest mb-4">
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
