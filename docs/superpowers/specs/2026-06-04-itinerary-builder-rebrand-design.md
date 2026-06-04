# Keliling Thailand — Rebrand + Itinerary Builder

**Date:** 2026-06-04
**Status:** Approved (pending spec review)

## 1. Goal

Rebrand the entire site to a new warm yellow/cream/black palette and add an
interactive **itinerary builder**: the customer picks a city, picks attractions
within that city, picks a vehicle, and gets a built itinerary with an exact
price, then books over WhatsApp.

## 2. Brand / visual system

Replace the old navy (`#1B2A4A`) + yellow (`#F5C518`) scheme everywhere.

| Token | Hex | Use |
|---|---|---|
| Primary yellow/gold | `#FFC531` | CTAs, highlights, active states |
| Cream / beige | `#FAE7B8` | section background shapes, soft blocks |
| Off-white | `#F4F4F4` | page background |
| Black | `#050505` | text, outlines, card borders |
| Muted yellow accent | `#F5D582` | offset drop-shadows on cards |
| WhatsApp green | `#25D366` | WhatsApp buttons only (kept) |

**Direction:** warm, high-contrast. Signature element = **outlined cards** with a
black border and an offset `#F5D582` shadow (playful/premium). Define palette as
CSS variables in `app/globals.css`; retire all navy usages. Add a reusable
card-shadow utility class.

## 3. Information architecture

Keep existing routes; restyle all to new palette:
`/ /about /services /city-tours /airport-transfer /location /testimony /contact`

- **`/`** — itinerary builder is the hero feature.
- **`/city-tours`** — static cards replaced by (or linking to) the builder.
- **`/airport-transfer`** — updated with real prices (table below).
- Navbar + Footer restyled to new palette.

## 4. Itinerary builder (core feature)

Stepped wizard, client-side only (no backend), 3 steps:

1. **Pick city** — image grid, 6 cities.
2. **Pick attractions** — checkable outlined cards (image, name, approx hours).
   Attractions only shape the itinerary route/order; they do NOT change price.
3. **Itinerary + vehicle + price** — ordered route list, total estimated hours,
   **vehicle selector**, **exact price** for the chosen city+vehicle, and a
   "Book on WhatsApp" button that pre-fills city, chosen attractions, vehicle,
   duration, and price.

### Pricing rule (IMPORTANT)

Price is **fixed per city per vehicle** — there is NO duration multiplier, NO
per-attraction price, NO surcharge. Tour duration is fixed per city. Display the
exact price; final amount still confirmed on WhatsApp.

### Data model (`lib/itinerary.ts`)

```ts
type VehicleId = "altis" | "suv" | "van" | "minibus";

interface Vehicle { id: VehicleId; nameKey: string; pax: string; }

interface Attraction {
  id: string;
  nameKey: string;   // i18n key into translations
  hours: number;     // approx visit hours, for itinerary total only
}

interface City {
  id: string;
  nameKey: string;
  durationHours: 10 | 12;
  image: string;
  attractions: Attraction[];
  prices: Partial<Record<VehicleId, number>>; // customer price, margin baked in
}
```

City/attraction/vehicle display names live in `lib/translations.ts` (id/en/th).

## 5. Content — vehicles

| id | Name | Pax |
|---|---|---|
| altis | Toyota Altis (sedan) | 1–3 |
| suv | SUV | 1–5 |
| van | Van / Hi-Ace | 5–10 |
| minibus | Mini Bus | up to 20 |

## 6. Content — city tour prices (customer, ฿, margin baked in)

Margins applied: Bangkok/Pattaya/Ayutthaya +1,000; Kanchanaburi/Hua Hin/Khao Yai
+1,200; Mini Bus +2,500.

| City | Dur | Altis | SUV | Van | Mini Bus |
|---|---|---|---|---|---|
| Bangkok | 10h | 3,400 | 3,700 | 4,200 | 8,000 |
| Pattaya | 12h | 3,700 | 4,300 | 5,300 | 10,000 |
| Ayutthaya | 10h | 3,400 | 4,000 | 4,500 | — |
| Kanchanaburi | 10h | 4,400 | 4,900 | 5,500 | — |
| Hua Hin | 12h | 4,500 | 5,000 | 6,000 | — |
| Khao Yai | 12h | 4,400 | 4,900 | 5,500 | 11,000 |

Mini Bus only shown for Bangkok, Pattaya, Khao Yai.

## 7. Content — airport transfer prices (DMK, customer ฿, +300 margin)

| Route | Altis | SUV | Van |
|---|---|---|---|
| DMK → Bangkok | 800 | 900 | 1,200 |
| DMK → Pattaya | 1,800 | 2,000 | 2,500 |
| DMK → Khao Yai | 2,500 | 2,800 | 3,800 |
| DMK → Hua Hin | 2,500 | 3,000 | 3,500 |

(Existing airport-transfer page restyled; these prices replace placeholders.)

## 8. Content — attractions (draft, user to refine)

- **Bangkok:** Grand Palace, Wat Pho, Wat Arun, Chatuchak Market, Asiatique,
  Icon Siam, Chinatown (Yaowarat)
- **Pattaya:** Sanctuary of Truth, Nong Nooch Garden, Walking Street, Coral
  Island (Koh Larn), Floating Market, Big Buddha Hill
- **Ayutthaya:** Wat Mahathat, Wat Chaiwatthanaram, Bang Pa-In Palace, Wat Phra
  Si Sanphet, Ayutthaya Floating Market, Wat Lokayasutharam
- **Kanchanaburi:** Bridge over River Kwai, Erawan Falls, Death Railway,
  Hellfire Pass, Tiger Cave Temple, JEATH War Museum
- **Hua Hin:** Cicada Market, Hua Hin Beach, Vana Nava Water Jungle, Santorini
  Park, Monsopra Vineyard, Hua Hin Railway Station
- **Khao Yai:** Khao Yai National Park, PB Valley Winery, Primo Piazza, The
  Bloom, Farm Chokchai, Midwinter Green

Attraction images supplied later; scaffold with placeholders.

## 9. Tech approach

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (CSS-config).
- New client component `components/ItineraryBuilder.tsx` (useState wizard).
- `lib/itinerary.ts` holds the data model + price tables.
- All user-facing strings added to `lib/translations.ts` (id/en/th).
- Palette migration in `app/globals.css`; sweep navy hex usages across
  components and replace per the brand table.
- No backend, no test suite (none configured). Verify via `npm run build`.

## 10. Assumptions / open items

- City tours are day trips departing Bangkok (origin = Bangkok).
- Attraction lists are drafted by Claude; user reviews/corrects names + adds
  images.
- "Back:" round-trip airport routes from the raw price list are folded into the
  single transfer prices above; can split one-way vs round-trip later if needed.
