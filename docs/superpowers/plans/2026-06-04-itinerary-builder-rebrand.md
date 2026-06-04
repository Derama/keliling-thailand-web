# Itinerary Builder + Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rebrand the whole site to the new yellow/cream/black palette and add a 3-step itinerary builder (city → attractions → vehicle+price → WhatsApp).

**Architecture:** Mechanical palette sweep across CSS + 13 components, then a self-contained client wizard (`ItineraryBuilder.tsx`) backed by a pure data module (`lib/itinerary.ts`) and i18n strings (`itineraryTranslations` in `lib/translations.ts`). No backend; price is a fixed lookup by city+vehicle.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (CSS config).

**Note on testing:** No test suite is configured in this repo (per CLAUDE.md). Verification is `npm run build` (+ `npm run lint`) and manual reasoning, not unit tests.

---

## File structure

- `app/globals.css` — palette CSS vars, off-white body bg, new `.outline-card` shadow utility (modify)
- `components/*.tsx` — hex/`amber-*` palette swap across 12 components (modify)
- `lib/itinerary.ts` — data model: cities, attractions, vehicles, price tables (create)
- `lib/translations.ts` — add `itineraryTranslations` export (modify, append)
- `components/ItineraryBuilder.tsx` — 3-step wizard client component (create)
- `components/HomeContent.tsx` — embed builder as hero feature (modify)
- `components/CityToursContent.tsx` — replace static cards with builder (modify)
- `components/AirportTransferContent.tsx` — real DMK prices (modify)

---

## Task 1: Palette foundation + mechanical sweep

**Files:** Modify `app/globals.css`; sweep all of `app/` + `components/`.

Color map: `F5C518`→`FFC531` (yellow); `1B2A4A`→`050505` (navy→black); `253d6b`→`2a2a2a` (gradient mid); `bg-amber-50`→`bg-[#FAE7B8]`, `amber-50/50`→`[#FAE7B8]/50` (cream).

- [ ] **Step 1: globals.css palette vars** — set `--yellow: #FFC531`; add `--cream:#FAE7B8; --offwhite:#F4F4F4; --ink:#050505; --accent:#F5D582;`; set `--background:#F4F4F4`. Add `@theme inline` mappings for new colors. Add utility:

```css
/* Outlined card with offset accent shadow */
.outline-card {
  border: 2px solid #050505;
  border-radius: 1rem;
  background: #ffffff;
  box-shadow: 6px 6px 0 #F5D582;
  transition: transform 0.15s var(--ease-out-quart), box-shadow 0.15s var(--ease-out-quart);
}
.outline-card:hover { transform: translate(-2px,-2px); box-shadow: 8px 8px 0 #F5D582; }
.outline-card.is-active { box-shadow: 6px 6px 0 #FFC531; background:#FAE7B8; }
```

- [ ] **Step 2: hex sweep** — run:

```bash
cd "$(git rev-parse --show-toplevel)"
FILES=$(grep -rl '1B2A4A\|253d6b\|F5C518\|amber-50' app components)
sed -i '' -e 's/F5C518/FFC531/g' -e 's/1B2A4A/050505/g' -e 's/253d6b/2a2a2a/g' \
  -e 's/bg-amber-50\/50/bg-[#FAE7B8]\/50/g' -e 's/bg-amber-50/bg-[#FAE7B8]/g' $FILES
```

- [ ] **Step 3: verify** — `grep -rc '1B2A4A\|F5C518\|amber-50' app components` returns 0 matches; `npm run build` succeeds.
- [ ] **Step 4: commit** — `git commit -am "Rebrand palette to yellow/cream/black"`

## Task 2: Itinerary data model

**Files:** Create `lib/itinerary.ts`.

