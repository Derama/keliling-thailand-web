# Keliling Thailand Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the site from scratch around private group tours (whole-vehicle bookings: sedan/SUV/van/mini bus), removing every Alphard/luxury association and the AI planner.

**Architecture:** Next.js 16 App Router. Tour data (cities, attractions, real THB prices per vehicle) lives in `lib/tours.ts` (renamed from `lib/itinerary.ts`). All copy in a rewritten `lib/translations.ts` (id/en/th) consumed via the existing `useLanguage()` context. Pages are thin server components (metadata + params) wrapping client content components. All CTAs are prefilled WhatsApp links built by `lib/site.ts` helpers.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4 (CSS-config), no test suite — verification is `npm run build` + `npm run lint` + dev walkthrough.

**Spec:** `docs/superpowers/specs/2026-06-10-keliling-thailand-redesign-design.md`

**Important:** Per AGENTS.md, this Next.js version has breaking changes. Before Tasks 4 and 7, read the relevant guides in `node_modules/next/dist/docs/` (dynamic route `params` are Promises and must be awaited; redirects config). Run all commands from the repo root.

---

## File Structure

```
lib/
  site.ts            NEW — WA_NUMBER, waLink(), fillTemplate()
  tours.ts           NEW — tour data (from itinerary.ts), price helpers
  translations.ts    REWRITTEN — id/en/th copy + cityNames + attractionNames
  itinerary.ts       DELETED (Task 2)
  openai.ts          DELETED (Task 2)
  supabase.ts        DELETED (Task 2)
components/
  Navbar.tsx         REWRITTEN — new nav links
  Footer.tsx         REWRITTEN
  FloatingWhatsApp.tsx MODIFIED — import WA_NUMBER from lib/site
  CityCard.tsx       NEW — shared by home + tours catalog
  HomeContent.tsx    REWRITTEN
  ToursContent.tsx   NEW
  TourDetailContent.tsx NEW
  FleetContent.tsx   NEW
  AboutContent.tsx   REWRITTEN
  TestimonyContent.tsx REWRITTEN
  ContactContent.tsx REWRITTEN
  ItineraryWizard.tsx, HeroCityPicker.tsx, DatePicker.tsx, LocationSearch.tsx  DELETED
app/
  page.tsx           REWRITTEN
  tours/page.tsx     NEW
  tours/[city]/page.tsx NEW
  fleet/page.tsx     NEW
  about|testimony|contact/page.tsx  REWRITTEN
  services/ city-tours/ airport-transfer/ location/  DELETED (redirects added)
  api/itinerary-suggest/ api/booking/  DELETED
  layout.tsx         MODIFIED — metadata + JSON-LD
  sitemap.xml/route.ts MODIFIED
next.config.ts       MODIFIED — redirects
```

---

### Task 0: Branch

- [ ] **Step 0.1: Create the redesign branch**

```bash
git checkout -b redesign/private-tours
```

---

### Task 1: Foundations — site constants and tour data

**Files:**
- Create: `lib/site.ts`
- Create: `lib/tours.ts`
- Rename: `public/luxury van .webp` → `public/van.webp`

- [ ] **Step 1.1: Create `lib/site.ts`**

```ts
// Site-wide constants and WhatsApp helpers.

export const WA_NUMBER = "6285750923934";

export function waLink(message: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Replace {key} tokens in a translation template, e.g. fillTemplate(t, { city: "Bangkok" }). */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}
```

- [ ] **Step 1.2: Rename the van photo**

```bash
git mv "public/luxury van .webp" public/van.webp
```

(Old components still reference `/luxury van .webp` as a runtime string — they 404 in dev until Task 2 deletes them; the build stays green.)

- [ ] **Step 1.3: Create `lib/tours.ts`**

Copy of `lib/itinerary.ts` with: `totalHours` removed (only the deleted wizard used it), van image renamed, city images switched to Unsplash (no local city photos exist — `public/itinerary/` is missing), and two new price helpers.

```ts
// Tour data model. Prices are the FINAL customer price in THB per vehicle
// per day (supplier base + margin already applied). Display names live in
// lib/translations.ts (cityNames, attractionNames, t.vehicleNames).

export type VehicleId = "altis" | "suv" | "van" | "minibus";

export interface Vehicle {
  id: VehicleId;
  pax: string; // e.g. "1-3"
  image: string;
}

export interface Attraction {
  id: string;
  hours: number; // approx visit time shown on the itinerary
}

export interface City {
  id: string;
  durationHours: 10 | 12;
  image: string;
  attractions: Attraction[];
  /** Final customer price (THB) per available vehicle. */
  prices: Partial<Record<VehicleId, number>>;
}

export const vehicles: Vehicle[] = [
  { id: "altis", pax: "1-3", image: "/Altis.webp" },
  { id: "suv", pax: "1-5", image: "/Fortuner.webp" },
  { id: "van", pax: "5-10", image: "/van.webp" },
  { id: "minibus", pax: "10-20", image: "/bus.png" },
];

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

export const cities: City[] = [
  {
    id: "bangkok",
    durationHours: 10,
    image: unsplash("photo-1563492065599-3520f775eeed"),
    prices: { altis: 3400, suv: 3700, van: 4200, minibus: 8000 },
    attractions: [
      { id: "grand-palace", hours: 2 },
      { id: "wat-pho", hours: 1.5 },
      { id: "wat-arun", hours: 1 },
      { id: "chatuchak", hours: 2 },
      { id: "asiatique", hours: 2 },
      { id: "icon-siam", hours: 2 },
      { id: "chinatown", hours: 1.5 },
    ],
  },
  {
    id: "pattaya",
    durationHours: 12,
    image: unsplash("photo-1528181304800-259b08848526"),
    prices: { altis: 3700, suv: 4300, van: 5300, minibus: 10000 },
    attractions: [
      { id: "sanctuary-of-truth", hours: 1.5 },
      { id: "nong-nooch", hours: 2.5 },
      { id: "walking-street", hours: 2 },
      { id: "coral-island", hours: 4 },
      { id: "floating-market", hours: 1.5 },
      { id: "big-buddha-hill", hours: 1 },
    ],
  },
  {
    id: "ayutthaya",
    durationHours: 10,
    image: unsplash("photo-1528702748617-c64d49f918af"),
    prices: { altis: 3400, suv: 4000, van: 4500 },
    attractions: [
      { id: "wat-mahathat", hours: 1.5 },
      { id: "wat-chaiwatthanaram", hours: 1.5 },
      { id: "bang-pa-in-palace", hours: 2 },
      { id: "wat-phra-si-sanphet", hours: 1.5 },
      { id: "ayutthaya-floating-market", hours: 2 },
      { id: "wat-lokayasutharam", hours: 1 },
    ],
  },
  {
    id: "kanchanaburi",
    durationHours: 10,
    image: unsplash("photo-1552550049-db097c9480d1"),
    prices: { altis: 4400, suv: 4900, van: 5500 },
    attractions: [
      { id: "bridge-river-kwai", hours: 1.5 },
      { id: "erawan-falls", hours: 3 },
      { id: "death-railway", hours: 2 },
      { id: "hellfire-pass", hours: 2 },
      { id: "tiger-cave-temple", hours: 1.5 },
      { id: "jeath-museum", hours: 1 },
    ],
  },
  {
    id: "huahin",
    durationHours: 12,
    image: unsplash("photo-1540541338287-41700207dee6"),
    prices: { altis: 4500, suv: 5000, van: 6000 },
    attractions: [
      { id: "cicada-market", hours: 2 },
      { id: "huahin-beach", hours: 2 },
      { id: "vana-nava", hours: 3 },
      { id: "santorini-park", hours: 2 },
      { id: "monsopra-vineyard", hours: 2 },
      { id: "huahin-railway-station", hours: 1 },
    ],
  },
  {
    id: "khaoyai",
    durationHours: 12,
    image: unsplash("photo-1469474968028-56623f02e42e"),
    prices: { altis: 4400, suv: 4900, van: 5500, minibus: 11000 },
    attractions: [
      { id: "khao-yai-national-park", hours: 4 },
      { id: "pb-valley-winery", hours: 2 },
      { id: "primo-piazza", hours: 1.5 },
      { id: "the-bloom", hours: 1.5 },
      { id: "farm-chokchai", hours: 2 },
      { id: "midwinter-green", hours: 1.5 },
    ],
  },
];

export function getCity(cityId: string): City | undefined {
  return cities.find((c) => c.id === cityId);
}

export function getPrice(cityId: string, vehicleId: VehicleId): number | undefined {
  return getCity(cityId)?.prices[vehicleId];
}

/** Vehicles actually offered for a given city (those with a price). */
export function availableVehicles(cityId: string): Vehicle[] {
  const city = getCity(cityId);
  if (!city) return [];
  return vehicles.filter((v) => city.prices[v.id] != null);
}

/** Cheapest vehicle price for a city — used for "from THB X" labels. */
export function cheapestPrice(cityId: string): number | undefined {
  const city = getCity(cityId);
  if (!city) return undefined;
  const prices = Object.values(city.prices).filter(
    (p): p is number => p != null
  );
  return prices.length ? Math.min(...prices) : undefined;
}

/** Cheapest price for a vehicle across all cities — used on the fleet page. */
export function cheapestVehiclePrice(vehicleId: VehicleId): number | undefined {
  const prices = cities
    .map((c) => c.prices[vehicleId])
    .filter((p): p is number => p != null);
  return prices.length ? Math.min(...prices) : undefined;
}
```

