"use client";

import { useLanguage } from "@/components/LanguageContext";
import { itineraryTranslations } from "@/lib/translations";
import { cities } from "@/lib/itinerary";

const CITY_EMOJI: Record<string, string> = {
  bangkok: "🏙️",
  pattaya: "🏖️",
  ayutthaya: "🏛️",
  kanchanaburi: "🌉",
  huahin: "🌅",
  khaoyai: "⛰️",
};

interface HeroCityPickerProps {
  /** Called with the chosen city id when a tile is clicked. */
  onPick: (cityId: string) => void;
}

export default function HeroCityPicker({ onPick }: HeroCityPickerProps) {
  const { language } = useLanguage();
  const t = itineraryTranslations[language];

  return (
    <div className="relative z-30 rounded-2xl border border-white/15 bg-white/5 p-4 sm:p-5 backdrop-blur-md shadow-2xl">
      <div className="mb-4 px-1">
        <p className="text-[#FFC531] text-[11px] font-bold uppercase tracking-[0.2em]">
          {t.ui.eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-extrabold text-white">{t.ui.step1}</h2>
        <p className="mt-0.5 text-xs text-white/55">{t.ui.pickAttractionsHint}</p>
      </div>

      <div className="city-picker-grid grid grid-cols-2 gap-3">
        {cities.map((c) => {
          const ct = t.cities[c.id as keyof typeof t.cities];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              aria-label={ct.name}
              className="city-tile group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/15 text-left"
            >
              {/* Placeholder gradient (shows if no image yet) */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#050505]" />
              {/* Real image once dropped at city.image (cover, zooms on hover) */}
              <div
                className="city-tile-img absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${c.image})` }}
              />
              {/* Legibility overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

              <span className="absolute left-2.5 top-2 text-2xl drop-shadow-md">
                {CITY_EMOJI[c.id]}
              </span>

              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <span className="block text-sm font-bold leading-tight text-white">
                  {ct.name}
                </span>
                <span className="block text-[10px] leading-tight text-white/65">
                  {ct.tagline}
                </span>
              </div>

              <span className="city-tile-arrow absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#FFC531] text-sm font-bold text-black">
                →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
