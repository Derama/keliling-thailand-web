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
