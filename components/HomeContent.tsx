"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";
import { useEffect, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import ItineraryBuilder from "@/components/ItineraryBuilder";
import HeroCityPicker from "@/components/HeroCityPicker";
import ItineraryModal from "@/components/ItineraryModal";

const WA_NUMBER = "6285750923934";

const WA_MESSAGES = {
  id: {
    hero: "Halo Keliling Thailand! Saya tertarik dengan City Tour privat dan ingin konsultasi. [dari: Hero Section]",
    fleet: "Halo Keliling Thailand! Saya butuh bantuan memilih kendaraan yang tepat. [dari: Fleet Section]",
    whyUs: "Halo Keliling Thailand! Saya ingin konsultasi gratis tentang layanan transportasi. [dari: Konsultasi Gratis]",
    valueStack: "Halo Keliling Thailand! Saya ingin memesan City Tour privat seharian. [dari: Grand Slam Offer]",
    cta: "Halo Keliling Thailand! Saya ingin cek ketersediaan City Tour. [dari: CTA Section]",
  },
  en: {
    hero: "Hello Keliling Thailand! I'm interested in a private city tour and would like a consultation. [from: Hero Section]",
    fleet: "Hello Keliling Thailand! I need help choosing the right vehicle. [from: Fleet Section]",
    whyUs: "Hello Keliling Thailand! I'd like a free consultation about your transport services. [from: Free Consultation]",
    valueStack: "Hello Keliling Thailand! I'd like to book a full-day private city tour. [from: Grand Slam Offer]",
    cta: "Hello Keliling Thailand! I'd like to check city tour availability. [from: CTA Section]",
  },
  th: {
    hero: "สวัสดี Keliling Thailand! ฉันสนใจทัวร์เมืองส่วนตัวและต้องการปรึกษา [จาก: Hero Section]",
    fleet: "สวัสดี Keliling Thailand! ฉันต้องการความช่วยเหลือในการเลือกรถ [จาก: Fleet Section]",
    whyUs: "สวัสดี Keliling Thailand! ฉันต้องการปรึกษาฟรีเกี่ยวกับบริการรถ [จาก: ปรึกษาฟรี]",
    valueStack: "สวัสดี Keliling Thailand! ฉันต้องการจองทัวร์เมืองส่วนตัวแบบเต็มวัน [จาก: Grand Slam Offer]",
    cta: "สวัสดี Keliling Thailand! ฉันต้องการเช็กคิวทัวร์เมือง [จาก: CTA Section]",
  },
} as const;

function buildWaLink(section: keyof typeof WA_MESSAGES.id, lang: "id" | "en" | "th") {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGES[lang][section])}`;
}

const HERO_SLIDES = [
  { tag: "Bangkok City Tour" },
  { tag: "Pattaya & Hua Hin Day Trips" },
  { tag: "Airport Transfer & Intercity" },
];

const FLEET_VEHICLE_SRCS = [
  { src: "/Altis.webp", altKey: "fleet3" as const },
  { src: "/Fortuner.webp", altKey: "fleet2" as const },
  { src: "/luxury van .webp", altKey: "fleet4" as const },
  { src: "/bus.png", altKey: "fleet5" as const },
];

const HOMEPAGE_COPY = {
  id: {
    heroLabel: "City Tours",
    heroTitle: "Cara baru menjelajahi Thailand: city tour privat sesuai keinginan Anda",
    heroAccent: "Rancang Itinerary Anda",
    heroSubtitle:
      "Pilih kota, pilih tempat wisata, dan kami antar dengan Altis, SUV, Van, atau Mini Bus. Tersedia juga airport transfer dan rute antar kota.",
    heroHighlights: [
      "Pilih sendiri kota dan tempat wisata",
      "Altis, SUV, Van, hingga Mini Bus",
      "Driver profesional, harga transparan, konfirmasi cepat via WhatsApp",
    ],
    primaryCta: "Pesan City Tour via WhatsApp",
    secondaryCta: "Lihat opsi kendaraan",
    bookingBadge: "Direkomendasikan",
    bookingTitle: "Reservasi Cepat",
    bookingSubtitle:
      "Pilih layanan dan kendaraan Anda.",
    fleetEyebrow: "Pilihan Kendaraan",
    fleetTitle: "Pilih kendaraan sesuai ukuran grup Anda.",
    fleetSubtitle:
      "Altis, SUV, Van, dan Mini Bus siap untuk city tour, day trip, dan airport transfer di seluruh Thailand.",
    featuredLabel: "Paling Populer",
    featuredCapacity: "Ideal untuk 1-3 tamu",
    featuredDescription:
      "Sedan Altis nyaman dan hemat untuk pasangan atau grup kecil yang ingin city tour atau airport transfer di Bangkok.",
    featuredPoints: [
      "Airport transfer cepat dan nyaman",
      "Pas untuk pasangan dan grup kecil",
      "Cocok untuk rute Bangkok maupun antar kota",
    ],
    alternativesLabel: "Pilihan Kendaraan Lainnya",
    alternativesTitle: "Perlu setup perjalanan yang berbeda?",
    alternativesSubtitle:
      "Gunakan pilihan di bawah jika prioritas Anda adalah kapasitas grup yang lebih besar atau kebutuhan operasional khusus.",
    fleetCta: "Konsultasikan kendaraan yang tepat",
    servicesSubtitle:
      "Setiap layanan bisa memakai Altis, SUV, Van, atau Mini Bus sesuai rute, jumlah tamu, dan budget Anda.",
    whyUsSubtitle:
      "City tour privat kami dirancang agar perjalanan Anda terasa halus, tepat waktu, dan menyenangkan dari awal sampai selesai.",
    ctaTitle: "Rancang city tour Anda di Thailand sekarang.",
    ctaSubtitle:
      "Kirim kota, tempat wisata, tanggal, dan jumlah tamu Anda. Kami sarankan Altis, SUV, Van, atau Mini Bus yang paling pas untuk trip Anda.",
    insideLabel: "Yang Anda Dapatkan",
    ctaPrimary: "Cek Ketersediaan City Tour",
    ctaSecondary: "Lihat Semua Layanan",
    serviceHighlights: [
      "Driver profesional berbahasa Indonesia & Inggris",
      "Jemput & antar langsung di hotel",
      "Air mineral & WiFi di kendaraan",
      "Harga all-in tanpa biaya tersembunyi",
    ],
    errorDate: "Silakan pilih tanggal terlebih dahulu.",
    errorPickup: "Silakan isi lokasi penjemputan.",
    errorDropoff: "Silakan isi lokasi pengantaran.",
    errorTourDestination: "Silakan isi tujuan tour.",
    errorMeetingPoint: "Silakan isi titik jemput.",
    errorDepartureCity: "Silakan isi kota keberangkatan.",
    errorDestinationCity: "Silakan isi kota tujuan.",
    waIntro: "Halo Keliling Thailand! Saya ingin memesan:",
    waPickup: "Penjemputan",
    waDropoff: "Pengantaran",
    waTourDestination: "Tujuan",
    waMeetingPoint: "Titik Jemput",
    waFrom: "Dari",
    waTo: "Ke",
    waService: "Layanan",
    waVehicle: "Kendaraan",
    waDate: "Tanggal",
    waPax: "Jumlah orang",
  },
  en: {
    heroLabel: "City Tours",
    heroTitle: "A new way to explore Thailand: private city tours built your way",
    heroAccent: "Build Your Itinerary",
    heroSubtitle:
      "Pick a city, choose your attractions, and we drive you in an Altis, SUV, Van, or Mini Bus. Airport transfers and intercity routes available too.",
    heroHighlights: [
      "Choose your own city and attractions",
      "Altis, SUV, Van, up to Mini Bus",
      "Professional driver, transparent pricing, fast WhatsApp confirmation",
    ],
    primaryCta: "Book a City Tour on WhatsApp",
    secondaryCta: "See vehicle options",
    bookingBadge: "Recommended",
    bookingTitle: "Quick Reservation",
    bookingSubtitle:
      "Choose your service and vehicle.",
    fleetEyebrow: "Vehicle Options",
    fleetTitle: "Pick the vehicle that fits your group size.",
    fleetSubtitle:
      "Altis, SUV, Van, and Mini Bus are ready for city tours, day trips, and airport transfers across Thailand.",
    featuredLabel: "Most Popular",
    featuredCapacity: "Ideal for 1-3 guests",
    featuredDescription:
      "The Altis sedan is comfortable and affordable for couples or small groups wanting a city tour or airport transfer in Bangkok.",
    featuredPoints: [
      "Fast, comfortable airport transfers",
      "Great for couples and small groups",
      "Strong fit for Bangkok itineraries and intercity rides",
    ],
    alternativesLabel: "Other Vehicle Choices",
    alternativesTitle: "Need a different travel setup?",
    alternativesSubtitle:
      "Use the options below when larger group capacity or specific operational needs matter more.",
    fleetCta: "Get help choosing the right vehicle",
    servicesSubtitle:
      "Each service can use an Altis, SUV, Van, or Mini Bus to match your route, guest count, and budget.",
    whyUsSubtitle:
      "Our private city tours are built to keep your trip smooth, punctual, and enjoyable from start to finish.",
    ctaTitle: "Build your city tour in Thailand today.",
    ctaSubtitle:
      "Send your city, attractions, date, and guest count. We'll recommend the Altis, SUV, Van, or Mini Bus that fits your trip best.",
    insideLabel: "What You Get",
    ctaPrimary: "Check City Tour Availability",
    ctaSecondary: "Explore All Services",
    serviceHighlights: [
      "Professional English & Indonesian-speaking driver",
      "Direct hotel pickup & drop-off",
      "Bottled water & WiFi on board",
      "All-in pricing with no hidden fees",
    ],
    errorDate: "Please select a date.",
    errorPickup: "Please enter a pickup location.",
    errorDropoff: "Please enter a drop-off location.",
    errorTourDestination: "Please enter a tour destination.",
    errorMeetingPoint: "Please enter a meeting point.",
    errorDepartureCity: "Please enter the departure city.",
    errorDestinationCity: "Please enter the destination city.",
    waIntro: "Hello Keliling Thailand! I would like to book:",
    waPickup: "Pickup",
    waDropoff: "Drop-off",
    waTourDestination: "Destination",
    waMeetingPoint: "Meeting Point",
    waFrom: "From",
    waTo: "To",
    waService: "Service",
    waVehicle: "Vehicle",
    waDate: "Date",
    waPax: "Passengers",
  },
  th: {
    heroLabel: "ทัวร์เมือง",
    heroTitle: "วิธีใหม่ในการเที่ยวไทย: ทัวร์เมืองส่วนตัวในแบบของคุณ",
    heroAccent: "ออกแบบทริปของคุณ",
    heroSubtitle:
      "เลือกเมือง เลือกสถานที่ท่องเที่ยว แล้วเราพาไปด้วย Altis, SUV, Van หรือ Mini Bus มีบริการรับส่งสนามบินและเส้นทางข้ามเมืองด้วย",
    heroHighlights: [
      "เลือกเมืองและสถานที่ท่องเที่ยวได้เอง",
      "มีทั้ง Altis, SUV, Van จนถึง Mini Bus",
      "คนขับมืออาชีพ ราคาชัดเจน ตอบ WhatsApp รวดเร็ว",
    ],
    primaryCta: "จองทัวร์เมืองทาง WhatsApp",
    secondaryCta: "ดูตัวเลือกยานพาหนะ",
    bookingBadge: "แนะนำ",
    bookingTitle: "จองแบบรวดเร็ว",
    bookingSubtitle:
      "เลือกบริการและรถของคุณ",
    fleetEyebrow: "ตัวเลือกยานพาหนะ",
    fleetTitle: "เลือกรถให้เหมาะกับขนาดกลุ่มของคุณ",
    fleetSubtitle:
      "Altis, SUV, Van และ Mini Bus พร้อมสำหรับทัวร์เมือง ทริปรายวัน และรับส่งสนามบินทั่วประเทศไทย",
    featuredLabel: "ยอดนิยม",
    featuredCapacity: "เหมาะสำหรับ 1-3 ท่าน",
    featuredDescription:
      "รถเก๋ง Altis สะดวกสบายและประหยัด เหมาะสำหรับคู่รักหรือกลุ่มเล็กที่ต้องการทัวร์เมืองหรือรับส่งสนามบินในกรุงเทพ",
    featuredPoints: [
      "รับส่งสนามบินรวดเร็วและสบาย",
      "เหมาะสำหรับคู่รักและกลุ่มเล็ก",
      "เหมาะกับเส้นทางในกรุงเทพและข้ามเมือง",
    ],
    alternativesLabel: "ตัวเลือกรถเพิ่มเติม",
    alternativesTitle: "ต้องการรูปแบบการเดินทางแบบอื่น?",
    alternativesSubtitle:
      "ใช้ตัวเลือกด้านล่างเมื่อต้องการรองรับผู้โดยสารมากขึ้นหรือมีข้อกำหนดการใช้งานเฉพาะ",
    fleetCta: "ให้เราช่วยเลือกรถที่เหมาะ",
    servicesSubtitle:
      "ทุกบริการสามารถใช้ Altis, SUV, Van หรือ Mini Bus ให้เหมาะกับเส้นทาง จำนวนผู้โดยสาร และงบประมาณของคุณ",
    whyUsSubtitle:
      "ทัวร์เมืองส่วนตัวของเราออกแบบมาเพื่อให้ทริปของคุณราบรื่น ตรงเวลา และสนุกตั้งแต่ต้นจนจบ",
    ctaTitle: "ออกแบบทัวร์เมืองของคุณในไทยวันนี้",
    ctaSubtitle:
      "ส่งเมือง สถานที่ท่องเที่ยว วันที่ และจำนวนผู้โดยสารมาให้เรา เราจะแนะนำ Altis, SUV, Van หรือ Mini Bus ที่เหมาะกับทริปของคุณที่สุด",
    insideLabel: "สิ่งที่คุณจะได้รับ",
    ctaPrimary: "เช็กคิวทัวร์เมือง",
    ctaSecondary: "ดูบริการทั้งหมด",
    serviceHighlights: [
      "คนขับมืออาชีพพูดภาษาอังกฤษและอินโดนีเซีย",
      "รับส่งถึงโรงแรมโดยตรง",
      "น้ำดื่มและ WiFi ในรถ",
      "ราคารวมทุกอย่าง ไม่มีค่าใช้จ่ายแอบแฝง",
    ],
    errorDate: "กรุณาเลือกวันที่",
    errorPickup: "กรุณากรอกจุดรับ",
    errorDropoff: "กรุณากรอกจุดส่ง",
    errorTourDestination: "กรุณากรอกจุดหมายปลายทาง",
    errorMeetingPoint: "กรุณากรอกจุดนัดพบ",
    errorDepartureCity: "กรุณากรอกเมืองต้นทาง",
    errorDestinationCity: "กรุณากรอกเมืองปลายทาง",
    waIntro: "สวัสดี Keliling Thailand! ฉันต้องการจอง:",
    waPickup: "จุดรับ",
    waDropoff: "จุดส่ง",
    waTourDestination: "จุดหมาย",
    waMeetingPoint: "จุดนัดพบ",
    waFrom: "จาก",
    waTo: "ถึง",
    waService: "บริการ",
    waVehicle: "รถ",
    waDate: "วันที่",
    waPax: "จำนวนผู้โดยสาร",
  },
} as const;

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
      <circle cx="20" cy="20" r="20" fill={inverted ? "#000" : "#FFC531"} />
      <circle cx="20" cy="15" r="6" fill={inverted ? "#FFC531" : "#050505"} />
      <path
        d="M8 34c0-6.627 5.373-12 12-12s12 5.373 12 12"
        stroke={inverted ? "#FFC531" : "#050505"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-[#FFC531]">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

export default function HomeContent() {
  const { t, language } = useLanguage();
  const alts = extendedTranslations[language].alts;
  const pageCopy = HOMEPAGE_COPY[language];
  const [current, setCurrent] = useState(0);
  const primaryVehicle = t.fleetItems[0];
  const alternativeVehicles = t.fleetItems.slice(1);

  // Hero city picker -> opens the itinerary modal for the chosen city (no scroll).
  const [modalCity, setModalCity] = useState<string | null>(null);

  function handlePickCity(cityId: string) {
    setModalCity(cityId);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function goTo(idx: number) {
    setCurrent(idx);
  }

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[100dvh] flex items-center overflow-x-hidden bg-[#050505]">
        {/* Brand background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#1a1a1a] to-[#050505]" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#FFC531]/20 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-[#F5D582]/10 blur-3xl" />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 w-full max-w-[90vw]">
          <div
            key={current}
            className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest animate-fade-in text-center whitespace-nowrap"
          >
            {HERO_SLIDES[current].tag}
          </div>
          <div className="flex items-center gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                className={`rounded-full transition-all duration-500 ${
                  i === current
                    ? "bg-[#FFC531] w-3 h-3"
                    : "bg-white/50 w-2 h-2 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="absolute top-0 left-0 h-1 w-full bg-[#FFC531] z-20" />

        <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#FFC531]/10 border border-[#FFC531]/30 text-[#FFC531] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6 animate-slide-up">
                {t.hero.badge}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                {t.hero.title1}{" "}
                <span className="text-[#FFC531]">{t.hero.title2}</span>
                <br />
                {t.hero.title3}
              </h1>

              <p className="text-white/70 text-lg max-w-lg mb-8 leading-relaxed animate-slide-up" style={{ animationDelay: '200ms' }}>
                {t.hero.subtitle}
              </p>

              <div className="flex flex-wrap gap-y-4 mb-10 animate-slide-up" style={{ animationDelay: '300ms' }}>
                {[
                  { value: t.hero.stat1Value, label: t.hero.stat1Label },
                  { value: t.hero.stat2Value, label: t.hero.stat2Label },
                  { value: t.hero.stat3Value, label: t.hero.stat3Label },
                ].map((s, i, arr) => (
                  <div
                    key={s.label}
                    className={`pr-6 sm:pr-8 ${i < arr.length - 1 ? "mr-6 sm:mr-8 border-r border-white/20" : ""}`}
                  >
                    <div className="text-2xl font-extrabold text-[#FFC531]">{s.value}</div>
                    <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center sm:justify-start animate-slide-up" style={{ animationDelay: '400ms' }}>
                <a
                  href={buildWaLink("hero", language)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-btn text-base font-bold shadow-lg shadow-green-900/40"
                >
                  <WhatsAppIcon />
                  {t.hero.chatBtn}
                </a>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white px-6 py-3 rounded-full font-bold hover:border-[#FFC531] hover:text-[#FFC531] transition-colors group"
                >
                  {t.hero.servicesBtn}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>

            <HeroCityPicker onPick={handlePickCity} />
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="relative z-[-1] bg-[#FFC531] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-black text-sm font-bold">
            {t.trust.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-[#050505] shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── ITINERARY BUILDER ── */}
      <ItineraryBuilder />

      {/* ── FLEET ── */}
      <section id="vehicle-options" className="py-24 bg-[#FAE7B8] scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#FFC531] font-bold text-xs uppercase tracking-widest">
              {pageCopy.fleetEyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black mt-2">
              {pageCopy.fleetTitle}
            </h2>
            <p className="text-gray-500 mt-3 max-w-3xl mx-auto text-sm">
              {pageCopy.fleetSubtitle}
            </p>
          </div>

          <ScrollReveal className="grid items-start gap-8 lg:grid-cols-[1.35fr_1fr]">
            <div className="self-start overflow-hidden rounded-[2rem] border border-[#FFC531]/30 bg-white/95 shadow-[0_24px_70px_rgba(16,32,60,0.12)]">
              <div className="relative aspect-[6/5] min-h-[320px] sm:min-h-[360px]">
                <Image
                  src={FLEET_VEHICLE_SRCS[0].src}
                  alt={alts[FLEET_VEHICLE_SRCS[0].altKey]}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
                <div className="absolute left-5 top-5 rounded-full bg-[#FFC531] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-black">
                  {pageCopy.featuredLabel}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050505]/88 via-[#050505]/52 to-transparent p-5 sm:p-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/70">
                    {primaryVehicle.tag}
                  </p>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="text-3xl font-extrabold text-white sm:text-[2rem]">
                        {primaryVehicle.name}
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-[#FFC531]">
                        {pageCopy.featuredCapacity}
                      </p>
                    </div>
                    <a
                      href={buildWaLink("fleet", language)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#050505] transition-colors hover:bg-[#FFC531]"
                    >
                      <WhatsAppIcon />
                      {pageCopy.fleetCta}
                    </a>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#050505]/8 bg-[#FFF8E3] px-6 py-5 sm:px-8">
                <p className="max-w-2xl text-sm leading-relaxed text-gray-700">
                  {pageCopy.featuredDescription}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {pageCopy.featuredPoints.map((point) => (
                    <div
                      key={point}
                      className="rounded-2xl border border-[#FFC531]/20 bg-white px-4 py-3 text-sm text-gray-700"
                    >
                      {point}
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-[#FFC531]/20 pt-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#050505]/40 mb-3">
                    {pageCopy.insideLabel}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {pageCopy.serviceHighlights.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-[#FFC531] font-bold shrink-0">✓</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#050505]/10 bg-white p-6 shadow-lg">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#050505]/50">
                {pageCopy.alternativesLabel}
              </p>
              <h3 className="mt-3 text-2xl font-extrabold text-[#050505]">
                {pageCopy.alternativesTitle}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {pageCopy.alternativesSubtitle}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {alternativeVehicles.map((vehicle, i) => (
                  <div
                    key={vehicle.name}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-[#FAE7B8]/40 transition-all duration-300 hover:-translate-y-1 hover:border-[#FFC531] hover:shadow-md"
                  >
                    <div className="relative h-40">
                      <Image
                        src={FLEET_VEHICLE_SRCS[i + 1].src}
                        alt={alts[FLEET_VEHICLE_SRCS[i + 1].altKey]}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 1024px) 50vw, 30vw"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#050505]">
                        {vehicle.tag}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-base font-extrabold text-[#050505]">{vehicle.name}</h4>
                        <span className="rounded-full bg-[#FFC531]/15 px-2.5 py-1 text-[11px] font-bold text-[#9D7400]">
                          {vehicle.capacity}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{vehicle.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="py-24 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#FFC531] font-bold text-xs uppercase tracking-widest">
              {t.services.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              {t.services.title}
            </h2>
            <p className="text-white/60 mt-3 max-w-2xl mx-auto text-sm">
              {pageCopy.servicesSubtitle}
            </p>
          </div>

          <ScrollReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.serviceItems.map((s, i) => {
              const ServiceIcon = SERVICE_ICONS[i] ?? IconCar;
              return (
              <div
                key={s.title}
                className="group relative border border-white/10 bg-white/5 rounded-2xl p-8 hover:shadow-xl hover:border-[#FFC531] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFC531]/5 rounded-bl-full group-hover:bg-[#FFC531]/10 transition-colors" />

                <div className="w-12 h-12 rounded-xl bg-[#FFC531]/15 flex items-center justify-center mb-5 group-hover:bg-[#FFC531]/25 transition-colors">
                  <ServiceIcon className="w-6 h-6 text-[#FFC531]" />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-3">{s.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-6">{s.desc}</p>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-1 text-sm font-bold text-[#FFC531] group-hover:gap-2 transition-all"
                >
                  <span>{t.services.moreBtn}</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
              );
            })}
          </ScrollReveal>

          <div className="text-center mt-12">
            <Link
              href="/services"
              className="inline-block bg-[#FFC531] text-black px-8 py-3.5 rounded-full font-bold hover:bg-white hover:text-black transition-colors"
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
              <span className="text-[#FFC531] font-bold text-xs uppercase tracking-widest">
                {t.whyUs.eyebrow}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-black mt-2 mb-4">
                {t.whyUs.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                {pageCopy.whyUsSubtitle}
              </p>

              <a
                href={buildWaLink("whyUs", language)}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn font-bold"
              >
                <WhatsAppIcon />
                {t.whyUs.consultBtn}
              </a>
            </div>

            <ScrollReveal stagger className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {t.reasonItems.map((r, i) => {
                const ReasonIcon = REASON_ICONS[i] ?? IconShield;
                return (
                <div
                  key={r.title}
                  className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#FFC531] hover:shadow-md transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#050505]/5 flex items-center justify-center mb-3">
                    <ReasonIcon className="w-4 h-4 text-[#050505]" />
                  </div>
                  <h3 className="text-black font-bold text-sm mb-1">{r.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{r.desc}</p>
                </div>
                );
              })}
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── VALUE STACK ── */}
      <section className="py-24 bg-[#050505]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[#FFC531] font-bold text-xs uppercase tracking-widest">
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
                    <span className="text-[#FFC531] font-extrabold text-lg shrink-0">✓</span>
                    <span className="text-white text-sm">{item.name}</span>
                  </div>
                  <span className="text-white/40 text-sm line-through shrink-0 ml-4">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#FFC531]/10 border-t border-[#FFC531]/30 px-6 sm:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/50 text-xs uppercase tracking-widest mb-1">{t.valueStack.totalLabel}</div>
                  <div className="text-white/40 line-through text-xl font-bold">{t.valueStack.totalValue}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#FFC531] text-xs uppercase tracking-widest font-bold mb-1">{t.valueStack.payLabel}</div>
                  <div className="text-[#FFC531] text-3xl font-extrabold">{t.valueStack.payValue}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <a
              href={buildWaLink("valueStack", language)}
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
            <div className="inline-flex items-center gap-2 bg-[#FFC531] text-black text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
              🛡️ {t.guarantee.badge}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black mt-2">
              {t.guarantee.title}
            </h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm">
              {t.guarantee.subtitle}
            </p>
          </div>

          <ScrollReveal stagger className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {t.guarantee.items.map((item) => (
              <div
                key={item.title}
                className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 hover:border-[#FFC531] hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-extrabold text-black text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-[#FAE7B8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#FFC531] font-bold text-xs uppercase tracking-widest">
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
          <ScrollReveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.testimonialItems.map((testimonial, i) => (
              <div
                key={testimonial.name}
                className={`rounded-2xl p-8 border ${
                  i === 1
                    ? "bg-[#FFC531] border-[#FFC531] shadow-xl md:scale-105"
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
          </ScrollReveal>

          {/* More reviews */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {t.moreTestimonialItems.map((testimonial) => (
              <div
                key={testimonial.name + testimonial.city}
                className="bg-white rounded-xl p-5 border border-gray-100 hover:border-[#FFC531] hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <StarRating count={testimonial.stars} />
                  <span className="text-xs text-[#FFC531] font-bold bg-[#FFC531]/10 px-2 py-0.5 rounded-full">
                    {testimonial.service}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-3 italic">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#050505]/10 flex items-center justify-center text-[#050505] text-xs font-extrabold shrink-0">
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
      <section className="relative py-24 bg-[#050505] overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#FFC531]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#FFC531]/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <span className="text-[#FFC531] font-bold text-xs uppercase tracking-widest">
            {t.cta.eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
            {pageCopy.ctaTitle}
          </h2>
          <p className="text-white/60 text-base mb-10 max-w-xl mx-auto">
            {pageCopy.ctaSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
            <a
              href={buildWaLink("cta", language)}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn text-base shadow-lg justify-center"
            >
              <WhatsAppIcon />
              {pageCopy.ctaPrimary}
            </a>
            <Link
              href="/services"
              className="inline-flex items-center justify-center gap-2 bg-[#FFC531] text-black px-6 py-3 rounded-full font-bold hover:bg-yellow-400 transition-colors group"
            >
              {pageCopy.ctaSecondary}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Hero city picker -> itinerary modal */}
      <ItineraryModal cityId={modalCity} onClose={() => setModalCity(null)} />
    </>
  );
}
