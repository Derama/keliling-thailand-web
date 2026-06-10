# Keliling Thailand — Full Site Redesign

**Date:** 2026-06-10
**Status:** Approved by owner (visual companion session)

## 1. Business Model

Private tours only. The customer brings their own group (family, office, community trip) and books the whole vehicle, priced per vehicle per day. There are **no open/join-in tours** and **no per-person pricing**.

- Fleet sized to group: sedan (Altis, 1–3 pax), SUV (Fortuner, 1–5), van (5–10), mini bus (10–20)
- Conversion goal: WhatsApp inquiry. Every CTA leads to WhatsApp, prefilled where context exists
- Primary audience: Indonesian tourists. Languages: Indonesian (default), English, Thai
- **All Alphard / luxury-van positioning is removed** — copy, images, and branding

## 2. Routes

| Route | Purpose |
|---|---|
| `/` | Homepage |
| `/tours` | City tour catalog (6 cities) |
| `/tours/[city]` | Tour detail — dynamic route |
| `/fleet` | Vehicle catalog + airport transfer |
| `/about` | Company story |
| `/testimony` | Reviews |
| `/contact` | WhatsApp, location, hours |

Removed routes `/services`, `/city-tours`, `/airport-transfer`, `/location` get permanent redirects in `next.config.ts`:
- `/services` → `/fleet`
- `/city-tours` → `/tours`
- `/airport-transfer` → `/fleet`
- `/location` → `/contact`

## 3. Data Model

`lib/itinerary.ts` is renamed to `lib/tours.ts` and kept as the single source of tour data. It already contains real final customer prices (THB) per city per vehicle:

- Cities: bangkok, pattaya, ayutthaya, kanchanaburi, huahin, khaoyai
- Each city: duration (10/12h), image, attraction list with visit hours, `prices: Partial<Record<VehicleId, number>>`
- Vehicles: `altis`, `suv`, `van`, `minibus` with pax ranges and photos
- Helper functions (`getCity`, `getPrice`, `availableVehicles`) survive; `totalHours` survives only if the itinerary display uses it
- Not every city offers every vehicle (e.g. Ayutthaya has no mini bus) — vehicle pickers must respect `availableVehicles`

Vehicle photos: `Altis.webp`, `Fortuner.webp`, `luxury van .webp` (rename to `van.webp`), `bus.png`.

## 4. Page Designs

### Homepage `/`
1. **Hero** — full-width photo, headline "Private tour around Thailand for your group" (id: "Tur privat keliling Thailand untuk rombongan Anda"), subline: own vehicle + driver + your itinerary. CTAs: "Pilih Destinasi" → `/tours`, "Lihat Armada" → `/fleet`
2. **How it works** — 3 steps: pick city → pick vehicle for group size → chat on WhatsApp
3. **Destination grid** — city cards generated from `lib/tours.ts` (image, name, duration, "from THB X" = cheapest vehicle price)
4. **Fleet strip** — 4 vehicle classes with photos and pax capacity, links to `/fleet`
5. **Trust section** — testimonial slice + simple stats
6. **Final WhatsApp CTA band**

### Tours catalog `/tours`
Grid of 6 city cards: photo, name, duration, attraction count, "from THB X". Click → detail.

### Tour detail `/tours/[city]`
- City hero photo, name, duration
- Itinerary timeline: attractions as stops with visit hours
- What's included: vehicle, driver, fuel, tolls, parking. Excluded: attraction tickets, meals, personal expenses
- **Vehicle picker**: cards for each available vehicle with photo, pax, price/day for this city
- WhatsApp CTA prefilled: city + selected vehicle in message text

### Fleet `/fleet`
- 4 vehicle cards: photo, capacity, luggage estimate, best-for description
- Per-vehicle price shown as "from THB X/day" (cheapest city price)
- **Airport transfer section**: short intro + WhatsApp CTA (no fixed price table in v1 — quote via chat)

### About `/about`
Company story, why us (licensed, Indonesian-speaking drivers, etc. — carry over true claims from current site, drop Alphard/luxury claims).

### Testimony `/testimony`
Carry over existing testimonial content, restyle.

### Contact `/contact`
WhatsApp (primary), location/maps embed, hours.

## 5. Deletions

- **AI planner**: `components/ItineraryWizard.tsx`, `components/HeroCityPicker.tsx`, `app/api/itinerary-suggest/`, `lib/openai.ts`, `openai` npm dependency
- **Page components** rewritten from scratch: `HomeContent.tsx`, `ServicesContent.tsx`, `AirportTransferContent.tsx`, `CityToursContent.tsx`, `AboutContent.tsx`, `ContactContent.tsx`, `LocationContent.tsx`, `TestimonyContent.tsx`
- **Components with no place in new design**: `DatePicker.tsx`, `LocationSearch.tsx` (and `lib/supabase.ts` if nothing else uses it)
- **Alphard images**: `Alphard.webp`, `toyotaalphard.jpg`, `toyotaalphard1.jpg`, `Toyota_Alphard_Vellfire_001.jpg`
- **Unused legacy images**: audit `public/` after rebuild; delete anything unreferenced (e.g. `preview-black-car.png`, `Group 10.png`)
- `lib/translations.ts` (129 KB) rewritten from scratch with new copy in id/en/th — same `useLanguage()` / `t` pattern, far smaller

## 6. What Survives

- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (CSS-based config)
- i18n pattern: `LanguageContext.tsx`, `localStorage("lang")`, `translations.ts` structure
- Brand: yellow `#F5C518`, navy `#1B2A4A`, WhatsApp green `#25D366`, current logo, `.whatsapp-btn` utility
- Components: `FloatingWhatsApp`, `ScrollReveal`, `JsonLd`; `Navbar`/`Footer` rebuilt for new nav but same conventions
- SEO plumbing: `robots.txt`, `sitemap.xml` routes (updated for new URLs), JSON-LD
- Testimony content

## 7. Visual Direction

Clean travel-brand look: large photography, navy text on white background, yellow reserved for CTAs and accents, generous spacing, mobile-first (Indonesian users predominantly on phones). No dark/luxury chauffeur aesthetic — that was the Alphard era.

## 8. Error Handling & Edge Cases

- `/tours/[unknown-city]` → `notFound()` (404 page)
- City without a vehicle (no price entry) → vehicle simply not shown in picker
- WhatsApp links use `wa.me` with URL-encoded prefilled text; work without JS
- Missing attraction images → gradient placeholder (existing pattern)

## 9. Testing

No test suite configured (per CLAUDE.md). Verification = `npm run build` + `npm run lint` + manual route walk-through in dev server across all three languages.

## 10. Out of Scope

- Online booking / payment / availability calendar
- Open (join-in) tour products
- AI itinerary planner or chatbot
- CMS — tour data stays in TypeScript
