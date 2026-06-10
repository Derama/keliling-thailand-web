"use client";

import { useLanguage } from "@/components/LanguageContext";
import { waLink } from "@/lib/site";

export default function TestimonyContent() {
  const { t } = useLanguage();

  return (
    <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.testimony.title}</h1>
      <p className="text-gray-600 mt-2">{t.testimony.subtitle}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {t.testimony.items.map((item) => (
          <figure key={item.name} className="bg-gray-50 rounded-2xl p-5">
            <p className="text-[#F5C518]">{"★".repeat(item.stars)}</p>
            <blockquote className="mt-2 text-sm text-gray-700">{item.text}</blockquote>
            <figcaption className="mt-3 text-sm font-bold text-[#1B2A4A]">
              {item.name} · <span className="font-normal text-gray-500">{item.city}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="text-center mt-12">
        <a
          href={waLink(t.home.waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn inline-flex"
        >
          {t.common.whatsapp}
        </a>
      </div>
    </main>
  );
}
