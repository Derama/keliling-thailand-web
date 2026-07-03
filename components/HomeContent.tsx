"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { usePlanBuilder } from "@/components/PlanBuilderContext";
import { cities, City, vehicles } from "@/lib/tours";
import { waLink } from "@/lib/site";
import CityCard from "@/components/CityCard";
import DestinationPreviewModal from "@/components/DestinationPreviewModal";
import HomePackageBrowserModal from "@/components/HomePackageBrowserModal";
import ScrollReveal from "@/components/ScrollReveal";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1704390529135-742324e6b8f1?w=1600&q=80&auto=format&fit=crop";

export default function HomeContent() {
  const { t } = useLanguage();
  const { openPlanner } = usePlanBuilder();
  const [destinationPreview, setDestinationPreview] = useState<{
    city: City;
    trigger: HTMLButtonElement;
  } | null>(null);
  const [packageBrowserTrigger, setPackageBrowserTrigger] =
    useState<HTMLButtonElement | null>(null);

  const closeDestinationPreview = useCallback(() => {
    const trigger = destinationPreview?.trigger;
    setDestinationPreview(null);
    window.requestAnimationFrame(() => trigger?.focus());
  }, [destinationPreview]);

  const closePackageBrowser = useCallback(() => {
    setPackageBrowserTrigger(null);
    window.requestAnimationFrame(() => packageBrowserTrigger?.focus());
  }, [packageBrowserTrigger]);

  const steps = [
    { title: t.home.how1Title, desc: t.home.how1Desc },
    { title: t.home.how2Title, desc: t.home.how2Desc },
    { title: t.home.how3Title, desc: t.home.how3Desc },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center">
        <Image src={HERO_IMAGE} alt={t.home.heroTitle} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-[#1B2A4A]/60" />
        <div className="relative max-w-6xl mx-auto px-4 py-32 text-center text-white">
          <h1 className="text-4xl sm:text-5xl font-extrabold max-w-3xl mx-auto leading-tight">
            {t.home.heroTitle}
          </h1>
          <p className="mt-4 text-lg text-white/85 max-w-2xl mx-auto">{t.home.heroSubtitle}</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => openPlanner()}
              className="min-h-12 rounded-full bg-[#F5C518] px-8 py-3 font-bold text-[#1B2A4A] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
            >
              {t.planner.openButton}
            </button>
            <button
              type="button"
              onClick={(event) => setPackageBrowserTrigger(event.currentTarget)}
              className="min-h-12 rounded-full border-2 border-white/80 bg-[#1B2A4A]/20 px-8 py-3 font-bold text-white transition-[transform,background-color,border-color,color] duration-150 hover:border-[#F5C518] hover:bg-[#F5C518] hover:text-[#1B2A4A] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/70"
            >
              {t.home.packageBrowser.openButton}
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <ScrollReveal>
          <h2 className="text-3xl font-extrabold text-[#1B2A4A] text-center">{t.home.howTitle}</h2>
          <div className="grid sm:grid-cols-3 gap-6 mt-10">
            {steps.map((s, i) => (
              <div key={i} className="text-center px-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#F5C518] text-[#1B2A4A] font-extrabold flex items-center justify-center text-xl">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-bold text-[#1B2A4A]">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Destinations */}
      <section className="bg-cream py-16">
        <div className="max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="text-3xl font-extrabold text-[#1B2A4A]">{t.home.destinationsTitle}</h2>
            <p className="text-gray-600 mt-1">{t.home.destinationsSubtitle}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {cities.map((c) => (
                <CityCard
                  key={c.id}
                  city={c}
                  onSelect={(city, trigger) => setDestinationPreview({ city, trigger })}
                />
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Fleet strip */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <ScrollReveal>
          <h2 className="text-3xl font-extrabold text-[#1B2A4A]">{t.home.fleetTitle}</h2>
          <p className="text-gray-600 mt-1">{t.home.fleetSubtitle}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {vehicles.map((v) => (
              <Link
                key={v.id}
                href="/fleet"
                className="rounded-xl border border-gray-200 p-4 text-center hover:border-[#F5C518] transition-colors"
              >
                <div className="relative h-24 mb-3">
                  <Image src={v.image} alt={t.vehicleNames[v.id]} fill className="object-contain" sizes="(max-width: 1024px) 50vw, 25vw" />
                </div>
                <p className="font-bold text-[#1B2A4A] text-sm">{t.vehicleNames[v.id]}</p>
                <p className="text-xs text-gray-500">
                  {v.pax} {t.common.pax}
                </p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/fleet" className="text-[#1B2A4A] font-bold underline underline-offset-4">
              {t.home.fleetSeeAll}
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Testimonials */}
      <section className="bg-cream py-16">
        <div className="max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="text-3xl font-extrabold text-[#1B2A4A]">{t.home.trustTitle}</h2>
            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              {t.testimony.items.slice(0, 3).map((item, i) => (
                <figure key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-[#F5C518]">{"★".repeat(item.stars)}</p>
                  <blockquote className="mt-2 text-sm text-gray-700">{item.text}</blockquote>
                  <figcaption className="mt-3 text-sm font-bold text-[#1B2A4A]">
                    {item.name} · <span className="font-normal text-gray-500">{item.city}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link href="/testimony" className="text-[#1B2A4A] font-bold underline underline-offset-4">
                {t.home.trustSeeAll}
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#1B2A4A] py-16 text-center text-white px-4">
        <h2 className="text-3xl font-extrabold">{t.home.ctaBandTitle}</h2>
        <p className="mt-2 text-white/80">{t.home.ctaBandSubtitle}</p>
        <a
          href={waLink(t.home.waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn inline-flex mt-6"
        >
          {t.common.whatsapp}
        </a>
      </section>

      {destinationPreview && (
        <DestinationPreviewModal
          city={destinationPreview.city}
          onClose={closeDestinationPreview}
        />
      )}
      {packageBrowserTrigger && (
        <HomePackageBrowserModal onClose={closePackageBrowser} />
      )}
    </main>
  );
}
