"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { itineraryTranslations } from "@/lib/translations";
import {
  getCity,
  availableVehicles,
  totalHours,
  type VehicleId,
} from "@/lib/itinerary";

const WA_NUMBER = "6285750923934";

const VEHICLE_EMOJI: Record<VehicleId, string> = {
  altis: "🚗",
  suv: "🚙",
  van: "🚐",
  minibus: "🚌",
};

const fmt = (n: number) => "฿" + n.toLocaleString("en-US");

interface CityItineraryDetailProps {
  cityId: string;
  /** Optional back/change-city control rendered in the header. */
  onBack?: () => void;
}

/**
 * Attractions + vehicle + live price + WhatsApp for a single city, in one view.
 * Shared by the inline builder and the hero modal.
 */
export default function CityItineraryDetail({ cityId, onBack }: CityItineraryDetailProps) {
  const { language } = useLanguage();
  const t = itineraryTranslations[language];

  const [selected, setSelected] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState<VehicleId | null>(null);

  // Reset selections when the city changes (render-time pattern, no effect).
  const [activeCity, setActiveCity] = useState(cityId);
  if (cityId !== activeCity) {
    setActiveCity(cityId);
    setSelected([]);
    setVehicleId(null);
  }

  const city = getCity(cityId);
  const vehicleOptions = useMemo(() => availableVehicles(cityId), [cityId]);
  const orderedStops = useMemo(
    () => (city ? city.attractions.filter((a) => selected.includes(a.id)) : []),
    [city, selected]
  );
  const visitHours = totalHours(cityId, selected);
  const price = city && vehicleId ? city.prices[vehicleId] ?? undefined : undefined;

  if (!city) return null;
  const cityName = t.cities[city.id as keyof typeof t.cities].name;

  function toggleStop(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function whatsappHref() {
    if (!city || !vehicleId) return "#";
    const stops = orderedStops
      .map((a, i) => `${i + 1}. ${t.attractions[a.id as keyof typeof t.attractions]}`)
      .join("\n");
    const lines = [
      t.ui.waIntro,
      "",
      `${t.ui.waCity}: ${cityName}`,
      `${t.ui.waVehicle}: ${t.vehicles[vehicleId]}`,
      `${t.ui.waDuration}: ${city.durationHours} ${t.ui.hours}`,
      "",
      `${t.ui.waStops}:`,
      stops,
      "",
      price ? `${t.ui.waPrice}: ${fmt(price)}` : "",
      t.ui.waFrom,
    ].filter(Boolean);
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-extrabold text-[#050505]">{cityName}</h3>
          <p className="text-sm text-[#050505]/60">
            {t.ui.tourDuration}: {city.durationHours} {t.ui.hours}
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="shrink-0 text-sm font-semibold text-[#050505]/60 hover:text-[#050505]"
          >
            ← {t.ui.back}
          </button>
        )}
      </div>

      {/* Attractions */}
      <p className="mb-3 text-sm font-semibold text-[#050505]/70">
        {t.ui.pickAttractionsHint}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {city.attractions.map((a) => {
          const on = selected.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() => toggleStop(a.id)}
              className={`outline-card flex items-start gap-3 p-4 text-left ${on ? "is-active" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-[#050505] text-xs font-bold ${
                  on ? "bg-[#FFC531]" : "bg-white"
                }`}
              >
                {on ? "✓" : ""}
              </span>
              <span>
                <span className="block font-bold text-[#050505]">
                  {t.attractions[a.id as keyof typeof t.attractions]}
                </span>
                <span className="block text-xs text-[#050505]/60">
                  ~{a.hours} {t.ui.hours}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Vehicle */}
      <p className="mt-6 mb-3 text-sm font-semibold text-[#050505]/70">
        {t.ui.chooseVehicle}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {vehicleOptions.map((v) => {
          const on = vehicleId === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setVehicleId(v.id)}
              className={`flex items-center gap-3 rounded-xl border-2 border-[#050505] px-4 py-3 text-left transition ${
                on ? "bg-[#FAE7B8]" : "bg-white hover:bg-[#F4F4F4]"
              }`}
            >
              <span className="text-2xl">{VEHICLE_EMOJI[v.id]}</span>
              <span className="flex-1">
                <span className="block font-bold text-[#050505]">{t.vehicles[v.id]}</span>
                <span className="block text-xs text-[#050505]/60">
                  {v.pax} {t.ui.pax}
                </span>
              </span>
              <span className="font-extrabold text-[#050505]">{fmt(city.prices[v.id] ?? 0)}</span>
            </button>
          );
        })}
      </div>

      {/* Summary + price + CTA */}
      <div className="mt-6 rounded-xl border border-[#050505]/10 bg-[#F4F4F4] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#050505]/70">
            {selected.length > 0
              ? `${selected.length} · ${t.ui.estDuration} ~${visitHours} ${t.ui.hours}`
              : t.ui.noStops}
          </span>
          {price != null && (
            <span className="text-right">
              <span className="block text-2xl font-extrabold leading-none text-[#050505]">
                {fmt(price)}
              </span>
              <span className="text-[10px] text-[#050505]/50">{t.ui.perVehicle}</span>
            </span>
          )}
        </div>
        <a
          href={vehicleId && selected.length > 0 ? whatsappHref() : undefined}
          aria-disabled={!vehicleId || selected.length === 0}
          className={`whatsapp-btn mt-4 w-full justify-center ${
            vehicleId && selected.length > 0 ? "" : "pointer-events-none opacity-40"
          }`}
        >
          {t.ui.bookWhatsApp}
        </a>
        {selected.length === 0 && (
          <p className="mt-2 text-center text-xs text-[#050505]/50">{t.ui.selectAtLeastOne}</p>
        )}
      </div>
    </div>
  );
}
