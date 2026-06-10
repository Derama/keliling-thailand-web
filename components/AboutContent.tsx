"use client";

import { useLanguage } from "@/components/LanguageContext";

export default function AboutContent() {
  const { t } = useLanguage();

  return (
    <main className="pt-24 pb-16 max-w-4xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.about.title}</h1>
      <p className="mt-4 text-gray-700 leading-relaxed">{t.about.p1}</p>
      <p className="mt-3 text-gray-700 leading-relaxed">{t.about.p2}</p>

      <h2 className="mt-12 text-2xl font-bold text-[#1B2A4A]">{t.about.whyTitle}</h2>
      <div className="grid sm:grid-cols-2 gap-6 mt-6">
        {t.about.why.map((item) => (
          <div key={item.title} className="rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-[#1B2A4A]">{item.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
