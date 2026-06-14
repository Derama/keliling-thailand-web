"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { OPERATOR_DETAILS } from "@/lib/site";

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

      <section className="mt-14 rounded-2xl bg-[#1B2A4A] p-6 text-[#FEF9EC] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F5C518]">
          {t.about.operatorEyebrow}
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-extrabold sm:text-3xl">
          {t.about.operatorTitle}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-[#FEF9EC]/75">
          {t.about.operatorDesc}
        </p>
        <div className="mt-6 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-3">
          <strong>{OPERATOR_DETAILS.name}</strong>
          <span className="hidden text-[#FEF9EC]/35 sm:inline">·</span>
          <span className="text-[#FEF9EC]/70">
            {t.contact.tourismLicenseLabel} {OPERATOR_DETAILS.tourismLicense}
          </span>
        </div>
        <Link
          href="/contact"
          className="mt-6 inline-flex rounded-full bg-[#F5C518] px-5 py-3 text-sm font-extrabold text-[#1B2A4A] transition hover:-translate-y-0.5 hover:bg-[#FFD83D] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/25"
        >
          {t.about.operatorLink}
        </Link>
      </section>
    </main>
  );
}
