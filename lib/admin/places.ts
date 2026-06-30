// Places gallery — attractions per city with image + description.
// Stored in the `places` table; picked into the itinerary builder.

export interface Place {
  id: string;
  city: string;
  name: string;
  image_url: string | null;
  description: string | null;
  sort: number;
}

export interface PlaceCity {
  city: string;
  items: Place[];
}

/** Group place rows (already sorted) by city, preserving order. */
export function groupPlaces(rows: Place[]): PlaceCity[] {
  const cities: PlaceCity[] = [];
  const byCity = new Map<string, PlaceCity>();
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
