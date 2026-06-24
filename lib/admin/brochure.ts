// Types + defaults for the company brochure builder (catalog PDF).
// Unlike the itinerary (customer-specific trip), the brochure is a marketing
// catalog: cities & top destinations, the fleet we offer, partner hotels, and
// attraction tickets. Assembled from the shared `places`, `hotel_rates`, and
// `attraction_rates` data, then printed as branded A4 pages.

/** One top destination shown on a city page (photo + blurb). */
export interface BrochureDestination {
  id: string;
  name: string;
  image: string;
  desc: string;
  /** Editor-only: true when toggled off (excluded from the printed page). */
  _off?: boolean;
}

/** A city section: an intro blurb + its top destinations. */
export interface BrochureCity {
  id: string;
  city: string;
  enabled: boolean;
  intro: string;
  /** Chosen hero photo URL for the city page. Empty = auto (first photo). */
  cover?: string;
  destinations: BrochureDestination[];
}

/** A vehicle card on the fleet page. */
export interface FleetItem {
  id: string;
  name: string;
  capacity: string;
  blurb: string;
  image: string;
  enabled: boolean;
}

/** A hotel / attraction line shown in the "menu" page (price optional). */
export interface CatalogItem {
  id: string;
  city: string;
  name: string;
  /** Selling price in THB, or null to hide the price (show "—"). */
  price: number | null;
  enabled: boolean;
}

/** Max top destinations shown per city page (keeps one page tidy). */
export const MAX_CITY_DESTINATIONS = 6;

/** Default fleet — mirrors the public landing page (lib/tours.ts + translations),
 *  including the per-vehicle photos under public/vehicles/<id>/. */
export const DEFAULT_FLEET: FleetItem[] = [
  {
    id: "altis",
    name: "Sedan — Toyota Altis",
    capacity: "1–3 penumpang",
    blurb: "Pas untuk pasangan atau solo traveler. Nyaman dan hemat.",
    image: "/vehicles/altis/altis.webp",
    enabled: true,
  },
  {
    id: "suv",
    name: "SUV — Corolla Cross GR Sport 2026 / Fortuner",
    capacity: "1–5 penumpang",
    blurb:
      "Keluarga kecil dengan bagasi besar — kabin tinggi dan lega.",
    image: "/vehicles/suv/corolla-cross-grsport-v3.png",
    enabled: true,
  },
  {
    id: "alphard",
    name: "New Alphard 40",
    capacity: "1–6 penumpang",
    blurb:
      "Kelas premium dengan kursi captain mewah. Cocok untuk tamu VIP dan keluarga yang ingin kenyamanan ekstra.",
    image: "/vehicles/alphard/alphard-v2.png",
    enabled: true,
  },
  {
    id: "van",
    name: "Van — Toyota Hiace",
    capacity: "5–10 penumpang",
    blurb: "Favorit rombongan keluarga. Ruang luas untuk koper.",
    image: "/vehicles/van/van-v3.png",
    enabled: true,
  },
  {
    id: "minibus",
    name: "Mini Bus",
    capacity: "10–20 penumpang",
    blurb: "Rombongan kantor, komunitas, atau keluarga besar.",
    image: "/vehicles/minibus/minibus.jpeg",
    enabled: true,
  },
  {
    id: "bus",
    name: "Bus",
    capacity: "20–40 penumpang",
    blurb:
      "Rombongan besar, tur kantor, atau grup wisata. Harga sesuai rute — tanya via WhatsApp.",
    image: "/vehicles/bus/bus.jpeg",
    enabled: true,
  },
];

/** Trip-agnostic brochure meta for the cover. */
export interface BrochureMeta {
  title: string;
  subtitle: string;
  coverImage: string;
  edition: string;
}

export const DEFAULT_META: BrochureMeta = {
  title: "Katalog Tur & Perjalanan",
  subtitle: "Bangkok • Pattaya • Hua Hin • Ayutthaya • Chiang Mai & sekitarnya",
  coverImage: "/brochure/cover.jpg",
  edition: "EDISI 2026",
};

export const DEFAULT_NOTES =
  "Termasuk: mobil ber-AC, supir (berbahasa Inggris), bensin, tol & parkir. " +
  "Tour guide berbahasa Indonesia tersedia atas permintaan. " +
  "Tidak termasuk: tiket masuk atraksi & hotel — bisa kami paketkan. " +
  "Harga dapat berubah mengikuti musim. Respon cepat via WhatsApp.";
