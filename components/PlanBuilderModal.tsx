"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { cities, getCity, vehicles, VehicleId } from "@/lib/tours";
import { cityNames, attractionNames } from "@/lib/translations";
import { waLink, fillTemplate } from "@/lib/site";

const MAX_DAYS = 5;
const MAX_PAX = 20;
const TOTAL_STEPS = 5;

/** Famous attractions pre-checked in itinerary order until the day is full. */
function defaultPicks(cityId: string): string[] {
  const city = getCity(cityId);
  if (!city) return [];
  const picks: string[] = [];
  let used = 0;
  for (const a of city.attractions) {
    if (used + a.hours > city.durationHours) break;
    picks.push(a.id);
    used += a.hours;
  }
  return picks;
}

function maxVehiclePax(pax: string): number {
  return Number(pax.split("-")[1] ?? pax);
}

function CheckBadge() {
  return (
    <span className="planner-pop absolute top-2 right-2 w-6 h-6 rounded-full bg-[#F5C518] flex items-center justify-center shadow-md">
      <svg className="w-3.5 h-3.5 text-[#1B2A4A]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

export default function PlanBuilderModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [nav, setNav] = useState({ step: 0, dir: 1 });
  const [days, setDays] = useState(1);
  const [tripCities, setTripCities] = useState<string[]>([""]);
  const [picks, setPicks] = useState<string[][]>([[]]);
  const [pax, setPax] = useState(2);
  const [vehicle, setVehicle] = useState<VehicleId | null>(null);

  const step = nav.step;
  const goTo = (next: number) => setNav({ step: next, dir: next > step ? 1 : -1 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const chooseDays = (n: number) => {
    setDays(n);
    setTripCities((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ""));
    setPicks((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? []));
  };

  const chooseCity = (day: number, cityId: string) => {
    setTripCities((prev) => prev.map((c, i) => (i === day ? cityId : c)));
    setPicks((prev) => prev.map((p, i) => (i === day ? defaultPicks(cityId) : p)));
    setVehicle(null);
  };

  const toggleAttraction = (day: number, attractionId: string) => {
    setPicks((prev) =>
      prev.map((p, i) =>
        i === day
          ? p.includes(attractionId)
            ? p.filter((a) => a !== attractionId)
            : [...p, attractionId]
          : p
      )
    );
  };

  const chosenCities = tripCities.map((id) => getCity(id));
  const canNext =
    step === 1
      ? tripCities.every(Boolean)
      : step === 2
        ? picks.every((p) => p.length > 0)
        : true;

  /** Cities (by day) where a vehicle has no price — empty means bookable. */
  const missingCities = (vehicleId: VehicleId): string[] =>
    tripCities.filter((id) => getCity(id)?.prices[vehicleId] == null);

  const vehicleTotal = (vehicleId: VehicleId): number =>
    tripCities.reduce((sum, id) => sum + (getCity(id)?.prices[vehicleId] ?? 0), 0);

  const dayLines = tripCities.map((id, i) =>
    fillTemplate(t.planner.waDayLine, {
      day: i + 1,
      city: cityNames[id],
      attractions: picks[i].map((a) => attractionNames[a]).join(", "),
    })
  );

  const waMessage = vehicle
    ? fillTemplate(t.planner.waMessage, {
        days,
        pax,
        vehicle: t.vehicleNames[vehicle],
        plan: dayLines.map((l) => `${l}\n`).join(""),
        total: vehicleTotal(vehicle).toLocaleString(),
      })
    : "";

  return (
    <div
      className="planner-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2A4A]/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.planner.title}
        className="planner-panel bg-white rounded-3xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-extrabold text-lg text-[#1B2A4A]">{t.planner.title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-gray-400 hover:text-[#1B2A4A] hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mx-6 h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#F5C518] transition-all duration-500"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%`, transitionTimingFunction: "var(--ease-out-quart)" }}
          />
        </div>

        <div
          key={step}
          className={`${nav.dir > 0 ? "planner-step-fwd" : "planner-step-back"} overflow-y-auto px-6 py-5 flex-1`}
        >
          {step === 0 && (
            <>
              <h3 className="font-bold text-[#1B2A4A] mb-4">{t.planner.daysTitle}</h3>
              <div className="planner-stagger grid grid-cols-5 gap-2">
                {Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map((n, i) => (
                  <button
                    key={n}
                    style={{ "--i": i } as React.CSSProperties}
                    onClick={() => chooseDays(n)}
                    className={`rounded-2xl border-2 py-5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                      days === n
                        ? "border-[#F5C518] bg-[#F5C518] shadow-lg shadow-[#F5C518]/30"
                        : "border-gray-200 hover:border-[#F5C518]/60"
                    }`}
                  >
                    <span className="block text-2xl font-extrabold text-[#1B2A4A]">{n}</span>
                    <span className={`text-xs font-medium ${days === n ? "text-[#1B2A4A]/70" : "text-gray-400"}`}>
                      {t.planner.daysUnit}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 className="font-bold text-[#1B2A4A] mb-4">{t.planner.citiesTitle}</h3>
              <div className="space-y-6">
                {tripCities.map((selectedCity, dayIdx) => (
                  <div key={dayIdx}>
                    {days > 1 && (
                      <p className="text-sm font-bold text-[#1B2A4A]/60 mb-2 uppercase tracking-wide">
                        {t.planner.day} {dayIdx + 1}
                      </p>
                    )}
                    <div className="planner-stagger grid grid-cols-2 gap-3">
                      {cities.map((c, i) => {
                        const selected = selectedCity === c.id;
                        return (
                          <button
                            key={c.id}
                            style={{ "--i": i } as React.CSSProperties}
                            onClick={() => chooseCity(dayIdx, c.id)}
                            className={`group relative h-28 rounded-2xl overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                              selected
                                ? "ring-4 ring-[#F5C518] shadow-lg shadow-[#F5C518]/25"
                                : "ring-1 ring-gray-200 hover:ring-2 hover:ring-[#F5C518]/60"
                            }`}
                          >
                            <Image
                              src={c.image}
                              alt={cityNames[c.id]}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              sizes="(max-width: 640px) 50vw, 250px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1B2A4A]/85 via-[#1B2A4A]/15 to-transparent" />
                            <div className="absolute bottom-2.5 left-3 right-3">
                              <p className="font-bold text-white text-sm leading-tight">{cityNames[c.id]}</p>
                              <p className="text-[11px] text-white/75">
                                {c.durationHours} {t.common.hours}
                              </p>
                            </div>
                            {selected && <CheckBadge />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-bold text-[#1B2A4A] mb-4">{t.planner.attractionsTitle}</h3>
              <div className="space-y-7">
                {chosenCities.map((city, dayIdx) => {
                  if (!city) return null;
                  const used = city.attractions
                    .filter((a) => picks[dayIdx].includes(a.id))
                    .reduce((sum, a) => sum + a.hours, 0);
                  const over = used > city.durationHours;
                  return (
                    <div key={dayIdx}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <p className="text-sm font-bold text-[#1B2A4A]/60 uppercase tracking-wide">
                          {t.planner.day} {dayIdx + 1} — {cityNames[city.id]}
                        </p>
                        <p className={`text-xs font-bold ${over ? "text-amber-600" : "text-gray-500"}`}>
                          {fillTemplate(t.planner.hoursBudget, { used, max: city.durationHours })}
                        </p>
                      </div>
                      <div className="h-1 rounded-full bg-gray-100 mb-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${over ? "bg-amber-500" : "bg-[#F5C518]"}`}
                          style={{ width: `${Math.min((used / city.durationHours) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="planner-stagger grid grid-cols-2 gap-3">
                        {city.attractions.map((a, i) => {
                          const checked = picks[dayIdx].includes(a.id);
                          return (
                            <button
                              key={a.id}
                              style={{ "--i": i } as React.CSSProperties}
                              onClick={() => toggleAttraction(dayIdx, a.id)}
                              className={`group relative h-24 rounded-2xl overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                                checked
                                  ? "ring-4 ring-[#F5C518] shadow-lg shadow-[#F5C518]/25"
                                  : "ring-1 ring-gray-200 hover:ring-2 hover:ring-[#F5C518]/60"
                              }`}
                            >
                              <Image
                                src={a.image}
                                alt={attractionNames[a.id]}
                                fill
                                className={`object-cover transition-all duration-500 group-hover:scale-110 ${
                                  checked ? "" : "grayscale-[35%] group-hover:grayscale-0"
                                }`}
                                sizes="(max-width: 640px) 50vw, 250px"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#1B2A4A]/85 via-[#1B2A4A]/15 to-transparent" />
                              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-1">
                                <p className="font-bold text-white text-xs leading-tight">
                                  {attractionNames[a.id]}
                                </p>
                                <p className="text-[10px] text-white/75 whitespace-nowrap">
                                  ±{a.hours} {t.common.hours}
                                </p>
                              </div>
                              {checked && <CheckBadge />}
                            </button>
                          );
                        })}
                      </div>
                      {over && (
                        <p className="text-xs text-amber-600 mt-2">
                          {fillTemplate(t.planner.overLimit, { max: city.durationHours })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-bold text-[#1B2A4A] mb-8">{t.planner.paxTitle}</h3>
              <div className="flex items-center justify-center gap-7">
                <button
                  onClick={() => setPax(Math.max(1, pax - 1))}
                  aria-label="-"
                  className="w-14 h-14 rounded-full border-2 border-gray-200 text-2xl font-bold text-[#1B2A4A] hover:border-[#F5C518] hover:bg-[#F5C518]/10 active:scale-90 transition-all"
                >
                  −
                </button>
                <span key={pax} className="planner-pop text-6xl font-extrabold text-[#1B2A4A] w-24 text-center tabular-nums">
                  {pax}
                </span>
                <button
                  onClick={() => setPax(Math.min(MAX_PAX, pax + 1))}
                  aria-label="+"
                  className="w-14 h-14 rounded-full border-2 border-gray-200 text-2xl font-bold text-[#1B2A4A] hover:border-[#F5C518] hover:bg-[#F5C518]/10 active:scale-90 transition-all"
                >
                  +
                </button>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">{t.common.pax}</p>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="font-bold text-[#1B2A4A] mb-3">{t.planner.vehicleTitle}</h3>
              <div className="planner-stagger space-y-3">
                {vehicles.map((v, i) => {
                  const missing = missingCities(v.id);
                  const unavailable = missing.length > 0;
                  const selected = vehicle === v.id;
                  return (
                    <button
                      key={v.id}
                      style={{ "--i": i } as React.CSSProperties}
                      disabled={unavailable}
                      onClick={() => setVehicle(v.id)}
                      className={`relative w-full flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                        unavailable
                          ? "ring-1 ring-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                          : selected
                            ? "ring-4 ring-[#F5C518] bg-[#F5C518]/10 shadow-lg shadow-[#F5C518]/25"
                            : "ring-1 ring-gray-200 hover:ring-2 hover:ring-[#F5C518]/60 hover:-translate-y-0.5 active:scale-[0.98]"
                      }`}
                    >
                      <span className="relative w-20 h-14 shrink-0">
                        <Image
                          src={v.image}
                          alt={t.vehicleNames[v.id]}
                          fill
                          className={`object-contain ${unavailable ? "grayscale" : ""}`}
                          sizes="80px"
                        />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-[#1B2A4A]">{t.vehicleNames[v.id]}</span>
                        <span className="text-xs text-gray-500">
                          {v.pax} {t.common.pax}
                        </span>
                        {unavailable && (
                          <span className="block text-xs text-gray-400">
                            {fillTemplate(t.planner.vehicleUnavailable, {
                              city: missing.map((id) => cityNames[id]).join(", "),
                            })}
                          </span>
                        )}
                      </span>
                      {!unavailable && (
                        <span className="font-extrabold text-[#1B2A4A] whitespace-nowrap">
                          {vehicleTotal(v.id).toLocaleString()} {t.common.thb}
                        </span>
                      )}
                      {selected && <CheckBadge />}
                    </button>
                  );
                })}
              </div>
              {vehicle && pax > maxVehiclePax(vehicles.find((v) => v.id === vehicle)!.pax) && (
                <p className="text-xs text-amber-600 mt-2">{t.planner.paxWarning}</p>
              )}

              <div className="mt-6 rounded-2xl bg-cream p-4">
                <h3 className="font-bold text-[#1B2A4A] mb-2">{t.planner.summaryTitle}</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {dayLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                {vehicle && (
                  <p className="font-extrabold text-[#1B2A4A] mt-3">
                    {t.planner.totalLabel}: {vehicleTotal(vehicle).toLocaleString()} {t.common.thb}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">{t.planner.priceNote}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            className="font-bold text-gray-500 hover:text-[#1B2A4A] disabled:opacity-0 px-2 transition-colors"
          >
            {t.planner.back}
          </button>
          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={() => goTo(step + 1)}
              disabled={!canNext}
              className="bg-[#F5C518] text-[#1B2A4A] font-bold px-9 py-2.5 rounded-full hover:brightness-95 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {t.planner.next}
            </button>
          ) : (
            <a
              href={vehicle ? waLink(waMessage) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!vehicle}
              className={`whatsapp-btn justify-center ${!vehicle ? "opacity-40 pointer-events-none" : ""}`}
            >
              {t.planner.waButton}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
