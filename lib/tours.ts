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
  image: string;
}

export interface City {
  id: string;
  durationHours: 10 | 12;
  image: string;
  attractions: Attraction[];
  /** Final customer price (THB) per available vehicle. */
  prices: Partial<Record<VehicleId, number>>;
  /** Approx drive from Bangkok — omitted for Bangkok itself. `hours` is a
   *  bare number/range ("2", "2.5–3"); the unit comes from translations. */
  driveFromBangkok?: { km: number; hours: string };
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
    // Wat Arun from the Chao Phraya river
    image: unsplash("photo-1613672803979-a6edfc5a179b"),
    prices: { altis: 3400, suv: 3700, van: 4200, minibus: 8000 },
    attractions: [
      { id: "grand-palace", hours: 2, image: unsplash("photo-1586098311577-520120ba3df3") },
      { id: "wat-pho", hours: 1.5, image: unsplash("photo-1704391445538-cf5e763234be") },
      { id: "wat-arun", hours: 1, image: unsplash("photo-1704390529135-742324e6b8f1") },
      { id: "chatuchak", hours: 2, image: unsplash("photo-1636455714535-b64a1308a655") },
      { id: "asiatique", hours: 2, image: unsplash("photo-1583052295267-cf0b360aa088") },
      { id: "icon-siam", hours: 2, image: unsplash("photo-1737942197709-0df0b52be6c6") },
      { id: "chinatown", hours: 1.5, image: unsplash("photo-1513568720563-6a5b8c6caab3") },
    ],
  },
  {
    id: "pattaya",
    durationHours: 12,
    // Sanctuary of Truth on the coast
    image: unsplash("photo-1671597728617-32d19c352c4d"),
    prices: { altis: 3700, suv: 4300, van: 5300, minibus: 10000 },
    driveFromBangkok: { km: 150, hours: "2" },
    attractions: [
      { id: "sanctuary-of-truth", hours: 1.5, image: unsplash("photo-1644902617098-45abe72a7445") },
      { id: "nong-nooch", hours: 2.5, image: unsplash("photo-1712335866940-958e9b5fdba1") },
      { id: "walking-street", hours: 2, image: unsplash("photo-1538114618364-ae7f63d1ee7d") },
      { id: "coral-island", hours: 4, image: unsplash("photo-1687320961478-387af61e7cca") },
      { id: "floating-market", hours: 1.5, image: unsplash("photo-1590118432058-f2744d6897db") },
      { id: "big-buddha-hill", hours: 1, image: unsplash("photo-1625363889165-003021548974") },
    ],
  },
  {
    id: "ayutthaya",
    durationHours: 10,
    // Wat Chaiwatthanaram at sunset
    image: unsplash("photo-1584314637755-8f69c5e5078a"),
    prices: { altis: 3400, suv: 4000, van: 4500 },
    driveFromBangkok: { km: 80, hours: "1.5" },
    attractions: [
      { id: "wat-mahathat", hours: 1.5, image: unsplash("photo-1632130879594-b2d00838f09d") },
      { id: "wat-chaiwatthanaram", hours: 1.5, image: unsplash("photo-1584314637755-8f69c5e5078a") },
      { id: "bang-pa-in-palace", hours: 2, image: unsplash("photo-1738638937829-0ba3a26fa4f7") },
      { id: "wat-phra-si-sanphet", hours: 1.5, image: unsplash("photo-1761466977759-3685c02d3bd2") },
      { id: "ayutthaya-floating-market", hours: 2, image: unsplash("photo-1496250161524-b0549bf85a55") },
      { id: "wat-lokayasutharam", hours: 1, image: unsplash("photo-1714256495851-180e2a42734d") },
    ],
  },
  {
    id: "kanchanaburi",
    durationHours: 10,
    // Death Railway train on the cliffside trestle
    image: unsplash("photo-1702826711635-790dc66f1c41"),
    prices: { altis: 4400, suv: 4900, van: 5500 },
    driveFromBangkok: { km: 130, hours: "2.5" },
    attractions: [
      { id: "bridge-river-kwai", hours: 1.5, image: unsplash("photo-1624806296367-33e24d6162ef") },
      { id: "erawan-falls", hours: 3, image: unsplash("photo-1585806882217-265db0aeefd4") },
      { id: "death-railway", hours: 2, image: unsplash("photo-1674397723072-0de3a38c135e") },
      { id: "hellfire-pass", hours: 2, image: unsplash("photo-1674397725158-37f23e4ea565") },
      { id: "tiger-cave-temple", hours: 1.5, image: unsplash("photo-1758213452314-a8084a7ccb21") },
      { id: "jeath-museum", hours: 1, image: unsplash("photo-1701877347534-332eedc11b67") },
    ],
  },
  {
    id: "huahin",
    durationHours: 12,
    // Hua Hin Railway Station royal pavilion.
    // Photo: Khaosaming, Wikimedia Commons, CC BY-SA 4.0
    image: "/huahin-station.jpg",
    prices: { altis: 4500, suv: 5000, van: 6000 },
    driveFromBangkok: { km: 200, hours: "3" },
    attractions: [
      { id: "cicada-market", hours: 2, image: unsplash("photo-1541738158050-3f1568a657a5") },
      { id: "huahin-beach", hours: 2, image: unsplash("photo-1651377001727-ef3a8ef0872d") },
      { id: "vana-nava", hours: 3, image: unsplash("photo-1701361650313-9b20b1d76820") },
      { id: "santorini-park", hours: 2, image: unsplash("photo-1533105079780-92b9be482077") },
      { id: "monsopra-vineyard", hours: 2, image: unsplash("photo-1767421136565-93968d5b8a62") },
      { id: "huahin-railway-station", hours: 1, image: "/huahin-station.jpg" },
    ],
  },
  {
    id: "khaoyai",
    durationHours: 12,
    // Khao Yai mountain panorama
    image: unsplash("photo-1601225612399-46e1fd6b9e90"),
    prices: { altis: 4400, suv: 4900, van: 5500, minibus: 11000 },
    driveFromBangkok: { km: 165, hours: "2.5" },
    attractions: [
      { id: "khao-yai-national-park", hours: 4, image: unsplash("photo-1748966006345-ea3c0ca397e9") },
      { id: "pb-valley-winery", hours: 2, image: unsplash("photo-1598616914356-0e09322ed3b8") },
      { id: "primo-piazza", hours: 1.5, image: unsplash("photo-1648118487893-4829c16703a8") },
      { id: "the-bloom", hours: 1.5, image: unsplash("photo-1721436116304-8ba5e9f9f2f8") },
      { id: "farm-chokchai", hours: 2, image: unsplash("photo-1500595046743-cd271d694d30") },
      { id: "midwinter-green", hours: 1.5, image: unsplash("photo-1641061656949-8c6d92541acd") },
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