- [ ] **Step 1.4: Verify build**

Run: `npm run build`
Expected: compiles successfully (new files are not imported yet, but must typecheck).

- [ ] **Step 1.5: Commit**

```bash
git add lib/site.ts lib/tours.ts public
git commit -m "Add site constants and tours data module; rename van photo"
```

---

### Task 2: Skeleton swap — new translations, Navbar, Footer; delete old world

This task replaces `lib/translations.ts` and deletes every consumer of the old keys in the same commit, so the build is green at the end.

**Files:**
- Rewrite: `lib/translations.ts`
- Rewrite: `components/Navbar.tsx`
- Rewrite: `components/Footer.tsx`
- Modify: `components/FloatingWhatsApp.tsx`
- Rewrite: `app/page.tsx` (temporary shell — final version in Task 3)
- Delete: `components/HomeContent.tsx`, `components/ServicesContent.tsx`, `components/AirportTransferContent.tsx`, `components/CityToursContent.tsx`, `components/AboutContent.tsx`, `components/ContactContent.tsx`, `components/LocationContent.tsx`, `components/TestimonyContent.tsx`, `components/ItineraryWizard.tsx`, `components/HeroCityPicker.tsx`, `components/DatePicker.tsx`, `components/LocationSearch.tsx`
- Delete: `lib/itinerary.ts`, `lib/openai.ts`, `lib/supabase.ts`
- Delete: `app/services/`, `app/city-tours/`, `app/airport-transfer/`, `app/location/`, `app/about/`, `app/testimony/`, `app/contact/` (last three recreated in Task 6), `app/api/itinerary-suggest/`, `app/api/booking/`

- [ ] **Step 2.1: Save the old testimonials before overwriting**

```bash
git show HEAD:lib/translations.ts > /tmp/old-translations.ts
```

The arrays to carry over are `testimonialItems` and `moreTestimonialItems` at `/tmp/old-translations.ts` lines ~193 (id), ~530 (en), ~866 (th). Item shape: `{ name, city, text, stars }`.

- [ ] **Step 2.2: Rewrite `lib/translations.ts`**

Full new file. Where a comment says `/* PASTE … */`, paste the corresponding language's `testimonialItems` followed by `moreTestimonialItems` entries from `/tmp/old-translations.ts`, unchanged.

