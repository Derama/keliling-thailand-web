// Multi-day tour packages. Each day references attraction ids from
// lib/tours.ts so photos and names (attractionNames) are reused.
// Taglines/descriptions live in lib/translations.ts under t.packages.

import { VehicleId, getCity } from "@/lib/tours";
import { cityNames } from "@/lib/translations";

export interface PackageDay {
  cityId: string;
  attractionIds: string[];
}

export interface TourPackage {
  id: string;
  days: number;
  nights: number;
  /** Cities covered, in visit order — used for badges and the title. */
  cityIds: string[];
  /** Hero image (reuses a city/attraction photo). */
  image: string;
  badge?: "bestSeller" | "grandTour" | "allCities";
  /** One entry per day, in order. Day 1 includes airport pickup and the
   *  last day ends with airport drop-off (labels come from translations). */
  itinerary: PackageDay[];
  /** Optional. When filled, cards show "mulai THB X". Empty for now —
   *  quotes go through WhatsApp. */
  prices?: Partial<Record<VehicleId, number>>;
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

export const tourPackages: TourPackage[] = [
  {
    id: "bangkok-pattaya-3d2n",
    days: 3,
    nights: 2,
    cityIds: ["bangkok", "pattaya"],
    // Coral Island beach
    image: unsplash("photo-1687320961478-387af61e7cca"),
    itinerary: [
      { cityId: "pattaya", attractionIds: ["sanctuary-of-truth", "walking-street"] },
      { cityId: "pattaya", attractionIds: ["coral-island", "nong-nooch"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "wat-arun", "icon-siam"] },
    ],
  },
  {
    id: "bangkok-pattaya-4d3n",
    days: 4,
    nights: 3,
    cityIds: ["bangkok", "pattaya"],
    badge: "bestSeller",
    // Sanctuary of Truth on the coast
    image: unsplash("photo-1671597728617-32d19c352c4d"),
    itinerary: [
      { cityId: "pattaya", attractionIds: ["sanctuary-of-truth", "walking-street"] },
      { cityId: "pattaya", attractionIds: ["coral-island", "nong-nooch", "big-buddha-hill"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "wat-pho", "wat-arun", "asiatique"] },
      { cityId: "bangkok", attractionIds: ["chatuchak", "icon-siam"] },
    ],
  },
  {
    id: "bangkok-khaoyai-4d3n",
    days: 4,
    nights: 3,
    cityIds: ["bangkok", "khaoyai"],
    // Khao Yai mountain panorama
    image: unsplash("photo-1601225612399-46e1fd6b9e90"),
    itinerary: [
      { cityId: "khaoyai", attractionIds: ["midwinter-green"] },
      { cityId: "khaoyai", attractionIds: ["khao-yai-national-park", "pb-valley-winery"] },
      { cityId: "khaoyai", attractionIds: ["primo-piazza", "the-bloom"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "icon-siam"] },
    ],
  },
  {
    id: "bangkok-kanchanaburi-4d3n",
    days: 4,
    nights: 3,
    cityIds: ["bangkok", "kanchanaburi"],
    // Death Railway train on the cliffside trestle
    image: unsplash("photo-1702826711635-790dc66f1c41"),
    itinerary: [
      { cityId: "kanchanaburi", attractionIds: ["bridge-river-kwai", "war-cemetery"] },
      { cityId: "kanchanaburi", attractionIds: ["death-railway", "erawan-falls"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "wat-arun", "chatuchak"] },
      { cityId: "bangkok", attractionIds: ["icon-siam"] },
    ],
  },
  {
    id: "bangkok-huahin-4d3n",
    days: 4,
    nights: 3,
    cityIds: ["bangkok", "huahin"],
    // Hua Hin Railway Station royal pavilion
    image: "/huahin-station.jpg",
    itinerary: [
      { cityId: "huahin", attractionIds: ["huahin-railway-station", "cicada-market"] },
      { cityId: "huahin", attractionIds: ["santorini-park", "huahin-beach"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "wat-pho", "asiatique"] },
      { cityId: "bangkok", attractionIds: ["chatuchak"] },
    ],
  },
  {
    id: "bangkok-pattaya-khaoyai-5d4n",
    days: 5,
    nights: 4,
    cityIds: ["bangkok", "pattaya", "khaoyai"],
    badge: "bestSeller",
    // PB Valley vineyard
    image: unsplash("photo-1598616914356-0e09322ed3b8"),
    itinerary: [
      { cityId: "pattaya", attractionIds: ["sanctuary-of-truth", "walking-street"] },
      { cityId: "pattaya", attractionIds: ["coral-island", "nong-nooch"] },
      { cityId: "khaoyai", attractionIds: ["pb-valley-winery", "primo-piazza"] },
      { cityId: "khaoyai", attractionIds: ["khao-yai-national-park", "the-bloom"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "icon-siam"] },
    ],
  },
  {
    id: "bangkok-pattaya-kanchanaburi-5d4n",
    days: 5,
    nights: 4,
    cityIds: ["bangkok", "pattaya", "kanchanaburi"],
    badge: "bestSeller",
    // Bridge over the River Kwai
    image: unsplash("photo-1624806296367-33e24d6162ef"),
    itinerary: [
      { cityId: "pattaya", attractionIds: ["sanctuary-of-truth", "walking-street"] },
      { cityId: "pattaya", attractionIds: ["coral-island", "nong-nooch"] },
      { cityId: "kanchanaburi", attractionIds: ["bridge-river-kwai", "death-railway"] },
      { cityId: "kanchanaburi", attractionIds: ["erawan-falls", "jeath-museum"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "chatuchak"] },
    ],
  },
  {
    id: "bangkok-pattaya-huahin-5d4n",
    days: 5,
    nights: 4,
    cityIds: ["bangkok", "pattaya", "huahin"],
    // Santorini Park
    image: unsplash("photo-1533105079780-92b9be482077"),
    itinerary: [
      { cityId: "pattaya", attractionIds: ["sanctuary-of-truth", "walking-street"] },
      { cityId: "pattaya", attractionIds: ["coral-island", "nong-nooch"] },
      { cityId: "huahin", attractionIds: ["huahin-railway-station", "cicada-market"] },
      { cityId: "huahin", attractionIds: ["santorini-park", "huahin-beach"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "icon-siam"] },
    ],
  },
  {
    id: "bangkok-khaoyai-kanchanaburi-5d4n",
    days: 5,
    nights: 4,
    cityIds: ["bangkok", "khaoyai", "kanchanaburi"],
    // Erawan Waterfalls emerald pools
    image: unsplash("photo-1585806882217-265db0aeefd4"),
    itinerary: [
      { cityId: "khaoyai", attractionIds: ["midwinter-green", "primo-piazza"] },
      { cityId: "khaoyai", attractionIds: ["khao-yai-national-park", "pb-valley-winery"] },
      { cityId: "kanchanaburi", attractionIds: ["bridge-river-kwai", "death-railway"] },
      { cityId: "kanchanaburi", attractionIds: ["erawan-falls"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "chatuchak"] },
    ],
  },
  {
    id: "bangkok-pattaya-kanchanaburi-khaoyai-6d5n",
    days: 6,
    nights: 5,
    cityIds: ["bangkok", "pattaya", "kanchanaburi", "khaoyai"],
    badge: "grandTour",
    // Khao Yai National Park
    image: unsplash("photo-1748966006345-ea3c0ca397e9"),
    itinerary: [
      { cityId: "pattaya", attractionIds: ["sanctuary-of-truth", "walking-street"] },
      { cityId: "pattaya", attractionIds: ["coral-island", "nong-nooch"] },
      { cityId: "kanchanaburi", attractionIds: ["bridge-river-kwai", "death-railway"] },
      { cityId: "kanchanaburi", attractionIds: ["erawan-falls"] },
      { cityId: "khaoyai", attractionIds: ["khao-yai-national-park", "pb-valley-winery", "primo-piazza"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "icon-siam"] },
    ],
  },
  {
    id: "bangkok-pattaya-khaoyai-huahin-6d5n",
    days: 6,
    nights: 5,
    cityIds: ["bangkok", "pattaya", "khaoyai", "huahin"],
    // Nong Nooch Tropical Garden
    image: unsplash("photo-1712335866940-958e9b5fdba1"),
    itinerary: [
      { cityId: "pattaya", attractionIds: ["sanctuary-of-truth", "walking-street"] },
      { cityId: "pattaya", attractionIds: ["coral-island", "nong-nooch"] },
      { cityId: "khaoyai", attractionIds: ["pb-valley-winery", "primo-piazza"] },
      { cityId: "khaoyai", attractionIds: ["khao-yai-national-park"] },
      { cityId: "huahin", attractionIds: ["santorini-park", "huahin-beach", "cicada-market"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "chatuchak"] },
    ],
  },
  {
    id: "bangkok-pattaya-huahin-kanchanaburi-7d6n",
    days: 7,
    nights: 6,
    cityIds: ["bangkok", "pattaya", "huahin", "kanchanaburi"],
    // Wat Arun from the Chao Phraya river
    image: unsplash("photo-1613672803979-a6edfc5a179b"),
    itinerary: [
      { cityId: "pattaya", attractionIds: ["sanctuary-of-truth", "walking-street"] },
      { cityId: "pattaya", attractionIds: ["coral-island", "nong-nooch"] },
      { cityId: "huahin", attractionIds: ["huahin-railway-station", "cicada-market"] },
      { cityId: "huahin", attractionIds: ["santorini-park", "huahin-beach"] },
      { cityId: "kanchanaburi", attractionIds: ["bridge-river-kwai", "death-railway"] },
      { cityId: "kanchanaburi", attractionIds: ["erawan-falls"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "wat-arun", "icon-siam"] },
    ],
  },
  {
    id: "bangkok-pattaya-kanchanaburi-khaoyai-huahin-7d6n",
    days: 7,
    nights: 6,
    cityIds: ["bangkok", "pattaya", "kanchanaburi", "khaoyai", "huahin"],
    badge: "allCities",
    // Grand Palace
    image: unsplash("photo-1586098311577-520120ba3df3"),
    itinerary: [
      { cityId: "pattaya", attractionIds: ["sanctuary-of-truth", "walking-street"] },
      { cityId: "pattaya", attractionIds: ["coral-island", "nong-nooch"] },
      { cityId: "kanchanaburi", attractionIds: ["bridge-river-kwai", "death-railway"] },
      { cityId: "kanchanaburi", attractionIds: ["erawan-falls"] },
      { cityId: "khaoyai", attractionIds: ["khao-yai-national-park", "pb-valley-winery", "primo-piazza"] },
      { cityId: "huahin", attractionIds: ["santorini-park", "cicada-market"] },
      { cityId: "bangkok", attractionIds: ["grand-palace", "icon-siam"] },
    ],
  },
];

export function getPackage(id: string): TourPackage | undefined {
  return tourPackages.find((p) => p.id === id);
}

/** "Bangkok Pattaya 4D3N" — proper nouns, identical across languages. */
export function packageTitle(pkg: TourPackage): string {
  const cities = pkg.cityIds.map((id) => cityNames[id]).join(" ");
  return `${cities} ${pkg.days}D${pkg.nights}N`;
}

/** Cheapest published price, if any — packages are WhatsApp-quoted for now. */
export function cheapestPackagePrice(pkg: TourPackage): number | undefined {
  if (!pkg.prices) return undefined;
  const prices = Object.values(pkg.prices).filter((p): p is number => p != null);
  return prices.length ? Math.min(...prices) : undefined;
}

/** Image for an attraction id, looked up from the city day it appears in. */
export function attractionImage(cityId: string, attractionId: string): string | undefined {
  return getCity(cityId)?.attractions.find((a) => a.id === attractionId)?.image;
}
