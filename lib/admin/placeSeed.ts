// Placeholder attractions derived from the public tour data (lib/tours.ts).
// Imported once into the `places` table so the owner can replace the stock
// photos with real ones. Public /tours pages keep reading tours.ts directly;
// these DB rows feed the admin gallery + itinerary builder.

import { cities } from "@/lib/tours";
import { cityNames, attractionNames } from "@/lib/translations";

export interface SeedPlace {
  city: string;
  name: string;
  image_url: string | null;
}

// Curated photos downloaded to public/places/<cityId>/<attractionId>.jpg.
// Remote (Unsplash) tours.ts URLs map to the local copy; already-local
// images (e.g. /huahin-station.jpg) are kept as-is.
function seedImage(cityId: string, attractionId: string, src: string): string {
  return src.startsWith("http") ? `/places/${cityId}/${attractionId}.jpg` : src;
}

/** Flatten tours.ts attractions into placeholder place rows. */
export function seedPlaces(): SeedPlace[] {
  const out: SeedPlace[] = [];
  for (const c of cities) {
    const cityName = cityNames[c.id] ?? c.id;
    for (const a of c.attractions) {
      out.push({
        city: cityName,
        name: attractionNames[a.id] ?? a.id,
        image_url: seedImage(c.id, a.id, a.image),
      });
    }
  }
  return out;
}