```ts
export type Language = "id" | "en" | "th";

// Proper nouns — identical across languages.
export const cityNames: Record<string, string> = {
  bangkok: "Bangkok",
  pattaya: "Pattaya",
  ayutthaya: "Ayutthaya",
  kanchanaburi: "Kanchanaburi",
  huahin: "Hua Hin",
  khaoyai: "Khao Yai",
};

export const attractionNames: Record<string, string> = {
  "grand-palace": "Grand Palace",
  "wat-pho": "Wat Pho",
  "wat-arun": "Wat Arun",
  chatuchak: "Chatuchak Market",
  asiatique: "Asiatique Riverfront",
  "icon-siam": "ICONSIAM",
  chinatown: "Chinatown (Yaowarat)",
  "sanctuary-of-truth": "Sanctuary of Truth",
  "nong-nooch": "Nong Nooch Tropical Garden",
  "walking-street": "Walking Street",
  "coral-island": "Coral Island (Koh Larn)",
  "floating-market": "Pattaya Floating Market",
  "big-buddha-hill": "Big Buddha Hill",
  "wat-mahathat": "Wat Mahathat",
  "wat-chaiwatthanaram": "Wat Chaiwatthanaram",
  "bang-pa-in-palace": "Bang Pa-In Palace",
  "wat-phra-si-sanphet": "Wat Phra Si Sanphet",
  "ayutthaya-floating-market": "Ayutthaya Floating Market",
  "wat-lokayasutharam": "Wat Lokayasutharam",
  "bridge-river-kwai": "Bridge over the River Kwai",
  "erawan-falls": "Erawan Waterfalls",
  "death-railway": "Death Railway",
  "hellfire-pass": "Hellfire Pass",
  "tiger-cave-temple": "Tiger Cave Temple (Wat Tham Suea)",
  "jeath-museum": "JEATH War Museum",
  "cicada-market": "Cicada Market",
  "huahin-beach": "Hua Hin Beach",
  "vana-nava": "Vana Nava Water Jungle",
  "santorini-park": "Santorini Park",
  "monsopra-vineyard": "Monsoon Valley Vineyard",
  "huahin-railway-station": "Hua Hin Railway Station",
  "khao-yai-national-park": "Khao Yai National Park",
  "pb-valley-winery": "PB Valley Winery",
  "primo-piazza": "Primo Piazza",
  "the-bloom": "The Bloom Orchid Park",
  "farm-chokchai": "Farm Chokchai",
  "midwinter-green": "Midwinter Green",
};

export const translations = {
  id: {
    nav: {
      home: "Beranda",
      tours: "Tur",
      fleet: "Armada & Harga",
      about: "Tentang Kami",
      testimony: "Testimoni",
      contact: "Kontak",
    },
    common: {
      whatsapp: "Chat WhatsApp",
      from: "Mulai",
      pax: "penumpang",
      hours: "jam",
      thb: "THB",
    },
    vehicleNames: {
      altis: "Sedan (Altis)",
      suv: "SUV (Fortuner)",
      van: "Van",
      minibus: "Mini Bus",
    },
    home: {
      heroTitle: "Tur privat keliling Thailand untuk rombongan Anda",
      heroSubtitle:
        "Kendaraan pribadi, sopir berpengalaman, dan itinerary sesuai keinginan. Sedan, SUV, van, hingga mini bus untuk 1–20 orang.",
      ctaTours: "Pilih Destinasi",
      ctaFleet: "Lihat Armada",
      howTitle: "Cara Pesan",
      how1Title: "Pilih kota",
      how1Desc: "Bangkok, Pattaya, Ayutthaya, dan lainnya — itinerary sudah kami siapkan.",
      how2Title: "Pilih kendaraan",
      how2Desc: "Sesuaikan dengan jumlah rombongan: sedan sampai mini bus.",
      how3Title: "Chat WhatsApp",
      how3Desc: "Konfirmasi tanggal dan detail langsung dengan tim kami.",
      destinationsTitle: "Destinasi Populer",
      destinationsSubtitle: "Tur privat sehari penuh dengan kendaraan dan sopir pribadi.",
      fleetTitle: "Armada Kami",
      fleetSubtitle: "Dari pasangan berdua sampai rombongan kantor 20 orang.",
      fleetSeeAll: "Lihat Semua Armada",
      trustTitle: "Apa Kata Mereka",
      trustSeeAll: "Lihat Semua Testimoni",
      ctaBandTitle: "Siap jalan-jalan keliling Thailand?",
      ctaBandSubtitle: "Konsultasi gratis — tim kami balas cepat di WhatsApp.",
      waMessage: "Halo Keliling Thailand! Saya mau tanya tur privat untuk rombongan saya.",
    },
    tours: {
      title: "Tur Privat per Kota",
      subtitle:
        "Semua tur bersifat privat: satu kendaraan khusus untuk rombongan Anda. Harga per mobil, bukan per orang.",
      attractions: "tempat wisata",
      viewDetail: "Lihat Itinerary",
    },
    tourDetail: {
      itineraryTitle: "Itinerary",
      includedTitle: "Sudah Termasuk",
      excludedTitle: "Belum Termasuk",
      includedItems: ["Kendaraan privat + sopir", "BBM", "Tol", "Parkir"],
      excludedItems: ["Tiket masuk wisata", "Makan", "Pengeluaran pribadi"],
      chooseVehicle: "Pilih Kendaraan",
      duration: "Durasi",
      priceNote: "Harga per kendaraan per hari, bukan per orang.",
      waButton: "Booking via WhatsApp",
      waMessage:
        "Halo Keliling Thailand! Saya mau booking tur privat {city} ({duration} jam) dengan {vehicle}. Mohon info ketersediaan.",
    },
    fleet: {
      title: "Armada & Harga",
      subtitle:
        "Semua harga per kendaraan per hari, sudah termasuk sopir, BBM, tol, dan parkir.",
      fromPrice: "Mulai {price} THB/hari",
      vehicles: {
        altis: {
          name: "Sedan — Toyota Altis",
          pax: "1–3 penumpang",
          desc: "Pas untuk pasangan atau solo traveler. Nyaman dan hemat.",
        },
        suv: {
          name: "SUV — Toyota Fortuner",
          pax: "1–5 penumpang",
          desc: "Keluarga kecil dengan bagasi besar. Kabin tinggi dan lega.",
        },
        van: {
          name: "Van",
          pax: "5–10 penumpang",
          desc: "Favorit rombongan keluarga. Ruang luas untuk koper.",
        },
        minibus: {
          name: "Mini Bus",
          pax: "10–20 penumpang",
          desc: "Rombongan kantor, komunitas, atau keluarga besar.",
        },
      },
      airportTitle: "Airport Transfer",
      airportDesc:
        "Penjemputan di Suvarnabhumi (BKK) dan Don Mueang (DMK) ke hotel Anda — atau sebaliknya. Harga menyesuaikan tujuan, tanya langsung via WhatsApp.",
      airportCta: "Tanya Harga Transfer",
      airportWaMessage: "Halo Keliling Thailand! Saya mau tanya harga airport transfer.",
      waMessage: "Halo Keliling Thailand! Saya mau tanya sewa {vehicle}.",
    },
    about: {
      title: "Tentang Keliling Thailand",
      p1: "Keliling Thailand adalah layanan tur privat untuk wisatawan Indonesia di Thailand. Kami menyediakan kendaraan dengan sopir untuk tur kota, day trip, dan airport transfer.",
      p2: "Semua tur bersifat privat: satu kendaraan khusus untuk rombongan Anda — keluarga, kantor, maupun komunitas — dengan itinerary yang bisa disesuaikan.",
      whyTitle: "Kenapa Kami",
      why: [
        { title: "Privat sepenuhnya", desc: "Tidak digabung dengan tamu lain. Kendaraan dan sopir khusus untuk Anda." },
        { title: "Harga per mobil", desc: "Bukan per orang — makin ramai makin hemat." },
        { title: "Sopir berpengalaman", desc: "Paham rute wisata dan kebutuhan tamu Indonesia." },
        { title: "Armada lengkap", desc: "Sedan, SUV, van, dan mini bus untuk 1–20 penumpang." },
      ],
    },
    testimony: {
      title: "Apa Kata Pelanggan Kami",
      subtitle: "Cerita nyata dari rombongan yang sudah jalan bersama kami.",
      items: [
        /* PASTE id testimonialItems + moreTestimonialItems from /tmp/old-translations.ts */
      ],
    },
    contact: {
      title: "Hubungi Kami",
      subtitle: "Cara tercepat: WhatsApp. Kami balas cepat di jam operasional.",
      waTitle: "WhatsApp",
      waDesc: "Respon cepat, bisa Bahasa Indonesia.",
      waButton: "Chat Sekarang",
      waMessage: "Halo Keliling Thailand! Saya mau tanya-tanya dulu.",
      locationTitle: "Lokasi",
      locationDesc: "Bangkok, Thailand",
      hoursTitle: "Jam Operasional",
      hoursDesc: "Setiap hari, 08.00–20.00 (waktu Bangkok)",
    },
    footer: {
      tagline: "Tur privat keliling Thailand — kendaraan, sopir, dan itinerary untuk rombongan Anda.",
      linksTitle: "Halaman",
      contactTitle: "Kontak",
      rights: "Hak cipta dilindungi.",
    },
  },
  en: {
    nav: {
      home: "Home",
      tours: "Tours",
      fleet: "Fleet & Prices",
      about: "About Us",
      testimony: "Testimonials",
      contact: "Contact",
    },
    common: {
      whatsapp: "Chat on WhatsApp",
      from: "From",
      pax: "passengers",
      hours: "hours",
      thb: "THB",
    },
    vehicleNames: {
      altis: "Sedan (Altis)",
      suv: "SUV (Fortuner)",
      van: "Van",
      minibus: "Mini Bus",
    },
    home: {
      heroTitle: "Private tours around Thailand for your group",
      heroSubtitle:
        "Your own vehicle, an experienced driver, and an itinerary that fits you. Sedan, SUV, van, or mini bus for 1–20 people.",
      ctaTours: "Pick a Destination",
      ctaFleet: "See the Fleet",
      howTitle: "How It Works",
      how1Title: "Pick a city",
      how1Desc: "Bangkok, Pattaya, Ayutthaya and more — itineraries are ready.",
      how2Title: "Pick a vehicle",
      how2Desc: "Match your group size: sedan up to mini bus.",
      how3Title: "Chat on WhatsApp",
      how3Desc: "Confirm dates and details directly with our team.",
      destinationsTitle: "Popular Destinations",
      destinationsSubtitle: "Full-day private tours with your own vehicle and driver.",
      fleetTitle: "Our Fleet",
      fleetSubtitle: "From a couple to an office group of 20.",
      fleetSeeAll: "See All Vehicles",
      trustTitle: "What They Say",
      trustSeeAll: "See All Testimonials",
      ctaBandTitle: "Ready to explore Thailand?",
      ctaBandSubtitle: "Free consultation — our team replies fast on WhatsApp.",
      waMessage: "Hello Keliling Thailand! I'd like to ask about a private tour for my group.",
    },
    tours: {
      title: "Private Tours by City",
      subtitle:
        "Every tour is private: one vehicle exclusively for your group. Priced per vehicle, not per person.",
      attractions: "attractions",
      viewDetail: "View Itinerary",
    },
    tourDetail: {
      itineraryTitle: "Itinerary",
      includedTitle: "Included",
      excludedTitle: "Not Included",
      includedItems: ["Private vehicle + driver", "Fuel", "Tolls", "Parking"],
      excludedItems: ["Attraction tickets", "Meals", "Personal expenses"],
      chooseVehicle: "Choose a Vehicle",
      duration: "Duration",
      priceNote: "Price per vehicle per day, not per person.",
      waButton: "Book via WhatsApp",
      waMessage:
        "Hello Keliling Thailand! I'd like to book a private {city} tour ({duration} hours) with a {vehicle}. Please share availability.",
    },
    fleet: {
      title: "Fleet & Prices",
      subtitle: "All prices per vehicle per day, including driver, fuel, tolls, and parking.",
      fromPrice: "From {price} THB/day",
      vehicles: {
        altis: {
          name: "Sedan — Toyota Altis",
          pax: "1–3 passengers",
          desc: "Great for couples or solo travelers. Comfortable and economical.",
        },
        suv: {
          name: "SUV — Toyota Fortuner",
          pax: "1–5 passengers",
          desc: "Small families with big luggage. Tall, spacious cabin.",
        },
        van: {
          name: "Van",
          pax: "5–10 passengers",
          desc: "Family-group favorite. Plenty of room for suitcases.",
        },
        minibus: {
          name: "Mini Bus",
          pax: "10–20 passengers",
          desc: "Office trips, communities, or big families.",
        },
      },
      airportTitle: "Airport Transfer",
      airportDesc:
        "Pickup at Suvarnabhumi (BKK) or Don Mueang (DMK) to your hotel — or the other way around. Prices depend on destination; ask us on WhatsApp.",
      airportCta: "Ask Transfer Price",
      airportWaMessage: "Hello Keliling Thailand! I'd like to ask about airport transfer prices.",
      waMessage: "Hello Keliling Thailand! I'd like to ask about renting a {vehicle}.",
    },
    about: {
      title: "About Keliling Thailand",
      p1: "Keliling Thailand is a private tour service for Indonesian travelers in Thailand. We provide chauffeured vehicles for city tours, day trips, and airport transfers.",
      p2: "Every tour is private: one vehicle dedicated to your group — family, office, or community — with an itinerary you can adjust.",
      whyTitle: "Why Us",
      why: [
        { title: "Fully private", desc: "Never mixed with other guests. The vehicle and driver are yours." },
        { title: "Per-vehicle pricing", desc: "Not per person — the bigger your group, the cheaper per head." },
        { title: "Experienced drivers", desc: "They know the tourist routes and Indonesian guests' needs." },
        { title: "Complete fleet", desc: "Sedan, SUV, van, and mini bus for 1–20 passengers." },
      ],
    },
    testimony: {
      title: "What Our Customers Say",
      subtitle: "Real stories from groups that traveled with us.",
      items: [
        /* PASTE en testimonialItems + moreTestimonialItems from /tmp/old-translations.ts */
      ],
    },
    contact: {
      title: "Contact Us",
      subtitle: "Fastest way: WhatsApp. We reply quickly during operating hours.",
      waTitle: "WhatsApp",
      waDesc: "Fast response, English and Indonesian spoken.",
      waButton: "Chat Now",
      waMessage: "Hello Keliling Thailand! I have a few questions.",
      locationTitle: "Location",
      locationDesc: "Bangkok, Thailand",
      hoursTitle: "Operating Hours",
      hoursDesc: "Every day, 08:00–20:00 (Bangkok time)",
    },
    footer: {
      tagline: "Private tours around Thailand — vehicle, driver, and itinerary for your group.",
      linksTitle: "Pages",
      contactTitle: "Contact",
      rights: "All rights reserved.",
    },
  },
  th: {
    nav: {
      home: "หน้าแรก",
      tours: "ทัวร์",
      fleet: "รถและราคา",
      about: "เกี่ยวกับเรา",
      testimony: "รีวิว",
      contact: "ติดต่อ",
    },
    common: {
      whatsapp: "แชท WhatsApp",
      from: "เริ่มต้น",
      pax: "ที่นั่ง",
      hours: "ชั่วโมง",
      thb: "บาท",
    },
    vehicleNames: {
      altis: "รถเก๋ง (Altis)",
      suv: "SUV (Fortuner)",
      van: "รถตู้",
      minibus: "มินิบัส",
    },
    home: {
      heroTitle: "ทัวร์ส่วนตัวทั่วไทยสำหรับกรุ๊ปของคุณ",
      heroSubtitle:
        "รถส่วนตัว คนขับมืออาชีพ และแผนเที่ยวที่ปรับได้ตามใจ มีรถเก๋ง SUV รถตู้ และมินิบัส รองรับ 1–20 คน",
      ctaTours: "เลือกจุดหมาย",
      ctaFleet: "ดูรถของเรา",
      howTitle: "วิธีจอง",
      how1Title: "เลือกเมือง",
      how1Desc: "กรุงเทพฯ พัทยา อยุธยา และอื่น ๆ — แผนเที่ยวพร้อมแล้ว",
      how2Title: "เลือกรถ",
      how2Desc: "เลือกตามขนาดกรุ๊ป ตั้งแต่รถเก๋งถึงมินิบัส",
      how3Title: "แชท WhatsApp",
      how3Desc: "ยืนยันวันที่และรายละเอียดกับทีมงานโดยตรง",
      destinationsTitle: "จุดหมายยอดนิยม",
      destinationsSubtitle: "ทัวร์ส่วนตัวเต็มวันพร้อมรถและคนขับส่วนตัว",
      fleetTitle: "รถของเรา",
      fleetSubtitle: "ตั้งแต่คู่รักจนถึงกรุ๊ปบริษัท 20 คน",
      fleetSeeAll: "ดูรถทั้งหมด",
      trustTitle: "เสียงจากลูกค้า",
      trustSeeAll: "ดูรีวิวทั้งหมด",
      ctaBandTitle: "พร้อมเที่ยวทั่วไทยหรือยัง?",
      ctaBandSubtitle: "ปรึกษาฟรี — ทีมงานตอบไวทาง WhatsApp",
      waMessage: "สวัสดีค่ะ/ครับ Keliling Thailand! ขอสอบถามทัวร์ส่วนตัวสำหรับกรุ๊ปของฉัน",
    },
    tours: {
      title: "ทัวร์ส่วนตัวรายเมือง",
      subtitle: "ทุกทัวร์เป็นแบบส่วนตัว: รถหนึ่งคันสำหรับกรุ๊ปของคุณเท่านั้น คิดราคาต่อคัน ไม่ใช่ต่อคน",
      attractions: "ที่เที่ยว",
      viewDetail: "ดูแผนเที่ยว",
    },
    tourDetail: {
      itineraryTitle: "แผนเที่ยว",
      includedTitle: "รวมในราคา",
      excludedTitle: "ไม่รวม",
      includedItems: ["รถส่วนตัว + คนขับ", "น้ำมัน", "ทางด่วน", "ที่จอดรถ"],
      excludedItems: ["ค่าเข้าชมสถานที่", "อาหาร", "ค่าใช้จ่ายส่วนตัว"],
      chooseVehicle: "เลือกรถ",
      duration: "ระยะเวลา",
      priceNote: "ราคาต่อคันต่อวัน ไม่ใช่ต่อคน",
      waButton: "จองผ่าน WhatsApp",
      waMessage:
        "สวัสดีค่ะ/ครับ Keliling Thailand! ต้องการจองทัวร์ส่วนตัว {city} ({duration} ชั่วโมง) ด้วย {vehicle} ขอข้อมูลวันว่างด้วยค่ะ/ครับ",
    },
    fleet: {
      title: "รถและราคา",
      subtitle: "ราคาต่อคันต่อวัน รวมคนขับ น้ำมัน ทางด่วน และที่จอดรถ",
      fromPrice: "เริ่มต้น {price} บาท/วัน",
      vehicles: {
        altis: {
          name: "รถเก๋ง — Toyota Altis",
          pax: "1–3 ที่นั่ง",
          desc: "เหมาะกับคู่รักหรือเที่ยวคนเดียว สะดวกและประหยัด",
        },
        suv: {
          name: "SUV — Toyota Fortuner",
          pax: "1–5 ที่นั่ง",
          desc: "ครอบครัวเล็กพร้อมสัมภาระเยอะ ห้องโดยสารกว้าง",
        },
        van: {
          name: "รถตู้",
          pax: "5–10 ที่นั่ง",
          desc: "ยอดนิยมของกรุ๊ปครอบครัว ที่เก็บกระเป๋ากว้างขวาง",
        },
        minibus: {
          name: "มินิบัส",
          pax: "10–20 ที่นั่ง",
          desc: "กรุ๊ปบริษัท ชุมชน หรือครอบครัวใหญ่",
        },
      },
      airportTitle: "รับส่งสนามบิน",
      airportDesc:
        "รับที่สุวรรณภูมิ (BKK) หรือดอนเมือง (DMK) ไปโรงแรมของคุณ — หรือขากลับ ราคาขึ้นกับจุดหมาย สอบถามทาง WhatsApp",
      airportCta: "สอบถามราคารับส่ง",
      airportWaMessage: "สวัสดีค่ะ/ครับ Keliling Thailand! ขอสอบถามราคารับส่งสนามบิน",
      waMessage: "สวัสดีค่ะ/ครับ Keliling Thailand! ขอสอบถามเช่า {vehicle}",
    },
    about: {
      title: "เกี่ยวกับ Keliling Thailand",
      p1: "Keliling Thailand คือบริการทัวร์ส่วนตัวสำหรับนักท่องเที่ยวชาวอินโดนีเซียในประเทศไทย เรามีรถพร้อมคนขับสำหรับซิตี้ทัวร์ เดย์ทริป และรับส่งสนามบิน",
      p2: "ทุกทัวร์เป็นแบบส่วนตัว: รถหนึ่งคันสำหรับกรุ๊ปของคุณ — ครอบครัว บริษัท หรือชุมชน — พร้อมแผนเที่ยวที่ปรับได้",
      whyTitle: "ทำไมต้องเรา",
      why: [
        { title: "ส่วนตัวเต็มรูปแบบ", desc: "ไม่รวมกับแขกท่านอื่น รถและคนขับเป็นของคุณคนเดียว" },
        { title: "ราคาต่อคัน", desc: "ไม่ใช่ต่อคน — ยิ่งมากันเยอะ ยิ่งคุ้ม" },
        { title: "คนขับมีประสบการณ์", desc: "รู้เส้นทางท่องเที่ยวและเข้าใจแขกชาวอินโดนีเซีย" },
        { title: "รถครบทุกขนาด", desc: "รถเก๋ง SUV รถตู้ และมินิบัส รองรับ 1–20 คน" },
      ],
    },
    testimony: {
      title: "ลูกค้าของเราพูดว่าอะไร",
      subtitle: "เรื่องจริงจากกรุ๊ปที่เดินทางกับเรา",
      items: [
        /* PASTE th testimonialItems + moreTestimonialItems from /tmp/old-translations.ts */
      ],
    },
    contact: {
      title: "ติดต่อเรา",
      subtitle: "ช่องทางที่เร็วที่สุด: WhatsApp เราตอบไวในเวลาทำการ",
      waTitle: "WhatsApp",
      waDesc: "ตอบไว สื่อสารได้ทั้งอังกฤษและอินโดนีเซีย",
      waButton: "แชทเลย",
      waMessage: "สวัสดีค่ะ/ครับ Keliling Thailand! ขอสอบถามข้อมูลก่อน",
      locationTitle: "ที่ตั้ง",
      locationDesc: "กรุงเทพฯ ประเทศไทย",
      hoursTitle: "เวลาทำการ",
      hoursDesc: "ทุกวัน 08.00–20.00 น. (เวลากรุงเทพฯ)",
    },
    footer: {
      tagline: "ทัวร์ส่วนตัวทั่วไทย — รถ คนขับ และแผนเที่ยวสำหรับกรุ๊ปของคุณ",
      linksTitle: "หน้าเพจ",
      contactTitle: "ติดต่อ",
      rights: "สงวนลิขสิทธิ์",
    },
  },
} as const;
```

