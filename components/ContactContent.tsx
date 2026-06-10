"use client";

import { useLanguage } from "@/components/LanguageContext";
import { waLink, WA_NUMBER } from "@/lib/site";

export default function ContactContent() {
  const { t } = useLanguage();

  const cards = [
    {
      title: t.contact.waTitle,
      desc: t.contact.waDesc,
      extra: `+${WA_NUMBER}`,
    },
    { title: t.contact.locationTitle, desc: t.contact.locationDesc, extra: null },
    { title: t.contact.hoursTitle, desc: t.contact.hoursDesc, extra: null },
  ];

  return (
    <main className="pt-24 pb-16 max-w-4xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.contact.title}</h1>
      <p className="text-gray-600 mt-2">{t.contact.subtitle}</p>

      <div className="grid sm:grid-cols-3 gap-6 mt-10">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-gray-200 p-5">
            <h2 className="font-bold text-[#1B2A4A]">{c.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
            {c.extra && <p className="mt-2 text-sm font-bold text-[#1B2A4A]">{c.extra}</p>}
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <a
          href={waLink(t.contact.waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn inline-flex"
        >
          {t.contact.waButton}
        </a>
      </div>
    </main>
  );
}
