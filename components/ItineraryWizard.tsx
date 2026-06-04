"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { itineraryTranslations } from "@/lib/translations";
import {
  cities,
  getCity,
  availableVehicles,
  totalHours,
  type VehicleId,
} from "@/lib/itinerary";

const WA_NUMBER = "6285750923934";

const CITY_EMOJI: Record<string, string> = {
  bangkok: "🏙️",
  pattaya: "🏖️",
  ayutthaya: "🏛️",
  kanchanaburi: "🌉",
  huahin: "🌅",
  khaoyai: "⛰️",
};

const fmt = (n: number) => "฿" + n.toLocaleString("en-US");

type Step = 1 | 2 | 3 | 4;

interface ItineraryWizardProps {
  open: boolean;
  /** If set, the wizard opens straight on the Attractions step for this city. */
  initialCityId?: string | null;
  onClose: () => void;
}

export default function ItineraryWizard({ open, initialCityId, onClose }: ItineraryWizardProps) {
  const { language } = useLanguage();
  const t = itineraryTranslations[language];

  const [step, setStep] = useState<Step>(1);
  const [cityId, setCityId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState<VehicleId | null>(null);

  // AI assist
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{ attractionIds: string[]; dayPlan: string } | null>(null);

  // (Re)initialise each time the wizard opens. Render-time pattern, no effect.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    const startCity = initialCityId && getCity(initialCityId) ? initialCityId : null;
    setCityId(startCity);
    setStep(startCity ? 2 : 1);
    setSelected([]);
    setVehicleId(null);
    setAiPrompt("");
    setAiSuggestion(null);
    setAiError(null);
  }
  if (!open && wasOpen) setWasOpen(false);

  // Esc + scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const city = cityId ? getCity(cityId) : undefined;
  const vehicleOptions = useMemo(() => (cityId ? availableVehicles(cityId) : []), [cityId]);
  const orderedStops = useMemo(
    () => (city ? city.attractions.filter((a) => selected.includes(a.id)) : []),
    [city, selected]
  );
  const visitHours = cityId ? totalHours(cityId, selected) : 0;
  const price = city && vehicleId ? city.prices[vehicleId] ?? undefined : undefined;

  if (!open) return null;

  function toggleStop(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function chooseCity(id: string) {
    setCityId(id);
    setSelected([]);
    setVehicleId(null);
    setAiSuggestion(null);
    setAiError(null);
    setStep(2);
  }

  async function requestAiSuggestion() {
    if (!aiPrompt.trim() || !cityId) return;
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
      t.ui.waIntro, "",
      `${t.ui.waCity}: ${t.cities[city.id as keyof typeof t.cities].name}`,
      `${t.ui.waVehicle}: ${t.vehicles[vehicleId]}`,
      `${t.ui.waDuration}: ${city.durationHours} ${t.ui.hours}`, "",
      `${t.ui.waStops}:`, stops, "",
      price ? `${t.ui.waPrice}: ${fmt(price)}` : "",
      t.ui.waFrom,
    ].filter(Boolean);
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  const stepLabels = [t.ui.step1, t.ui.step2, t.ui.chooseVehicle, t.ui.yourItinerary];
  const canNext = step === 2 ? selected.length > 0 : step === 3 ? vehicleId != null : true;

  return (
    <div className="wizard-overlay fixed inset-0 z-[70] flex flex-col bg-[#F4F4F4]">
      {/* Top bar: progress + close */}
      <header className="flex items-center gap-4 border-b-2 border-[#050505] bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 items-center gap-1.5 sm:gap-3 overflow-x-auto">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as Step;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-1.5 sm:gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#050505] text-xs font-bold ${
                    active || done ? "bg-[#FFC531]" : "bg-white"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span className={`hidden whitespace-nowrap text-sm font-semibold sm:inline ${active ? "text-[#050505]" : "text-[#050505]/40"}`}>
                  {label}
                </span>
                {n < 4 && <span className="hidden h-0.5 w-5 bg-[#050505]/20 sm:inline-block lg:w-8" />}
              </div>
            );
          })}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#050505] bg-white text-lg font-bold text-[#050505] transition active:scale-95 hover:bg-[#FAE7B8]"
        >
          ✕
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
        <div key={step} className="wizard-step mx-auto max-w-5xl">

          {/* Step 1: City */}
          {step === 1 && (
            <>
              <StepHead title={t.ui.step1} hint={t.ui.subtitle} />
              <div className="city-picker-grid grid grid-cols-2 gap-4 sm:grid-cols-3">
                {cities.map((c) => {
                  const ct = t.cities[c.id as keyof typeof t.cities];
                  return (
                    <button
                      key={c.id}
                      onClick={() => chooseCity(c.id)}
                      className="city-tile group relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-[#050505] text-left"
                    >
                      <ImgLayer src={c.image} emoji={CITY_EMOJI[c.id]} />
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <span className="block text-base font-extrabold text-white sm:text-lg">{ct.name}</span>
                        <span className="block text-[11px] text-white/70">{ct.tagline}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 2: Attractions (+ AI assist) */}
          {step === 2 && city && (
            <>
              <StepHead
                title={`${t.ui.step2} · ${t.cities[city.id as keyof typeof t.cities].name}`}
                hint={t.ui.pickAttractionsHint}
              />

              {/* AI assist */}
              <div className="outline-card mb-6 bg-white p-4 sm:p-5">
                <p className="mb-2 font-bold text-[#050505]">{t.ui.aiHeading}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={t.ui.aiPlaceholder}
                    className="flex-1 rounded-xl border-2 border-[#050505] px-3 py-2.5 text-sm text-[#050505] outline-none focus:bg-[#FAE7B8]/30"
                  />
                  <button
                    onClick={requestAiSuggestion}
                    disabled={!aiPrompt.trim() || aiLoading}
                    className="shrink-0 rounded-full border-2 border-[#050505] bg-[#FFC531] px-5 py-2.5 font-bold text-[#050505] transition active:scale-95 hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {aiLoading ? t.ui.aiLoading : "✨ " + t.ui.aiButton}
                  </button>
                </div>
                {aiError && <p className="mt-2 text-sm text-red-600">{aiError}</p>}
                {aiSuggestion && (
                  <div className="mt-3 rounded-xl border-2 border-[#050505] bg-[#FAE7B8]/40 p-3">
                    {aiSuggestion.dayPlan && (
                      <p className="mb-3 whitespace-pre-line text-sm text-[#050505]/80">{aiSuggestion.dayPlan}</p>
                    )}
                    <button
                      onClick={applyAiSuggestion}
                      className="rounded-full border-2 border-[#050505] bg-white px-4 py-1.5 text-sm font-bold text-[#050505] transition active:scale-95 hover:bg-[#F4F4F4]"
                    >
                      {t.ui.aiApply}
                    </button>
                  </div>
                )}
              </div>

              <div className="city-picker-grid grid grid-cols-2 gap-4 sm:grid-cols-3">
                {city.attractions.map((a) => {
                  const on = selected.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleStop(a.id)}
                      className={`city-tile group relative aspect-[4/3] overflow-hidden rounded-2xl border-2 text-left ${on ? "border-[#FFC531] ring-4 ring-[#FFC531]/40" : "border-[#050505]"}`}
                    >
                      <ImgLayer src={a.image} emoji="📍" />
                      <span className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-sm font-bold ${on ? "bg-[#FFC531] text-[#050505]" : "bg-black/40 text-white"}`}>
                        {on ? "✓" : "+"}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <span className="block text-sm font-extrabold leading-tight text-white">
                          {t.attractions[a.id as keyof typeof t.attractions]}
                        </span>
                        <span className="block text-[11px] text-white/70">~{a.hours} {t.ui.hours}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 3: Vehicle */}
          {step === 3 && city && (
            <>
              <StepHead title={t.ui.chooseVehicle} hint={`${t.ui.tourDuration}: ${city.durationHours} ${t.ui.hours}`} />
              <div className="city-picker-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
                {vehicleOptions.map((v) => {
                  const on = vehicleId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVehicleId(v.id)}
                      className={`city-tile group relative overflow-hidden rounded-2xl border-2 bg-white text-left ${on ? "border-[#FFC531] ring-4 ring-[#FFC531]/40" : "border-[#050505]"}`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-[#F4F4F4]">
                        <div className="city-tile-img absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${v.image})` }} />
                      </div>
                      <div className="flex items-center justify-between gap-2 p-3">
                        <span>
                          <span className="block font-extrabold text-[#050505]">{t.vehicles[v.id]}</span>
                          <span className="block text-[11px] text-[#050505]/60">{v.pax} {t.ui.pax}</span>
                        </span>
                        <span className="font-extrabold text-[#050505]">{fmt(city.prices[v.id] ?? 0)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {step === 4 && city && (
            <>
              <StepHead title={t.ui.yourItinerary} hint={`${t.cities[city.id as keyof typeof t.cities].name} · ${t.ui.tourDuration}: ${city.durationHours} ${t.ui.hours}`} />
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="outline-card bg-white p-6 lg:col-span-3">
                  <ol className="space-y-3">
                    {orderedStops.map((a, i) => (
                      <li key={a.id} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFC531] text-sm font-bold text-[#050505]">{i + 1}</span>
                        <span className="font-semibold text-[#050505]">{t.attractions[a.id as keyof typeof t.attractions]}</span>
                        <span className="ml-auto text-sm text-[#050505]/50">~{a.hours} {t.ui.hours}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-5 border-t border-[#050505]/10 pt-4 text-sm text-[#050505]/70">
                    {t.ui.estDuration}: ~{visitHours} {t.ui.hours}
                  </p>
                </div>
                <div className="outline-card flex flex-col bg-white p-6 lg:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-20 shrink-0 rounded-lg bg-[#F4F4F4] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: vehicleId ? `url(${vehicleOptions.find((v) => v.id === vehicleId)?.image})` : undefined }} />
                    <span className="font-bold text-[#050505]">{vehicleId && t.vehicles[vehicleId]}</span>
                  </div>
                  <div className="mt-6 text-center">
                    <span className="block text-xs uppercase tracking-widest text-[#050505]/60">{t.ui.totalPrice}</span>
                    <span className="block text-4xl font-extrabold text-[#050505]">{price != null ? fmt(price) : "—"}</span>
                    <span className="block text-xs text-[#050505]/50">{t.ui.perVehicle}</span>
                  </div>
                  <a href={whatsappHref()} className="whatsapp-btn mt-auto w-full justify-center pt-0">
                    {t.ui.bookWhatsApp}
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <footer className="flex items-center justify-between gap-4 border-t-2 border-[#050505] bg-white px-4 py-3 sm:px-6">
        <button
          onClick={() => (step === 1 ? onClose() : setStep((s) => (s - 1) as Step))}
          className="rounded-full px-5 py-2.5 font-semibold text-[#050505]/70 transition active:scale-95 hover:text-[#050505]"
        >
          ← {step === 1 ? t.ui.back : t.ui.back}
        </button>
        {step < 4 ? (
          <button
            onClick={() => canNext && setStep((s) => (s + 1) as Step)}
            disabled={!canNext}
            className="rounded-full border-2 border-[#050505] bg-[#FFC531] px-8 py-2.5 font-bold text-[#050505] transition active:scale-95 hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.ui.next} →
          </button>
        ) : (
          <span className="text-sm font-semibold text-[#050505]/50">{t.ui.bookWhatsApp} ↗</span>
        )}
      </footer>
    </div>
  );
}

function StepHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-6 text-center">
      <h2 className="text-2xl font-extrabold text-[#050505] sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-[#050505]/60">{hint}</p>
    </div>
  );
}

/** Image layer with gradient fallback for missing placeholders. */
function ImgLayer({ src, emoji }: { src?: string; emoji: string }) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#050505]" />
      {src && (
        <div className="city-tile-img absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
      )}
      <span className="absolute left-2.5 top-2 text-2xl drop-shadow-md">{emoji}</span>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
    </>
  );
}