Note: `testimony.items` must end up with the same number of entries in all three languages (same people, same order) — the old file guarantees this.

- [ ] **Step 2.3: Rewrite `components/Navbar.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageContext";
import { Language } from "@/lib/translations";

const LANGS: { code: Language; label: string }[] = [
  { code: "id", label: "ID" },
  { code: "en", label: "EN" },
  { code: "th", label: "TH" },
];

export default function Navbar() {
  const { t, language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/tours", label: t.nav.tours },
    { href: "/fleet", label: t.nav.fleet },
    { href: "/about", label: t.nav.about },
    { href: "/testimony", label: t.nav.testimony },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors ${
        scrolled || open ? "bg-[#1B2A4A] shadow-lg" : "bg-[#1B2A4A]/80 backdrop-blur"
      }`}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/Logo.png" alt="Keliling Thailand" width={36} height={36} />
          <span className="text-white font-bold">Keliling Thailand</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                pathname === l.href ? "text-[#F5C518]" : "text-white hover:text-[#F5C518]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-1 ml-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-2 py-1 text-xs font-bold rounded ${
                  language === l.code
                    ? "bg-[#F5C518] text-[#1B2A4A]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="md:hidden text-white p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-[#1B2A4A] border-t border-white/10 px-4 pb-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-3 text-white font-medium border-b border-white/5"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-3">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-3 py-1 text-sm font-bold rounded ${
                  language === l.code ? "bg-[#F5C518] text-[#1B2A4A]" : "text-white/70"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2.4: Rewrite `components/Footer.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { waLink, WA_NUMBER } from "@/lib/site";

export default function Footer() {
  const { t } = useLanguage();

  const links = [
    { href: "/tours", label: t.nav.tours },
    { href: "/fleet", label: t.nav.fleet },
    { href: "/about", label: t.nav.about },
    { href: "/testimony", label: t.nav.testimony },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <footer className="bg-[#1B2A4A] text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-bold text-lg mb-2">Keliling Thailand</p>
          <p className="text-sm text-white/70">{t.footer.tagline}</p>
        </div>
        <div>
          <p className="font-bold mb-3">{t.footer.linksTitle}</p>
          <ul className="space-y-2 text-sm text-white/70">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-[#F5C518]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-bold mb-3">{t.footer.contactTitle}</p>
          <a
            href={waLink(t.home.waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/70 hover:text-[#25D366]"
          >
            WhatsApp +{WA_NUMBER}
          </a>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Keliling Thailand. {t.footer.rights}
      </div>
    </footer>
  );
}
```

- [ ] **Step 2.5: Update `components/FloatingWhatsApp.tsx`**

Replace the local constant `const WA_NUMBER = "6285750923934";` (line 5) with an import:

```tsx
import { WA_NUMBER } from "@/lib/site";
```

Everything else in the file stays unchanged.

- [ ] **Step 2.6: Replace `app/page.tsx` with a temporary shell**

```tsx
import Link from "next/link";

// Temporary shell — replaced with the full homepage in Task 3.
export default function Home() {
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center gap-4 pt-16">
      <h1 className="text-3xl font-extrabold text-[#1B2A4A]">Keliling Thailand</h1>
      <Link href="/tours" className="underline text-[#1B2A4A]">
        Tours
      </Link>
    </section>
  );
}
```

- [ ] **Step 2.7: Delete the old world**

```bash
git rm -r app/services app/city-tours app/airport-transfer app/location \
  app/about app/testimony app/contact app/api/itinerary-suggest app/api/booking
git rm components/HomeContent.tsx components/ServicesContent.tsx \
  components/AirportTransferContent.tsx components/CityToursContent.tsx \
  components/AboutContent.tsx components/ContactContent.tsx \
  components/LocationContent.tsx components/TestimonyContent.tsx \
  components/ItineraryWizard.tsx components/HeroCityPicker.tsx \
  components/DatePicker.tsx components/LocationSearch.tsx
git rm lib/itinerary.ts lib/openai.ts lib/supabase.ts
```

- [ ] **Step 2.8: Check for stragglers**

Run: `grep -rn "itinerary\|openai\|supabase\|HomeContent\|extendedTranslations" app components lib --include="*.ts" --include="*.tsx" | grep -v tours.ts | grep -v node_modules`
Expected: no output (except possibly the word "itinerary" inside `tours.ts` comments / `tourDetail.itineraryTitle` in translations — those are fine). Fix any real import of a deleted module.

- [ ] **Step 2.9: Verify build**

Run: `npm run build`
Expected: compiles. The sitemap still lists dead routes and `layout.tsx` JSON-LD still references old URLs — both fixed in Task 7; they don't break the build.

- [ ] **Step 2.10: Commit**

```bash
git add -A
git commit -m "Swap site skeleton: new translations, navbar, footer; remove AI planner and legacy pages"
```

---

### Task 3: Homepage

**Files:**
- Create: `components/CityCard.tsx`
- Create: `components/HomeContent.tsx`
- Rewrite: `app/page.tsx`

- [ ] **Step 3.1: Create `components/CityCard.tsx`**

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { City, cheapestPrice } from "@/lib/tours";
import { cityNames } from "@/lib/translations";

export default function CityCard({ city }: { city: City }) {
  const { t } = useLanguage();
  const price = cheapestPrice(city.id);

  return (
    <Link
      href={`/tours/${city.id}`}
      className="group rounded-2xl overflow-hidden bg-white shadow hover:shadow-xl transition-shadow"
    >
      <div className="relative h-48">
        <Image
          src={city.image}
          alt={cityNames[city.id]}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[#1B2A4A] text-lg">{cityNames[city.id]}</h3>
        <p className="text-sm text-gray-500">
          {city.durationHours} {t.common.hours} · {city.attractions.length}{" "}
          {t.tours.attractions}
        </p>
        {price != null && (
          <p className="mt-2 text-sm font-bold text-[#1B2A4A]">
            {t.common.from} {price.toLocaleString()} {t.common.thb}
          </p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 3.2: Create `components/HomeContent.tsx`**

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { cities, vehicles } from "@/lib/tours";
import { waLink } from "@/lib/site";
import CityCard from "@/components/CityCard";
import ScrollReveal from "@/components/ScrollReveal";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1600&q=80&auto=format&fit=crop";

export default function HomeContent() {
  const { t } = useLanguage();

  const steps = [
    { title: t.home.how1Title, desc: t.home.how1Desc },
    { title: t.home.how2Title, desc: t.home.how2Desc },
    { title: t.home.how3Title, desc: t.home.how3Desc },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center">
        <Image src={HERO_IMAGE} alt="Thailand" fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-[#1B2A4A]/60" />
        <div className="relative max-w-6xl mx-auto px-4 py-32 text-center text-white">
          <h1 className="text-4xl sm:text-5xl font-extrabold max-w-3xl mx-auto leading-tight">
            {t.home.heroTitle}
          </h1>
          <p className="mt-4 text-lg text-white/85 max-w-2xl mx-auto">{t.home.heroSubtitle}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/tours"
              className="bg-[#F5C518] text-[#1B2A4A] font-bold px-8 py-3 rounded-full hover:brightness-95 transition"
            >
              {t.home.ctaTours}
            </Link>
            <Link
              href="/fleet"
              className="border-2 border-white font-bold px-8 py-3 rounded-full hover:bg-white hover:text-[#1B2A4A] transition"
            >
              {t.home.ctaFleet}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <ScrollReveal>
          <h2 className="text-3xl font-extrabold text-[#1B2A4A] text-center">{t.home.howTitle}</h2>
          <div className="grid sm:grid-cols-3 gap-6 mt-10">
            {steps.map((s, i) => (
              <div key={s.title} className="text-center px-4">
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
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="text-3xl font-extrabold text-[#1B2A4A]">{t.home.destinationsTitle}</h2>
            <p className="text-gray-600 mt-1">{t.home.destinationsSubtitle}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {cities.map((c) => (
                <CityCard key={c.id} city={c} />
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
                  <Image src={v.image} alt={t.vehicleNames[v.id]} fill className="object-contain" sizes="25vw" />
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
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="text-3xl font-extrabold text-[#1B2A4A]">{t.home.trustTitle}</h2>
            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              {t.testimony.items.slice(0, 3).map((item) => (
                <figure key={item.name} className="bg-white rounded-2xl p-5 shadow-sm">
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
    </main>
  );
}
```

- [ ] **Step 3.3: Rewrite `app/page.tsx`**

```tsx
import HomeContent from "@/components/HomeContent";

export default function Home() {
  return <HomeContent />;
}
```

- [ ] **Step 3.4: Verify build, eyeball in dev**

Run: `npm run build`
Expected: compiles. Then `npm run dev` and check `localhost:3000` renders hero, steps, 6 city cards, 4 vehicles, 3 testimonials, CTA band. If the hero or any city Unsplash image 404s, replace its photo ID with another Unsplash photo of the same subject and re-check.

- [ ] **Step 3.5: Commit**

```bash
git add components/CityCard.tsx components/HomeContent.tsx app/page.tsx lib/tours.ts
git commit -m "Build new homepage: hero, how-it-works, destinations, fleet strip, testimonials"
```

---

### Task 4: Tours catalog and tour detail

Before coding, skim `node_modules/next/dist/docs/` for the dynamic-routes guide — in this Next.js version `params` is a Promise and must be awaited.

**Files:**
- Create: `components/ToursContent.tsx`
- Create: `components/TourDetailContent.tsx`
- Create: `app/tours/page.tsx`
- Create: `app/tours/[city]/page.tsx`

- [ ] **Step 4.1: Create `components/ToursContent.tsx`**

```tsx
"use client";

import { useLanguage } from "@/components/LanguageContext";
import { cities } from "@/lib/tours";
import CityCard from "@/components/CityCard";

export default function ToursContent() {
  const { t } = useLanguage();

  return (
    <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.tours.title}</h1>
      <p className="text-gray-600 mt-2 max-w-2xl">{t.tours.subtitle}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {cities.map((c) => (
          <CityCard key={c.id} city={c} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4.2: Create `components/TourDetailContent.tsx`**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { getCity, availableVehicles, VehicleId } from "@/lib/tours";
import { cityNames, attractionNames } from "@/lib/translations";
import { waLink, fillTemplate } from "@/lib/site";

export default function TourDetailContent({ cityId }: { cityId: string }) {
  const { t } = useLanguage();
  const city = getCity(cityId)!; // page calls notFound() for unknown cities
  const vehicleOptions = availableVehicles(cityId);
  const [selected, setSelected] = useState<VehicleId>(vehicleOptions[0].id);

  const waMessage = fillTemplate(t.tourDetail.waMessage, {
    city: cityNames[cityId],
    duration: city.durationHours,
    vehicle: t.vehicleNames[selected],
  });

  return (
    <main className="pt-16">
      <section className="relative h-64 sm:h-80">
        <Image
          src={city.image}
          alt={cityNames[cityId]}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#1B2A4A]/50 flex items-end">
          <div className="max-w-6xl mx-auto w-full px-4 pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              {cityNames[cityId]}
            </h1>
            <p className="text-white/80">
              {t.tourDetail.duration}: {city.durationHours} {t.common.hours}
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2A4A] mb-4">
            {t.tourDetail.itineraryTitle}
          </h2>
          <ol className="relative border-l-2 border-[#F5C518] ml-2 space-y-4">
            {city.attractions.map((a) => (
              <li key={a.id} className="ml-5 relative">
                <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[#F5C518]" />
                <p className="font-semibold text-[#1B2A4A]">{attractionNames[a.id]}</p>
                <p className="text-sm text-gray-500">
                  ±{a.hours} {t.common.hours}
                </p>
              </li>
            ))}
          </ol>

          <div className="grid sm:grid-cols-2 gap-6 mt-10">
            <div>
              <h3 className="font-bold text-[#1B2A4A] mb-2">{t.tourDetail.includedTitle}</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {t.tourDetail.includedItems.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-[#1B2A4A] mb-2">{t.tourDetail.excludedTitle}</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {t.tourDetail.excludedItems.map((item) => (
                  <li key={item}>✗ {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-[#1B2A4A] mb-3">{t.tourDetail.chooseVehicle}</h2>
          <div className="space-y-2">
            {vehicleOptions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                  selected === v.id
                    ? "border-[#F5C518] bg-[#F5C518]/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span>
                  <span className="block font-semibold text-[#1B2A4A]">
                    {t.vehicleNames[v.id]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {v.pax} {t.common.pax}
                  </span>
                </span>
                <span className="font-bold text-[#1B2A4A]">
                  {city.prices[v.id]!.toLocaleString()} {t.common.thb}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">{t.tourDetail.priceNote}</p>
          <a
            href={waLink(waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-btn w-full mt-4 justify-center"
          >
            {t.tourDetail.waButton}
          </a>
        </aside>
      </section>
    </main>
  );
}
```

- [ ] **Step 4.3: Create `app/tours/page.tsx`**

```tsx
import type { Metadata } from "next";
import ToursContent from "@/components/ToursContent";

export const metadata: Metadata = {
  title: "Tur Privat per Kota",
  description:
    "Tur privat sehari penuh di Bangkok, Pattaya, Ayutthaya, Kanchanaburi, Hua Hin, dan Khao Yai. Satu kendaraan khusus untuk rombongan Anda, harga per mobil.",
};

export default function ToursPage() {
  return <ToursContent />;
}
```

- [ ] **Step 4.4: Create `app/tours/[city]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TourDetailContent from "@/components/TourDetailContent";
import { cities, getCity } from "@/lib/tours";
import { cityNames } from "@/lib/translations";

export function generateStaticParams() {
  return cities.map((c) => ({ city: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const name = cityNames[city];
  if (!name) return {};
  return {
    title: `Tur Privat ${name}`,
    description: `Tur privat ${name} sehari penuh dengan kendaraan dan sopir pribadi. Harga per mobil untuk rombongan Anda — sedan, SUV, van, atau mini bus.`,
  };
}

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  if (!getCity(city)) notFound();
  return <TourDetailContent cityId={city} />;
}
```

- [ ] **Step 4.5: Verify build and routes**

Run: `npm run build`
Expected: compiles; build output lists `/tours` and 6 static `/tours/[city]` pages.
In dev: `/tours/bangkok` shows the timeline and vehicle picker; switching vehicles updates the price and the WhatsApp link; `/tours/nonsense` returns 404.

- [ ] **Step 4.6: Commit**

```bash
git add components/ToursContent.tsx components/TourDetailContent.tsx app/tours
git commit -m "Add tours catalog and tour detail pages with vehicle picker"
```

---

### Task 5: Fleet page

**Files:**
- Create: `components/FleetContent.tsx`
- Create: `app/fleet/page.tsx`

- [ ] **Step 5.1: Create `components/FleetContent.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { vehicles, cheapestVehiclePrice } from "@/lib/tours";
import { waLink, fillTemplate } from "@/lib/site";

export default function FleetContent() {
  const { t } = useLanguage();

  return (
    <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.fleet.title}</h1>
      <p className="text-gray-600 mt-2 max-w-2xl">{t.fleet.subtitle}</p>

      <div className="grid sm:grid-cols-2 gap-6 mt-10">
        {vehicles.map((v) => {
          const info = t.fleet.vehicles[v.id];
          const price = cheapestVehiclePrice(v.id);
          const msg = fillTemplate(t.fleet.waMessage, { vehicle: t.vehicleNames[v.id] });
          return (
            <div
              key={v.id}
              className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="relative h-52 bg-gray-100">
                <Image
                  src={v.image}
                  alt={info.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <div className="p-5">
                <h2 className="font-bold text-[#1B2A4A] text-lg">{info.name}</h2>
                <p className="text-sm text-gray-500">{info.pax}</p>
                <p className="text-sm text-gray-600 mt-2">{info.desc}</p>
                {price != null && (
                  <p className="mt-3 font-bold text-[#1B2A4A]">
                    {fillTemplate(t.fleet.fromPrice, { price: price.toLocaleString() })}
                  </p>
                )}
                <a
                  href={waLink(msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-btn inline-flex mt-4"
                >
                  {t.common.whatsapp}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-14 rounded-2xl bg-[#1B2A4A] text-white p-8">
        <h2 className="text-2xl font-bold">{t.fleet.airportTitle}</h2>
        <p className="mt-2 text-white/80 max-w-2xl">{t.fleet.airportDesc}</p>
        <a
          href={waLink(t.fleet.airportWaMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn inline-flex mt-5"
        >
          {t.fleet.airportCta}
        </a>
      </section>
    </main>
  );
}
```

- [ ] **Step 5.2: Create `app/fleet/page.tsx`**

```tsx
import type { Metadata } from "next";
import FleetContent from "@/components/FleetContent";

export const metadata: Metadata = {
  title: "Armada & Harga",
  description:
    "Sedan, SUV, van, dan mini bus dengan sopir untuk 1–20 penumpang. Harga per kendaraan per hari termasuk sopir, BBM, tol, dan parkir. Airport transfer tersedia.",
};

export default function FleetPage() {
  return <FleetContent />;
}
```

- [ ] **Step 5.3: Verify build**

Run: `npm run build`
Expected: compiles; `/fleet` listed. In dev: 4 vehicle cards with photos and "from" prices, airport transfer band at the bottom.

- [ ] **Step 5.4: Commit**

```bash
git add components/FleetContent.tsx app/fleet
git commit -m "Add fleet page with per-vehicle pricing and airport transfer section"
```

---

### Task 6: About, Testimony, Contact

**Files:**
- Create: `components/AboutContent.tsx`, `components/TestimonyContent.tsx`, `components/ContactContent.tsx`
- Create: `app/about/page.tsx`, `app/testimony/page.tsx`, `app/contact/page.tsx`

- [ ] **Step 6.1: Create `components/AboutContent.tsx`**

```tsx
"use client";

import { useLanguage } from "@/components/LanguageContext";

export default function AboutContent() {
  const { t } = useLanguage();

  return (
    <main className="pt-24 pb-16 max-w-4xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.about.title}</h1>
      <p className="mt-4 text-gray-700 leading-relaxed">{t.about.p1}</p>
      <p className="mt-3 text-gray-700 leading-relaxed">{t.about.p2}</p>

      <h2 className="mt-12 text-2xl font-bold text-[#1B2A4A]">{t.about.whyTitle}</h2>
      <div className="grid sm:grid-cols-2 gap-6 mt-6">
        {t.about.why.map((item) => (
          <div key={item.title} className="rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-[#1B2A4A]">{item.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 6.2: Create `components/TestimonyContent.tsx`**

```tsx
"use client";

import { useLanguage } from "@/components/LanguageContext";
import { waLink } from "@/lib/site";

export default function TestimonyContent() {
  const { t } = useLanguage();

  return (
    <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.testimony.title}</h1>
      <p className="text-gray-600 mt-2">{t.testimony.subtitle}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {t.testimony.items.map((item) => (
          <figure key={item.name} className="bg-gray-50 rounded-2xl p-5">
            <p className="text-[#F5C518]">{"★".repeat(item.stars)}</p>
            <blockquote className="mt-2 text-sm text-gray-700">{item.text}</blockquote>
            <figcaption className="mt-3 text-sm font-bold text-[#1B2A4A]">
              {item.name} · <span className="font-normal text-gray-500">{item.city}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="text-center mt-12">
        <a
          href={waLink(t.home.waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn inline-flex"
        >
          {t.common.whatsapp}
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 6.3: Create `components/ContactContent.tsx`**

```tsx
"use client";

import { useLanguage } from "@/components/LanguageContext";
import { waLink, WA_NUMBER } from "@/lib/site";

export default function ContactContent() {
  const { t } = useLanguage();

  const cards = [
    {
      title: t.contact.waTitle,
      desc: t.contact.waDesc,
      extra: `+${WA_NUMBER}`,
    },
    { title: t.contact.locationTitle, desc: t.contact.locationDesc, extra: null },
    { title: t.contact.hoursTitle, desc: t.contact.hoursDesc, extra: null },
  ];

  return (
    <main className="pt-24 pb-16 max-w-4xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.contact.title}</h1>
      <p className="text-gray-600 mt-2">{t.contact.subtitle}</p>

      <div className="grid sm:grid-cols-3 gap-6 mt-10">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-gray-200 p-5">
            <h2 className="font-bold text-[#1B2A4A]">{c.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
            {c.extra && <p className="mt-2 text-sm font-bold text-[#1B2A4A]">{c.extra}</p>}
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <a
          href={waLink(t.contact.waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn inline-flex"
        >
          {t.contact.waButton}
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 6.4: Create the three pages**

`app/about/page.tsx`:

```tsx
import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Keliling Thailand — layanan tur privat untuk wisatawan Indonesia di Thailand. Kendaraan dengan sopir untuk tur kota, day trip, dan airport transfer.",
};

export default function AboutPage() {
  return <AboutContent />;
}
```

`app/testimony/page.tsx`:

```tsx
import type { Metadata } from "next";
import TestimonyContent from "@/components/TestimonyContent";

export const metadata: Metadata = {
  title: "Testimoni",
  description: "Cerita nyata dari rombongan yang sudah jalan bersama Keliling Thailand.",
};

export default function TestimonyPage() {
  return <TestimonyContent />;
}
```

`app/contact/page.tsx`:

```tsx
import type { Metadata } from "next";
import ContactContent from "@/components/ContactContent";

export const metadata: Metadata = {
  title: "Kontak",
  description:
    "Hubungi Keliling Thailand via WhatsApp untuk tur privat, sewa kendaraan dengan sopir, dan airport transfer di Thailand.",
};

export default function ContactPage() {
  return <ContactContent />;
}
```

- [ ] **Step 6.5: Verify build**

Run: `npm run build`
Expected: compiles; `/about`, `/testimony`, `/contact` listed.

- [ ] **Step 6.6: Commit**

```bash
git add components/AboutContent.tsx components/TestimonyContent.tsx components/ContactContent.tsx app/about app/testimony app/contact
git commit -m "Rebuild about, testimony, and contact pages"
```

---

### Task 7: SEO — metadata, JSON-LD, redirects, sitemap

Skim `node_modules/next/dist/docs/` for the redirects guide before editing `next.config.ts`.

**Files:**
- Modify: `app/layout.tsx`
- Modify: `next.config.ts`
- Rewrite: `app/sitemap.xml/route.ts`

- [ ] **Step 7.1: Update metadata in `app/layout.tsx`**

Replace the `title`, `description`, `keywords`, `openGraph`, and `twitter` fields of the `metadata` export (keep `metadataBase`, `icons`, `alternates`, `robots` as they are):

```ts
  title: {
    default: "Tur Privat Keliling Thailand — Sewa Mobil + Sopir untuk Rombongan",
    template: "%s | Keliling Thailand",
  },
  description:
    "Tur privat di Thailand untuk rombongan Indonesia: sedan, SUV, van, dan mini bus dengan sopir. Harga per kendaraan, itinerary bisa disesuaikan. Bangkok, Pattaya, Ayutthaya, dan lainnya.",
  keywords:
    "tur privat thailand, sewa mobil thailand, sewa van bangkok, private tour thailand, sewa mini bus thailand, airport transfer bangkok",
```

For `openGraph` and `twitter`, set both `title` values to `"Tur Privat Keliling Thailand untuk Rombongan Anda"` and both `description` values to `"Sedan, SUV, van, dan mini bus dengan sopir. Harga per kendaraan, bukan per orang."` (keep the other nested fields unchanged).

- [ ] **Step 7.2: Update JSON-LD in `app/layout.tsx`**

In `organizationLd`, replace the `description` with:

```ts
  description:
    "Private group tours in Thailand with sedan, SUV, van, and mini bus. Whole-vehicle bookings with driver for city tours, day trips, and airport transfers.",
```

Also update `areaServed` to match real coverage (replace Phuket/Krabi entries):

```ts
  areaServed: [
    { "@type": "City", name: "Bangkok" },
    { "@type": "City", name: "Pattaya" },
    { "@type": "City", name: "Ayutthaya" },
    { "@type": "City", name: "Kanchanaburi" },
    { "@type": "City", name: "Hua Hin" },
    { "@type": "City", name: "Khao Yai" },
    { "@type": "Country", name: "Thailand" },
  ],
```

Replace the whole `serviceLd` constant with:

```ts
const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Private group tours and vehicle charter with driver",
  provider: { "@id": `${siteUrl}/#organization` },
  areaServed: { "@type": "Country", name: "Thailand" },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Keliling Thailand services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Private City Tours",
          url: `${siteUrl}/tours`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Vehicle Charter (Sedan, SUV, Van, Mini Bus)",
          url: `${siteUrl}/fleet`,
        },
      },
    ],
  },
};
```

- [ ] **Step 7.3: Add redirects to `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/services", destination: "/fleet", permanent: true },
      { source: "/city-tours", destination: "/tours", permanent: true },
      { source: "/airport-transfer", destination: "/fleet", permanent: true },
      { source: "/location", destination: "/contact", permanent: true },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 7.4: Rewrite `app/sitemap.xml/route.ts`**

```ts
import { cities } from "@/lib/tours";

const productionUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  "https://kelilingthailand.com";

const baseUrl = productionUrl.startsWith("http")
  ? productionUrl
  : `https://${productionUrl}`;

const routes = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "tours", changeFrequency: "weekly", priority: 0.9 },
  ...cities.map((c) => ({
    path: `tours/${c.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  { path: "fleet", changeFrequency: "monthly", priority: 0.9 },
  { path: "about", changeFrequency: "monthly", priority: 0.6 },
  { path: "testimony", changeFrequency: "monthly", priority: 0.6 },
  { path: "contact", changeFrequency: "monthly", priority: 0.6 },
];

export function GET() {
  const lastModified = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(({ path, changeFrequency, priority }) => {
    const url = path ? `${baseUrl}/${path}` : baseUrl;
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}
```

- [ ] **Step 7.5: Verify build and redirects**

Run: `npm run build`
Expected: compiles. In dev: `curl -I localhost:3000/services` returns 308 with `location: /fleet`; `curl localhost:3000/sitemap.xml` lists `/tours/bangkok` etc. and no dead routes.

- [ ] **Step 7.6: Commit**

```bash
git add app/layout.tsx next.config.ts app/sitemap.xml
git commit -m "Update SEO metadata, JSON-LD, redirects, and sitemap for new structure"
```

---

### Task 8: Cleanup and final verification

**Files:**
- Delete: Alphard and unused images in `public/`
- Modify: `package.json` (remove `openai`, `@supabase/supabase-js`)

- [ ] **Step 8.1: Delete Alphard and orphaned images**

```bash
git rm "public/Alphard.webp" "public/toyotaalphard.jpg" "public/toyotaalphard1.jpg" \
  "public/Toyota_Alphard_Vellfire_001.jpg"
```

Then audit the rest — for each remaining image in `public/`, check it is referenced:

```bash
for f in public/*; do
  name=$(basename "$f")
  grep -rq "$name" app components lib --include="*.ts" --include="*.tsx" || echo "UNREFERENCED: $name"
done
```

Delete unreferenced ones with `git rm`, EXCEPT keep: `icon.png` (favicon, referenced in layout metadata), `newlog.png` (JSON-LD logo), `robots.txt` assets if any, and `Logo.png` (navbar). Likely deletions: `preview-black-car.png`, `Group 10.png`, `Full logo.png`, `Vector.png` (untracked — plain `rm`), `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`.

- [ ] **Step 8.2: Remove unused dependencies**

```bash
npm uninstall openai @supabase/supabase-js
```

- [ ] **Step 8.3: Final grep audit for Alphard/luxury**

Run: `grep -ril "alphard\|vellfire\|luxury\|chauffeur\|premium" app components lib public --include="*.ts" --include="*.tsx"; ls public | grep -i "alphard\|luxury"`
Expected: no output. Fix anything found.

- [ ] **Step 8.4: Final build + lint**

Run: `npm run build && npm run lint`
Expected: both pass clean.

- [ ] **Step 8.5: Dev walkthrough**

`npm run dev`, then verify in browser:
1. `/` — hero, all sections, all images load (replace any 404ing Unsplash ID)
2. `/tours` → `/tours/bangkok` — vehicle picker updates price + WhatsApp link text
3. `/tours/ayutthaya` — mini bus NOT shown (no price for it)
4. `/fleet`, `/about`, `/testimony`, `/contact` — render correctly
5. Switch language ID → EN → TH in navbar — all pages re-render translated, no raw keys
6. `/services` redirects to `/fleet`
7. Mobile viewport (devtools) — hamburger menu works, floating WhatsApp button visible

- [ ] **Step 8.6: Commit**

```bash
git add -A
git commit -m "Remove Alphard images, unused assets, and dead dependencies"
```

---

## Done Criteria

- No occurrence of "alphard"/"vellfire"/"luxury"/"chauffeur" anywhere in `app/`, `components/`, `lib/`, or `public/` filenames
- All 7 routes + 6 city detail pages build statically and render in id/en/th
- Every CTA opens WhatsApp with a contextual prefilled message
- Old URLs redirect (308) to their replacements
- `npm run build` and `npm run lint` pass