- [ ] **Step 1: write module** — vehicles (`altis/suv/van/minibus`), 6 cities with `durationHours`, `attractions[]` (id/nameKey/hours), and `prices` (customer ฿ from spec §6). Mini Bus only on bangkok/pattaya/khaoyai. Export `cities`, `vehicles`, helper `getPrice(cityId, vehicleId)`, `totalHours(attractions)`. Names referenced by key into translations (no hardcoded user text).
- [ ] **Step 2: verify** — `npx tsc --noEmit` passes for the file.
- [ ] **Step 3: commit** — `git commit -am "Add itinerary data model"`

Prices (Altis/SUV/Van/MiniBus): Bangkok 3400/3700/4200/8000 · Pattaya 3700/4300/5300/10000 · Ayutthaya 3400/4000/4500/— · Kanchanaburi 4400/4900/5500/— · HuaHin 4500/5000/6000/— · KhaoYai 4400/4900/5500/11000.

## Task 3: Itinerary translations

**Files:** Modify `lib/translations.ts` (append `itineraryTranslations` export, id/en/th).

- [ ] **Step 1: append export** — keys: wizard UI (steps, next/back, pickCity, pickAttractions, chooseVehicle, yourItinerary, estDuration, price, bookWhatsApp, hours), city names, attraction names (spec §8), vehicle names/pax. All three languages.
- [ ] **Step 2: verify** — `npx tsc --noEmit` passes.
- [ ] **Step 3: commit** — `git commit -am "Add itinerary translations"`

## Task 4: ItineraryBuilder component

**Files:** Create `components/ItineraryBuilder.tsx` (`"use client"`).

- [ ] **Step 1: build wizard** — `useState` for `step (1|2|3)`, `cityId`, `selected attraction ids (Set)`, `vehicleId`. Step1: city image grid (`outline-card`, click → set city, step 2). Step2: attraction checkable cards + Next. Step3: ordered itinerary list, total hours, vehicle selector (only vehicles present in city.prices), exact price, WhatsApp button pre-filling city+attractions+vehicle+price+duration. Back buttons. All strings via `useLanguage()` + `itineraryTranslations`. Use brand palette.
- [ ] **Step 2: verify** — `npm run build` succeeds.
- [ ] **Step 3: commit** — `git commit -am "Add ItineraryBuilder wizard"`

## Task 5: Wire builder into pages

**Files:** Modify `components/HomeContent.tsx`, `components/CityToursContent.tsx`.

- [ ] **Step 1: city-tours** — replace static tour grid section with `<ItineraryBuilder />`.
- [ ] **Step 2: home** — embed builder section near top (after hero) as the featured CTA.
- [ ] **Step 3: verify** — `npm run build` succeeds.
- [ ] **Step 4: commit** — `git commit -am "Embed itinerary builder in home and city-tours"`

## Task 6: Airport transfer prices

**Files:** Modify `components/AirportTransferContent.tsx` (+ translations if prices are text there).

- [ ] **Step 1: update** — DMK prices per spec §7 (Altis/SUV/Van): Bangkok 800/900/1200 · Pattaya 1800/2000/2500 · KhaoYai 2500/2800/3800 · HuaHin 2500/3000/3500.
- [ ] **Step 2: verify** — `npm run build` succeeds.
- [ ] **Step 3: commit** — `git commit -am "Update airport transfer prices"`

## Task 7: Final verification

- [ ] **Step 1:** `npm run build && npm run lint` clean.
- [ ] **Step 2:** grep confirms no stray `1B2A4A`/`F5C518`/`amber-50`.
- [ ] **Step 3:** manual: builder flows city→attractions→vehicle→price→WhatsApp; 3 languages switch.

---

## Self-review

- Spec §2 palette → Task 1. §3 IA/restyle → Task 1+5. §4 builder/pricing → Task 2,4. §5 vehicles → Task 2,3. §6 prices → Task 2. §7 airport → Task 6. §8 attractions → Task 3. §9 tech → all. ✓ All sections covered.
- No placeholders; price numbers explicit. Vehicle ids consistent (`altis/suv/van/minibus`) across tasks. ✓
