"use client";

import { useMemo, useState } from "react";
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

const VEHICLE_EMOJI: Record<VehicleId, string> = {
  altis: "🚗",
  suv: "🚙",
  van: "🚐",
  minibus: "🚌",
};

const fmt = (n: number) => "฿" + n.toLocaleString("en-US");

export default function ItineraryBuilder() {
  const { language } = useLanguage();
  const t = itineraryTranslations[language];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cityId, setCityId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState<VehicleId | null>(null);

  const city = cityId ? getCity(cityId) : undefined;
  const vehicleOptions = useMemo(
    () => (cityId ? availableVehicles(cityId) : []),
    [cityId]
  );

  // Selected attractions in the city's defined order (route order).
  const orderedStops = useMemo(() => {
    if (!city) return [];
    return city.attractions.filter((a) => selected.includes(a.id));
  }, [city, selected]);

  const visitHours = cityId ? totalHours(cityId, selected) : 0;
  const price =
    city && vehicleId ? city.prices[vehicleId] ?? undefined : undefined;

  function chooseCity(id: string) {
    setCityId(id);
    setSelected([]);
    setVehicleId(null);
    setStep(2);
  }

  function toggleStop(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function reset() {
    setStep(1);
    setCityId(null);
    setSelected([]);
    setVehicleId(null);
  }

  function whatsappHref() {
    if (!city || !vehicleId) return "#";
    const stops = orderedStops
      .map((a, i) => `${i + 1}. ${t.attractions[a.id as keyof typeof t.attractions]}`)
      .join("\n");
    const lines = [
      t.ui.waIntro,
      "",
      `${t.ui.waCity}: ${t.cities[city.id as keyof typeof t.cities].name}`,
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

  const steps = [t.ui.step1, t.ui.step2, t.ui.step3];

  return (
    <section className="bg-[#F4F4F4] py-16 sm:py-20" id="builder">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="text-[#050505]/60 font-bold text-xs uppercase tracking-widest mb-3">
            {t.ui.eyebrow}
          </p>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-[#050505]">
            {t.ui.title}
          </h2>
          <p className="text-[#050505]/70 text-base sm:text-lg max-w-2xl mx-auto mt-4">
            {t.ui.subtitle}
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
          {steps.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#050505] text-sm font-bold ${
                      active || done ? "bg-[#FFC531]" : "bg-white"
                    }`}
                  >
                    {n}
                  </span>
                  <span
                    className={`hidden sm:inline text-sm font-semibold ${
                      active ? "text-[#050505]" : "text-[#050505]/50"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {n < 3 && <span className="h-0.5 w-6 sm:w-10 bg-[#050505]/20" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: pick city */}
        {step === 1 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {cities.map((c) => {
              const ct = t.cities[c.id as keyof typeof t.cities];
              return (
                <button
                  key={c.id}
                  onClick={() => chooseCity(c.id)}
                  className="outline-card p-6 text-left flex flex-col items-start"
                >
                  <span className="text-4xl mb-3">{CITY_EMOJI[c.id]}</span>
                  <span className="text-lg font-bold text-[#050505]">
                    {ct.name}
                  </span>
                  <span className="text-sm text-[#050505]/60 mt-1">
                    {ct.tagline}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: pick attractions */}
        {step === 2 && city && (
          <div>
            <p className="text-center text-[#050505]/70 mb-6">
              {t.ui.pickAttractionsHint}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {city.attractions.map((a) => {
                const on = selected.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleStop(a.id)}
                    className={`outline-card p-5 text-left flex items-start gap-3 ${
                      on ? "is-active" : ""
                    }`}
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
                      <span className="block text-sm text-[#050505]/60">
                        ~{a.hours} {t.ui.hours}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="font-semibold text-[#050505]/70 hover:text-[#050505]"
              >
                ← {t.ui.back}
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selected.length === 0}
                className="rounded-full border-2 border-[#050505] bg-[#FFC531] px-7 py-3 font-bold text-[#050505] transition hover:translate-x-[-1px] hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.ui.next} →
              </button>
            </div>
            {selected.length === 0 && (
              <p className="text-right text-sm text-[#050505]/50 mt-2">
                {t.ui.selectAtLeastOne}
              </p>
            )}
          </div>
        )}

        {/* Step 3: itinerary + vehicle + price */}
        {step === 3 && city && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Itinerary list */}
            <div className="lg:col-span-3 outline-card p-6">
              <h3 className="font-extrabold text-xl text-[#050505] mb-1">
                {t.ui.yourItinerary}
              </h3>
              <p className="text-sm text-[#050505]/60 mb-5">
                {t.cities[city.id as keyof typeof t.cities].name} ·{" "}
                {t.ui.tourDuration}: {city.durationHours} {t.ui.hours}
              </p>
              <ol className="space-y-3">
                {orderedStops.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFC531] text-sm font-bold text-[#050505]">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-[#050505]">
                      {t.attractions[a.id as keyof typeof t.attractions]}
                    </span>
                    <span className="ml-auto text-sm text-[#050505]/50">
                      ~{a.hours} {t.ui.hours}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 border-t border-[#050505]/10 pt-4 text-sm text-[#050505]/70">
                {t.ui.estDuration}: ~{visitHours} {t.ui.hours}
              </p>
            </div>

            {/* Vehicle + price */}
            <div className="lg:col-span-2 outline-card p-6 flex flex-col">
              <h3 className="font-extrabold text-xl text-[#050505] mb-4">
                {t.ui.chooseVehicle}
              </h3>
              <div className="space-y-3">
                {vehicleOptions.map((v) => {
                  const on = vehicleId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVehicleId(v.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 border-[#050505] px-4 py-3 text-left transition ${
                        on ? "bg-[#FAE7B8]" : "bg-white hover:bg-[#F4F4F4]"
                      }`}
                    >
                      <span className="text-2xl">{VEHICLE_EMOJI[v.id]}</span>
                      <span className="flex-1">
                        <span className="block font-bold text-[#050505]">
                          {t.vehicles[v.id]}
                        </span>
                        <span className="block text-xs text-[#050505]/60">
                          {v.pax} {t.ui.pax}
                        </span>
                      </span>
                      <span className="font-extrabold text-[#050505]">
                        {fmt(city.prices[v.id] ?? 0)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pt-6">
                {price != null && (
                  <div className="mb-4 text-center">
                    <span className="block text-xs uppercase tracking-widest text-[#050505]/60">
                      {t.ui.totalPrice}
                    </span>
                    <span className="block text-3xl font-extrabold text-[#050505]">
                      {fmt(price)}
                    </span>
                    <span className="block text-xs text-[#050505]/50">
                      {t.ui.perVehicle}
                    </span>
                  </div>
                )}
                <a
                  href={vehicleId ? whatsappHref() : undefined}
                  aria-disabled={!vehicleId}
                  className={`whatsapp-btn w-full justify-center ${
                    vehicleId ? "" : "pointer-events-none opacity-40"
                  }`}
                >
                  {t.ui.bookWhatsApp}
                </a>
                <button
                  onClick={reset}
                  className="mt-3 w-full text-sm font-semibold text-[#050505]/60 hover:text-[#050505]"
                >
                  {t.ui.startOver}
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <button
                onClick={() => setStep(2)}
                className="font-semibold text-[#050505]/70 hover:text-[#050505]"
              >
                ← {t.ui.back}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
