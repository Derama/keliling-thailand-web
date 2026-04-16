"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";
import { useEffect, useState } from "react";
import DatePicker from "@/components/DatePicker";
import LocationSearch from "@/components/LocationSearch";

const WA_LINK =
  "https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!%20Saya%20ingin%20memesan%20layanan%20transportasi.";

const HERO_SLIDES = [
  {
    src: "https://images.pexels.com/photos/11143602/pexels-photo-11143602.jpeg?auto=compress&cs=tinysrgb&w=1920",
    label: "Toyota Fortuner",
    tag: "SUV · Airport & City",
    altKey: "slide1" as const,
  },
  {
    src: "https://images.pexels.com/photos/88628/pexels-photo-88628.jpeg?auto=compress&cs=tinysrgb&w=1920",
    label: "Toyota Altis",
    tag: "Sedan · City Transfers",
    altKey: "slide2" as const,
  },
  {
    src: "https://images.pexels.com/photos/1178448/pexels-photo-1178448.jpeg?auto=compress&cs=tinysrgb&w=1920",
    label: "Bus",
    tag: "Bus · Large Groups",
    altKey: "slide3" as const,
  },
];

const FLEET_VEHICLE_SRCS = [
  { src: "https://images.pexels.com/photos/1004409/pexels-photo-1004409.jpeg?auto=compress&cs=tinysrgb&w=800", altKey: "fleet1" as const },
  { src: "https://images.pexels.com/photos/11143602/pexels-photo-11143602.jpeg?auto=compress&cs=tinysrgb&w=800", altKey: "fleet2" as const },
  { src: "https://images.pexels.com/photos/88628/pexels-photo-88628.jpeg?auto=compress&cs=tinysrgb&w=800", altKey: "fleet3" as const },
  { src: "https://images.pexels.com/photos/7263971/pexels-photo-7263971.jpeg?auto=compress&cs=tinysrgb&w=800", altKey: "fleet4" as const },
  { src: "https://images.pexels.com/photos/1178448/pexels-photo-1178448.jpeg?auto=compress&cs=tinysrgb&w=800", altKey: "fleet5" as const },
];

// ── Service icons ──
const IconCar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h12l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
    <circle cx="7.5" cy="17" r="1.5" /><circle cx="16.5" cy="17" r="1.5" />
    <path d="M7.5 17h9" />
  </svg>
);
const IconPlane = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.89 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.8 1.17h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconMap = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

// ── Why Us icons ──
const IconSpeech = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconShield = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconStar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconZap = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconClock = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconTag = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

// ── Check icon for trust bar ──
const IconCheck = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SERVICE_ICONS = [IconCar, IconPlane, IconMap];
const REASON_ICONS = [IconSpeech, IconShield, IconStar, IconZap, IconClock, IconTag];

const WhatsAppIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function PersonAvatar({ inverted }: { inverted?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-10 h-10"
    >
      <circle cx="20" cy="20" r="20" fill={inverted ? "#000" : "#F5C518"} />
      <circle cx="20" cy="15" r="6" fill={inverted ? "#F5C518" : "#1B2A4A"} />
      <path
        d="M8 34c0-6.627 5.373-12 12-12s12 5.373 12 12"
        stroke={inverted ? "#F5C518" : "#1B2A4A"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-[#F5C518]">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { t, language } = useLanguage();
  const alts = extendedTranslations[language].alts;
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [bookingService, setBookingService] = useState(0); // 0=airport, 1=city tour, 2=intercity
  const [bookingVehicle, setBookingVehicle] = useState("");
  // Airport Transfer
  const [airportPickup, setAirportPickup] = useState("");
  const [airportDropoff, setAirportDropoff] = useState("");
  // City Tours
  const [tourDest, setTourDest] = useState("");
  const [tourMeet, setTourMeet] = useState("");
  // Inter City
  const [intercityFrom, setIntercityFrom] = useState("");
  const [intercityTo, setIntercityTo] = useState("");
  // Common
  const [bookingDate, setBookingDate] = useState("");
  const [bookingPax, setBookingPax] = useState(1);
  const [bookingError, setBookingError] = useState("");

  function validateBooking(): boolean {
    if (!bookingDate) { setBookingError("Please select a date."); return false; }
    if (bookingService === 0) {
      if (!airportPickup) { setBookingError("Please enter a pickup location."); return false; }
      if (!airportDropoff) { setBookingError("Please enter a drop-off location."); return false; }
    } else if (bookingService === 1) {
      if (!tourDest) { setBookingError("Please enter a tour destination."); return false; }
      if (!tourMeet) { setBookingError("Please enter a meeting point."); return false; }
    } else {
      if (!intercityFrom) { setBookingError("Please enter the departure city."); return false; }
      if (!intercityTo) { setBookingError("Please enter the destination city."); return false; }
    }
    setBookingError("");
    return true;
  }

  function handleBookingSubmit() {
    if (!validateBooking()) return;
    window.open(buildBookingWaLink(), "_blank", "noopener,noreferrer");
  }

  function buildBookingWaLink() {
    const services = [t.booking.service1, t.booking.service2, t.booking.service3];
    const service = services[bookingService];
    const vehicle = bookingVehicle || t.booking.vehicle1;
    const date = bookingDate || "-";
    const pax = bookingPax >= 8 ? t.booking.pax8plus : `${bookingPax} ${t.booking.paxUnit}`;

    let locationLine = "";
    if (bookingService === 0) {
      locationLine = `- Penjemputan: ${airportPickup || "-"}\n- Pengantaran: ${airportDropoff || "-"}`;
    } else if (bookingService === 1) {
      locationLine = `- Tujuan: ${tourDest || "-"}\n- Titik Jemput: ${tourMeet || "-"}`;
    } else {
      locationLine = `- Dari: ${intercityFrom || "-"}\n- Ke: ${intercityTo || "-"}`;
    }

    const msg = `Halo Keliling Thailand! Saya ingin memesan:\n- Layanan: ${service}\n- Kendaraan: ${vehicle}\n${locationLine}\n- Tanggal: ${date}\n- Jumlah orang: ${pax}`;
    return `https://wa.me/66647646597?text=${encodeURIComponent(msg)}`;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => {
        const next = (c + 1) % HERO_SLIDES.length;
        setPrev(c);
        setTransitioning(true);
        setTimeout(() => {
          setPrev(null);
          setTransitioning(false);
        }, 1000);
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  function goTo(idx: number) {
    if (idx === current || transitioning) return;
    setPrev(current);
    setTransitioning(true);
    setCurrent(idx);
    setTimeout(() => {
      setPrev(null);
      setTransitioning(false);
    }, 1000);
  }

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-[#1B2A4A]">
        {/* Slide images — crossfade */}
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{
              opacity: i === current ? 1 : i === prev ? 0 : 0,
              zIndex: i === current ? 1 : i === prev ? 2 : 0,
            }}
          >
            <Image
              src={slide.src}
              alt={alts[slide.altKey]}
              fill
              priority={i === 0}
              className="object-cover object-center"
              sizes="100vw"
            />
            {/* dark + brand gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1B2A4A]/90 via-[#1B2A4A]/60 to-[#1B2A4A]/20" />
          </div>
        ))}

        {/* Slide dots — bottom center */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`rounded-full transition-all duration-500 ${
                i === current
                  ? "bg-[#F5C518] w-3 h-3"
                  : "bg-white/50 w-2 h-2 hover:bg-white/80"
              }`}
            />
          ))}
        </div>

        {/* Slide tag — top-right floating chip */}
        <div className="absolute top-28 right-8 z-20">
          <div
            key={current}
            className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest animate-fade-in"
          >
            {HERO_SLIDES[current].tag}
          </div>
        </div>

        <div className="absolute top-0 left-0 h-1 w-full bg-[#F5C518] z-20" />

        <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — headline */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
                {t.hero.badge}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                {t.hero.title1}{" "}
                <span className="text-[#F5C518]">{t.hero.title2}</span>
                <br />
                {t.hero.title3}
              </h1>

              <p className="text-white/70 text-lg max-w-lg mb-8 leading-relaxed">
                {t.hero.subtitle}
              </p>

              {/* Stats row */}
              <div className="flex mb-10">
                {[
                  { value: t.hero.stat1Value, label: t.hero.stat1Label },
                  { value: t.hero.stat2Value, label: t.hero.stat2Label },
                  { value: t.hero.stat3Value, label: t.hero.stat3Label },
                ].map((s, i, arr) => (
                  <div
                    key={s.label}
                    className={`pr-8 ${i < arr.length - 1 ? "mr-8 border-r border-white/20" : ""}`}
                  >
                    <div className="text-2xl font-extrabold text-[#F5C518]">{s.value}</div>
                    <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-btn text-base font-bold shadow-lg shadow-green-900/40"
                >
                  <WhatsAppIcon />
                  {t.hero.chatBtn}
                </a>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white px-6 py-3 rounded-full font-bold hover:border-[#F5C518] hover:text-[#F5C518] transition-colors group"
                >
                  {t.hero.servicesBtn}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>

            {/* Right — booking card */}
            <div className="bg-[#1B2A4A]/80 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 lg:p-8 text-white">
              <h2 className="text-xl font-extrabold mb-1">{t.booking.title}</h2>
              <p className="text-white/60 text-sm mb-6">{t.booking.subtitle}</p>

              <div className="space-y-4">
                {/* Service selector */}
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5">
                    {t.booking.serviceLabel}
                  </label>
                  <select
                    value={bookingService}
                    onChange={(e) => setBookingService(Number(e.target.value))}
                    className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
                  >
                    <option value={0} className="text-black">{t.booking.service1}</option>
                    <option value={1} className="text-black">{t.booking.service2}</option>
                    <option value={2} className="text-black">{t.booking.service3}</option>
                  </select>
                </div>

                {/* Vehicle selector */}
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5">
                    {t.booking.vehicleLabel}
                  </label>
                  <select
                    value={bookingVehicle}
                    onChange={(e) => setBookingVehicle(e.target.value)}
                    className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
                  >
                    <option className="text-black">{t.booking.vehicle1}</option>
                    <option className="text-black">{t.booking.vehicle2}</option>
                    <option className="text-black">{t.booking.vehicle3}</option>
                    <option className="text-black">{t.booking.vehicle4}</option>
                    <option className="text-black">{t.booking.vehicle5}</option>
                  </select>
                </div>

                {/* Airport Transfer: pickup + drop-off */}
                {bookingService === 0 && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5">
                        {t.booking.airportPickupLabel}
                      </label>
                      <LocationSearch
                        dark
                        value={airportPickup}
                        onChange={setAirportPickup}
                        placeholder={t.booking.airportPickupPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5">
                        {t.booking.airportDropoffLabel}
                      </label>
                      <LocationSearch
                        dark
                        value={airportDropoff}
                        onChange={setAirportDropoff}
                        placeholder={t.booking.airportDropoffPlaceholder}
                      />
                    </div>
                  </>
                )}

                {/* City Tours: destination + meeting point */}
                {bookingService === 1 && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5">
                        {t.booking.tourDestLabel}
                      </label>
                      <LocationSearch
                        dark
                        value={tourDest}
                        onChange={setTourDest}
                        placeholder={t.booking.tourDestPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5">
                        {t.booking.tourMeetLabel}
                      </label>
                      <LocationSearch
                        dark
                        value={tourMeet}
                        onChange={setTourMeet}
                        placeholder={t.booking.tourMeetPlaceholder}
                      />
                    </div>
                  </>
                )}

                {/* Inter City: from + to */}
                {bookingService === 2 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5">
                        {t.booking.intercityFromLabel}
                      </label>
                      <LocationSearch
                        dark
                        value={intercityFrom}
                        onChange={setIntercityFrom}
                        placeholder={t.booking.intercityFromPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5">
                        {t.booking.intercityToLabel}
                      </label>
                      <LocationSearch
                        dark
                        value={intercityTo}
                        onChange={setIntercityTo}
                        placeholder={t.booking.intercityToPlaceholder}
                      />
                    </div>
                  </div>
                )}

                {/* Date + Pax */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5 truncate">
                      {t.booking.dateLabel}
                    </label>
                    <DatePicker
                      dark
                      value={bookingDate}
                      onChange={setBookingDate}
                      placeholder={t.booking.dateLabel}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-1.5 truncate">
                      {t.booking.paxLabel}
                    </label>
                    <div className="flex items-center justify-between w-full border border-white/20 rounded-xl bg-white/10 px-4 h-11">
                      <button
                        type="button"
                        onClick={() => setBookingPax(p => Math.max(1, p - 1))}
                        disabled={bookingPax <= 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white font-bold text-lg hover:bg-white/20 disabled:opacity-30 transition"
                      >−</button>
                      <span className="text-sm font-semibold text-white">
                        {bookingPax >= 8 ? t.booking.pax8plus : `${bookingPax} ${t.booking.paxUnit}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBookingPax(p => Math.min(8, p + 1))}
                        disabled={bookingPax >= 8}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white font-bold text-lg hover:bg-white/20 disabled:opacity-30 transition"
                      >+</button>
                    </div>
                  </div>
                </div>

                {bookingError && (
                  <p className="text-red-400 text-xs font-semibold text-center -mb-1">{bookingError}</p>
                )}

                <button
                  type="button"
                  onClick={handleBookingSubmit}
                  className="w-full bg-[#F5C518] text-black py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors"
                >
                  <WhatsAppIcon />
                  {t.booking.sendBtn}
                </button>

                <p className="text-center text-xs text-white/40">
                  {t.booking.disclaimer}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="bg-[#F5C518] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-nowrap justify-center gap-x-8 overflow-x-auto text-black text-sm font-bold whitespace-nowrap">
            {t.trust.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-[#1B2A4A] shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FLEET ── */}
      <section className="py-24 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#F5C518] font-bold text-xs uppercase tracking-widest">
              {t.fleet.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black mt-2">
              {t.fleet.title}
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">
              {t.fleet.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {t.fleetItems.map((v, i) => (
              <div
                key={v.name}
                className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
              >
                <div className="relative h-52">
                  <Image
                    src={FLEET_VEHICLE_SRCS[i].src}
                    alt={alts[FLEET_VEHICLE_SRCS[i].altKey]}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1B2A4A]/90 via-[#1B2A4A]/30 to-transparent" />
                  <span className="absolute top-3 left-3 bg-[#F5C518] text-black text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full">
                    {v.tag}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-extrabold text-base leading-tight">{v.name}</h3>
                  <p className="text-[#F5C518] text-xs font-semibold mt-0.5">{v.capacity}</p>
                  <p className="text-white/70 text-xs mt-1.5 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="py-24 bg-[#1B2A4A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#F5C518] font-bold text-xs uppercase tracking-widest">
              {t.services.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              {t.services.title}
            </h2>
            <p className="text-white/60 mt-3 max-w-xl mx-auto text-sm">
              {t.services.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.serviceItems.map((s, i) => {
              const ServiceIcon = SERVICE_ICONS[i] ?? IconCar;
              return (
              <div
                key={s.title}
                className="group relative border border-white/10 bg-white/5 rounded-2xl p-8 hover:shadow-xl hover:border-[#F5C518] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5C518]/5 rounded-bl-full group-hover:bg-[#F5C518]/10 transition-colors" />

                <div className="w-12 h-12 rounded-xl bg-[#F5C518]/15 flex items-center justify-center mb-5 group-hover:bg-[#F5C518]/25 transition-colors">
                  <ServiceIcon className="w-6 h-6 text-[#F5C518]" />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-3">{s.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-6">{s.desc}</p>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-1 text-sm font-bold text-[#F5C518] group-hover:gap-2 transition-all"
                >
                  <span>{t.services.moreBtn}</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/services"
              className="inline-block bg-[#F5C518] text-black px-8 py-3.5 rounded-full font-bold hover:bg-white hover:text-black transition-colors"
            >
              {t.services.allBtn}
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#F5C518] font-bold text-xs uppercase tracking-widest">
                {t.whyUs.eyebrow}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-black mt-2 mb-4">
                {t.whyUs.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                {t.whyUs.subtitle}
              </p>

              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn font-bold"
              >
                <WhatsAppIcon />
                {t.whyUs.consultBtn}
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {t.reasonItems.map((r, i) => {
                const ReasonIcon = REASON_ICONS[i] ?? IconShield;
                return (
                <div
                  key={r.title}
                  className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#F5C518] hover:shadow-md transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1B2A4A]/5 flex items-center justify-center mb-3">
                    <ReasonIcon className="w-4 h-4 text-[#1B2A4A]" />
                  </div>
                  <h3 className="text-black font-bold text-sm mb-1">{r.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{r.desc}</p>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUE STACK ── */}
      <section className="py-24 bg-[#1B2A4A]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[#F5C518] font-bold text-xs uppercase tracking-widest">
              {t.valueStack.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              {t.valueStack.title}
            </h2>
            <p className="text-white/60 mt-3 max-w-xl mx-auto text-sm">
              {t.valueStack.subtitle}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/10">
              {t.valueStack.items.map((item) => (
                <div key={item.name} className="flex items-center justify-between px-6 sm:px-8 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[#F5C518] font-extrabold text-lg shrink-0">✓</span>
                    <span className="text-white text-sm">{item.name}</span>
                  </div>
                  <span className="text-white/40 text-sm line-through shrink-0 ml-4">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#F5C518]/10 border-t border-[#F5C518]/30 px-6 sm:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/50 text-xs uppercase tracking-widest mb-1">{t.valueStack.totalLabel}</div>
                  <div className="text-white/40 line-through text-xl font-bold">{t.valueStack.totalValue}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#F5C518] text-xs uppercase tracking-widest font-bold mb-1">{t.valueStack.payLabel}</div>
                  <div className="text-[#F5C518] text-3xl font-extrabold">{t.valueStack.payValue}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn text-base shadow-lg"
            >
              <WhatsAppIcon />
              {t.valueStack.ctaBtn}
            </a>
          </div>
        </div>
      </section>

      {/* ── GUARANTEE ── */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-[#F5C518] text-black text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
              🛡️ {t.guarantee.badge}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black mt-2">
              {t.guarantee.title}
            </h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm">
              {t.guarantee.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {t.guarantee.items.map((item) => (
              <div
                key={item.title}
                className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 hover:border-[#F5C518] hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-extrabold text-black text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#F5C518] font-bold text-xs uppercase tracking-widest">
              {t.testimonials.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black mt-2">
              {t.testimonials.title}
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">
              {t.testimonials.subtitle}
            </p>
          </div>

          {/* Featured 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.testimonialItems.map((testimonial, i) => (
              <div
                key={testimonial.name}
                className={`rounded-2xl p-8 border ${
                  i === 1
                    ? "bg-[#F5C518] border-[#F5C518] shadow-xl scale-105"
                    : "bg-white border-gray-100 shadow-sm"
                }`}
              >
                <StarRating count={testimonial.stars} />
                <p
                  className={`text-sm leading-relaxed mt-4 mb-6 italic ${
                    i === 1 ? "text-black/80" : "text-gray-600"
                  }`}
                >
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <PersonAvatar inverted={i === 1} />
                  <div>
                    <div className="font-bold text-sm text-black">{testimonial.name}</div>
                    <div className={`text-xs ${i === 1 ? "text-black/60" : "text-gray-400"}`}>
                      {testimonial.city}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* More reviews */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {t.moreTestimonialItems.map((testimonial) => (
              <div
                key={testimonial.name + testimonial.city}
                className="bg-white rounded-xl p-5 border border-gray-100 hover:border-[#F5C518] hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <StarRating count={testimonial.stars} />
                  <span className="text-xs text-[#F5C518] font-bold bg-[#F5C518]/10 px-2 py-0.5 rounded-full">
                    {testimonial.service}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-3 italic">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1B2A4A]/10 flex items-center justify-center text-[#1B2A4A] text-xs font-extrabold shrink-0">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-black">{testimonial.name}</div>
                    <div className="text-xs text-gray-400">{testimonial.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-24 bg-[#1B2A4A] overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#F5C518]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#F5C518]/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <span className="text-[#F5C518] font-bold text-xs uppercase tracking-widest">
            {t.cta.eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
            {t.cta.title}
          </h2>
          <p className="text-white/60 text-base mb-10 max-w-xl mx-auto">
            {t.cta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn text-base shadow-lg"
            >
              <WhatsAppIcon />
              {t.cta.chatBtn}
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-[#F5C518] text-black px-6 py-3 rounded-full font-bold hover:bg-yellow-400 transition-colors group"
            >
              {t.cta.bookingBtn}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
