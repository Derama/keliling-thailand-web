"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { itineraryTranslations } from "@/lib/translations";
import { cities, getCity } from "@/lib/itinerary";
import CityItineraryDetail from "@/components/CityItineraryDetail";

const CITY_EMOJI: Record<string, string> = {
  bangkok: "🏙️",
  pattaya: "🏖️",
  ayutthaya: "🏛️",
  kanchanaburi: "🌉",
  huahin: "🌅",
  khaoyai: "⛰️",
};

interface ItineraryBuilderProps {
  /** External request (e.g. from the hero picker) to jump straight to a city. */
  requestedCity?: { id: string; nonce: number } | null;
}

export default function ItineraryBuilder({ requestedCity }: ItineraryBuilderProps = {}) {
  const { language } = useLanguage();
  const t = itineraryTranslations[language];

  const [cityId, setCityId] = useState<string | null>(null);

  // Respond to an external city pick (render-time pattern, no effect). nonce re-fires repeats.
  const [lastNonce, setLastNonce] = useState<number | null>(null);
  if (requestedCity && requestedCity.nonce !== lastNonce && getCity(requestedCity.id)) {
    setLastNonce(requestedCity.nonce);
    setCityId(requestedCity.id);
  }

  return (
    <section className="bg-[#F4F4F4] py-16 sm:py-20" id="builder">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-[#050505]/60 font-bold text-xs uppercase tracking-widest mb-3">
            {t.ui.eyebrow}
          </p>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-[#050505]">{t.ui.title}</h2>
          <p className="text-[#050505]/70 text-base sm:text-lg max-w-2xl mx-auto mt-4">
            {t.ui.subtitle}
          </p>
        </div>

        {cityId ? (
          <div className="outline-card p-6 sm:p-8">
            <CityItineraryDetail cityId={cityId} onBack={() => setCityId(null)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {cities.map((c) => {
              const ct = t.cities[c.id as keyof typeof t.cities];
              return (
                <button
                  key={c.id}
                  onClick={() => setCityId(c.id)}
                  className="outline-card p-6 text-left flex flex-col items-start"
                >
                  <span className="text-4xl mb-3">{CITY_EMOJI[c.id]}</span>
                  <span className="text-lg font-bold text-[#050505]">{ct.name}</span>
                  <span className="text-sm text-[#050505]/60 mt-1">{ct.tagline}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
