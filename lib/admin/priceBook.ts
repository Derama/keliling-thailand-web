// Capital (cost) and selling price book — static, read-only reference.
// All prices in THB and include driver, fuel, and tolls.
// `cost` = our capital price; `sell` = price charged to the customer.

export type FleetKey = "altis" | "suv" | "van";

export const FLEET_KEYS: FleetKey[] = ["altis", "suv", "van"];

export const FLEET_LABELS: Record<FleetKey, string> = {
  altis: "Altis",
  suv: "SUV",
  van: "Van",
};

export interface VehiclePrice {
  cost: number;
  sell: number;
}

export interface Service {
  id: string;
  name: string;
  /** When true the route is quote-on-request — no fixed price, not selectable. */
  contact?: boolean;
  prices?: Record<FleetKey, VehiclePrice>;
}

export interface ServiceGroup {
  group: string;
  services: Service[];
}

// Helper: build a price map from cost/sell pairs in [altis, suv, van] order.
function row(
  altis: [number, number],
  suv: [number, number],
  van: [number, number]
): Record<FleetKey, VehiclePrice> {
  return {
    altis: { cost: altis[0], sell: altis[1] },
    suv: { cost: suv[0], sell: suv[1] },
    van: { cost: van[0], sell: van[1] },
  };
}

export const PRICE_BOOK: ServiceGroup[] = [
  {
    group: "Airport Pickup",
    services: [
      { id: "at-bangkok", name: "DMK → Bangkok", prices: row([500, 800], [600, 1000], [900, 1300]) },
      { id: "at-pattaya", name: "DMK → Pattaya", prices: row([1500, 2000], [1700, 2200], [2200, 2500]) },
      { id: "at-khaoyai", name: "DMK → Khao Yai", prices: row([2200, 2700], [2500, 3000], [3500, 4000]) },
      { id: "at-huahin", name: "DMK → Hua Hin", prices: row([2200, 2700], [2700, 3200], [3200, 3700]) },
    ],
  },
  {
    group: "Daily Return Tours",
    services: [
      { id: "ct-bangkok", name: "Bangkok City Tour", prices: row([2400, 3200], [2700, 3700], [3200, 4200]) },
      { id: "bangkok-pattaya", name: "Bangkok → Pattaya", prices: row([2700, 3700], [3300, 4300], [4300, 5300]) },
      { id: "bangkok-khaoyai", name: "Bangkok → Khao Yai", prices: row([3200, 4200], [3700, 4700], [4300, 5500]) },
      { id: "bangkok-huahin", name: "Bangkok → Hua Hin", prices: row([3300, 4300], [3800, 4800], [4800, 5500]) },
      { id: "bangkok-ayutthaya", name: "Bangkok → Ayutthaya", prices: row([2400, 3400], [3000, 4000], [3500, 4500]) },
      { id: "bangkok-kanchanaburi", name: "Bangkok → Kanchanaburi", prices: row([3200, 4200], [3700, 4700], [4300, 5300]) },
    ],
  },
  {
    group: "Drop-Off and Northern Thailand",
    services: [
      { id: "pattaya-khaoyai", name: "Pattaya → Khao Yai", prices: row([3000, 3500], [3300, 3800], [3800, 4200]) },
      { id: "cm-cr", name: "Chiang Mai → Chiang Rai", contact: true },
      { id: "cm-trip", name: "Chiang Mai Trip", contact: true },
      { id: "cr-trip", name: "Chiang Rai Trip", contact: true },
    ],
  },
];

/** A row of the editable `add_ons` table (Biaya Tambahan). */
export interface AddOnRate {
  id: string;
  name: string;
  /** Fixed THB price, or null when it's a pass-through (actual cost). */
  price: number | null;
  unit: string | null;
  sort: number;
  /** Built-in default row — price/unit editable, but cannot be deleted. */
  base?: boolean;
}

/**
 * Built-in additional charges. Always shown (price/unit editable, not
 * deletable). Their saved price/unit override these defaults from the DB.
 */
export const BASE_ADD_ONS: AddOnRate[] = [
  { id: "extra-hours", name: "Extra hours", price: 300, unit: "/ jam", sort: 10, base: true },
  { id: "extra-bed", name: "Extra bed", price: null, unit: null, sort: 20, base: true },
  { id: "transport-tambahan", name: "Transport tambahan", price: null, unit: null, sort: 30, base: true },
  { id: "tur-guide", name: "Tur guide", price: null, unit: null, sort: 40, base: true },
];

const BASE_ADD_ON_IDS = new Set(BASE_ADD_ONS.map((b) => b.id));

/** Merge DB rows over the built-in defaults; append custom rows after. */
export function mergeAddOns(dbRows: AddOnRate[]): AddOnRate[] {
  const byId = new Map(dbRows.map((r) => [r.id, r]));
  const base = BASE_ADD_ONS.map((b) => {
    const saved = byId.get(b.id);
    return saved ? { ...b, price: saved.price, unit: saved.unit } : b;
  });
  const custom = dbRows
    .filter((r) => !BASE_ADD_ON_IDS.has(r.id))
    .sort((a, b) => a.sort - b.sort);
  return [...base, ...custom];
}

// ── Hotels ─────────────────────────────────────────────────────────────
// `capital` = our cost per night (room, 2 pax). Customer pays capital + margin.

export const HOTEL_MARGIN = 250;

/** A row of the editable `hotel_rates` table. */
export interface HotelRate {
  id: string;
  city: string;
  name: string;
  capital: number;
  margin: number;
  sort: number;
}

export interface HotelCity {
  city: string;
  hotels: HotelRate[];
}

/** Group hotel rows (already sorted) by city, preserving order. */
export function groupHotels(rows: HotelRate[]): HotelCity[] {
  const cities: HotelCity[] = [];
  const byCity = new Map<string, HotelCity>();
  for (const r of rows) {
    let c = byCity.get(r.city);
    if (!c) {
      c = { city: r.city, hotels: [] };
      byCity.set(r.city, c);
      cities.push(c);
    }
    c.hotels.push(r);
  }
  return cities;
}

// ── Attractions (draft — prices to be filled later) ────────────────────

/** A row of the editable `attraction_rates` table. */
export interface Attraction {
  id: string;
  city: string;
  name: string;
  /** Capital ticket price (THB), or null when still pending. */
  price: number | null;
  margin: number;
  sort: number;
}

export interface AttractionCity {
  city: string;
  items: Attraction[];
}

/** Group attraction rows (already sorted) by city, preserving order. */
export function groupAttractions(rows: Attraction[]): AttractionCity[] {
  const cities: AttractionCity[] = [];
  const byCity = new Map<string, AttractionCity>();
  for (const r of rows) {
    let c = byCity.get(r.city);
    if (!c) {
      c = { city: r.city, items: [] };
      byCity.set(r.city, c);
      cities.push(c);
    }
    c.items.push(r);
  }
  return cities;
}


const SERVICE_INDEX = new Map<string, Service>(
  PRICE_BOOK.flatMap((g) => g.services.map((s) => [s.id, s]))
);

export function findService(id: string): Service | undefined {
  return SERVICE_INDEX.get(id);
}

export function isContact(s: Service): boolean {
  return s.contact === true;
}

export function vehiclePrice(
  s: Service,
  fleet: FleetKey
): VehiclePrice | null {
  return s.prices ? s.prices[fleet] : null;
}
