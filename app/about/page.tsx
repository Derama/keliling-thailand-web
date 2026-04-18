"use client";

import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";
import ScrollReveal from "@/components/ScrollReveal";

const WhatsAppIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function AboutPage() {
  const { language } = useLanguage();
  const about = extendedTranslations[language].about;

  return (
    <main className="min-h-[100dvh] bg-white">
      <section className="relative overflow-hidden bg-[#1B2A4A] pt-24 pb-20">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#F5C518]" />
        <Image
          src="/toyotaalphard1.jpg"
          alt="Premium Alphard Fleet"
          fill
          priority
          className="object-cover object-center opacity-30"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1B2A4A]/96 via-[#1B2A4A]/78 to-[#1B2A4A]/42" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1B2A4A] to-transparent" />
        <div className="absolute -left-16 top-20 h-44 w-44 rounded-full bg-[#F5C518]/10 blur-3xl" />
        <div className="absolute right-0 top-28 h-60 w-60 rounded-full bg-white/6 blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
          <div className="animate-slide-up">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#F5C518]">
              {about.header.eyebrow}
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              {about.header.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/72 sm:text-xl">
              {about.header.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
                className="whatsapp-btn text-base shadow-lg shadow-green-900/40"
              >
                <WhatsAppIcon />
                {about.cta.btn}
              </a>
            </div>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/7 p-5 shadow-2xl backdrop-blur-sm sm:p-8">
              <div className="mb-7 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
                    {about.story.eyebrow}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-white">
                    {about.story.title}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                    Since
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-[#F5C518]">
                    2021
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {about.stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className={`rounded-2xl border px-5 py-5 transition-colors hover:bg-white/5 ${
                      index === 0
                        ? "border-[#F5C518]/40 bg-[#F5C518]/10"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="text-3xl font-extrabold text-white sm:text-4xl">
                      {stat.value}
                    </div>
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-amber-50 py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <ScrollReveal>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#F5C518]">
                {about.story.eyebrow}
              </p>
              <h2 className="mt-4 max-w-sm text-4xl font-extrabold leading-tight text-[#1B2A4A] sm:text-5xl">
                {about.story.title}
              </h2>
              <div className="mt-10 space-y-4">
                {about.values.items.slice(0, 3).map((item, index) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-4 rounded-[1.4rem] border border-[#1B2A4A]/8 bg-white p-4 transition-all hover:border-[#F5C518]/30 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1B2A4A] text-sm font-bold text-[#F5C518]">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B2A4A]/40">
                        {item.icon}
                      </p>
                      <p className="mt-0.5 text-base font-bold text-[#1B2A4A]">
                        {item.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal className="relative">
              <div className="absolute -left-4 -top-4 text-8xl font-black leading-none text-gray-100/80">
                &ldquo;
              </div>
              <div className="relative rounded-[2rem] border border-[#1B2A4A]/10 bg-white p-8 shadow-[0_24px_70px_rgba(16,32,60,0.12)] sm:p-12">
                <p className="text-2xl font-bold leading-snug text-[#1B2A4A] sm:text-3xl">
                  {about.header.subtitle}
                </p>
                <div className="mt-10 space-y-6 text-lg leading-relaxed text-gray-600">
                  <p>{about.story.p1}</p>
                  <p>{about.story.p2}</p>
                  <p>{about.story.p3}</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="bg-[#1B2A4A] py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <ScrollReveal className="max-w-2xl">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#F5C518]">
                {about.values.eyebrow}
              </p>
              <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
                {about.values.title}
              </h2>
            </ScrollReveal>
            <ScrollReveal className="max-w-xl text-lg leading-relaxed text-white/60">
              {about.header.subtitle}
            </ScrollReveal>
          </div>

          <ScrollReveal stagger className="grid gap-6 md:grid-cols-2">
            {about.values.items.map((item, index) => (
              <div
                key={item.title}
                className="group relative rounded-[2rem] border border-white/8 bg-white/[0.04] p-8 transition-all hover:border-[#F5C518]/30 hover:bg-white/[0.06] sm:p-10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-5xl transition-transform group-hover:scale-110">{item.icon}</div>
                  <div className="text-sm font-bold uppercase tracking-[0.28em] text-[#F5C518]/30">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                </div>
                <h3 className="mt-10 text-2xl font-bold text-white">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/60">
                  {item.desc}
                </p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1B2A4A] px-6 py-12 text-center shadow-[0_30px_90px_rgba(16,32,60,0.22)] sm:px-16 sm:py-20">
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#F5C518]/10 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#F5C518]/10 blur-3xl" />
              
              <div className="relative z-10 mx-auto max-w-3xl">
                <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-[#F5C518]">
                  {about.header.eyebrow}
                </p>
                <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
                  {about.cta.title}
                </h2>
                <p className="mt-8 text-lg leading-relaxed text-white/70">
                  {about.cta.subtitle}
                </p>
                <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <a
                    href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
                    className="whatsapp-btn text-lg px-10 py-4 shadow-xl shadow-green-900/40"
                  >
                    <WhatsAppIcon />
                    {about.cta.btn}
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
