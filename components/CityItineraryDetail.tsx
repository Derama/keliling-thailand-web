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

  // AI suggestion state (attraction assist).
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    attractionIds: string[];
    dayPlan: string;
  } | null>(null);

  // Reset selections when the city changes (render-time pattern, no effect).
  const [activeCity, setActiveCity] = useState(cityId);
  if (cityId !== activeCity) {
    setActiveCity(cityId);
    setSelected([]);
    setVehicleId(null);
    setAiPrompt("");
    setAiSuggestion(null);
    setAiError(null);
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

  async function requestAiSuggestion() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const res = await fetch("/api/itinerary-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId, prompt: aiPrompt.trim(), lang: language }),
      });
      const data = await res.json();
      if (!res.ok || data.error === "ai_unavailable" || data.error === "rate_limited") {
        setAiError(t.ui.aiError);
        return;
      }
      if (data.error === "no_suggestion" || !data.attractionIds?.length) {
        setAiError(t.ui.aiNoSuggestion);
        return;
      }
      setAiSuggestion({ attractionIds: data.attractionIds, dayPlan: data.dayPlan ?? "" });
    } catch {
      setAiError(t.ui.aiError);
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) return;
    setSelected(aiSuggestion.attractionIds);
    setAiSuggestion(null);
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

      {/* AI assist */}
      <div className="outline-card mb-6 bg-white p-5">
        <p className="mb-3 font-bold text-[#050505]">{t.ui.aiHeading}</p>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder={t.ui.aiPlaceholder}
          rows={2}
          className="w-full resize-none rounded-xl border-2 border-[#050505] p-3 text-sm text-[#050505] outline-none focus:bg-[#FAE7B8]/30"
        />
        <button
          onClick={requestAiSuggestion}
          disabled={!aiPrompt.trim() || aiLoading}
          className="mt-3 rounded-full border-2 border-[#050505] bg-[#FFC531] px-6 py-2.5 font-bold text-[#050505] transition hover:translate-x-[-1px] hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {aiLoading ? t.ui.aiLoading : "✨ " + t.ui.aiButton}
        </button>

        {aiError && <p className="mt-3 text-sm text-red-600">{aiError}</p>}

        {aiSuggestion && (
          <div className="mt-4 rounded-xl border-2 border-[#050505] bg-[#FAE7B8]/40 p-4">
            <ol className="mb-3 space-y-1.5">
              {aiSuggestion.attractionIds.map((id, i) => (
                <li
                  key={id}
                  className="flex items-center gap-2 text-sm font-semibold text-[#050505]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFC531] text-xs font-bold">
                    {i + 1}
                  </span>
                  {t.attractions[id as keyof typeof t.attractions]}
                </li>
              ))}
            </ol>
            {aiSuggestion.dayPlan && (
              <p className="mb-4 whitespace-pre-line text-sm text-[#050505]/80">
                {aiSuggestion.dayPlan}
              </p>
            )}
            <button
              onClick={applyAiSuggestion}
              className="rounded-full border-2 border-[#050505] bg-white px-5 py-2 font-bold text-[#050505] transition hover:bg-[#F4F4F4]"
            >
              {t.ui.aiApply}
            </button>
          </div>
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
