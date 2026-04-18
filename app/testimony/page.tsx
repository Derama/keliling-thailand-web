"use client";

import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations, translations } from "@/lib/translations";

export default function TestimonyPage() {
  const { language } = useLanguage();
  const testimony = extendedTranslations[language].testimony;
  const featured = translations[language].testimonialItems;
  const more = translations[language].moreTestimonialItems;

  return (
    <main className="min-h-[100dvh] bg-white pt-20">
      <section className="relative overflow-hidden bg-[#1B2A4A] pt-20 pb-16 sm:pt-24 sm:pb-18">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#F5C518]" />
        <div className="absolute -left-12 top-24 h-40 w-40 rounded-full bg-[#F5C518]/12 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-52 w-52 rounded-full bg-white/6 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#F5C518]">
              {testimony.header.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              {testimony.header.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/68">
              {testimony.header.subtitle}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
                className="whatsapp-btn text-base font-bold shadow-lg shadow-green-900/35"
              >
                Chat WhatsApp
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/35 px-6 py-3 font-bold text-white transition-colors hover:border-[#F5C518] hover:text-[#F5C518]"
              >
                Reservasi Sekarang
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {featured.slice(0, 3).map((item, i) => (
              <div
                key={i}
                className="rounded-[1.6rem] border border-white/10 bg-white/7 p-5 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-1 text-[#F5C518]">
                    {Array.from({ length: item.stars }).map((_, s) => (
                      <span key={s} className="text-sm">★</span>
                    ))}
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/65">
                    {item.city}
                  </span>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/72">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-sm font-extrabold text-white">{item.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-amber-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#F5C518]">
              Featured Reviews
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-[#1B2A4A] sm:text-4xl">
              Cerita nyata dari pelanggan yang sudah memakai layanan kami di Thailand.
            </h2>
          </div>

          <ScrollReveal stagger className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {featured.map((item, i) => (
              <div
                key={i}
                className="group flex flex-col overflow-hidden rounded-[2rem] border border-[#1B2A4A]/10 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#F5C518]/50 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 text-[#F5C518]">
                    {Array.from({ length: item.stars }).map((_, s) => (
                      <span key={s} className="text-lg">★</span>
                    ))}
                  </div>
                  <span className="rounded-full bg-[#1B2A4A]/8 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1B2A4A]/58">
                    Review
                  </span>
                </div>
                <p className="mt-6 flex-1 text-base leading-relaxed text-gray-700">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="mt-8 border-t border-[#1B2A4A]/8 pt-5">
                  <p className="font-extrabold text-[#1B2A4A]">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.city}</p>
                </div>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white pt-16 pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#F5C518]">
              More Reviews
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-[#1B2A4A] sm:text-4xl">
              Ulasan tambahan dari berbagai jenis perjalanan.
            </h2>
          </div>

          <ScrollReveal stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((item, i) => (
              <div
                key={i}
                className="group flex flex-col overflow-hidden rounded-[1.7rem] border border-gray-100 bg-amber-50/35 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#F5C518] hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-1 text-[#F5C518]">
                    {Array.from({ length: item.stars }).map((_, s) => (
                      <span key={s} className="text-sm">★</span>
                    ))}
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1B2A4A]">
                    {item.service}
                  </span>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-gray-700">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="mt-5 border-t border-[#1B2A4A]/8 pt-4">
                  <p className="text-sm font-extrabold text-[#1B2A4A]">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.city}</p>
                </div>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#1B2A4A] py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,197,24,0.18),transparent_38%)]" />
        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#F5C518]">
            Ready To Book
          </p>
          <h2 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">
            {testimony.header.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/65">
            {testimony.header.subtitle}
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!"
              className="whatsapp-btn text-base shadow-lg"
            >
              Chat WhatsApp
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-[#F5C518] px-6 py-3 font-bold text-black transition-colors hover:bg-yellow-400"
            >
              Buka Form Reservasi
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
