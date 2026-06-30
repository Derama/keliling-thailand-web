// Pickup-location suggestions from OpenStreetMap Nominatim — free, keyless,
// Thailand-scoped. Cached ~1h server-side. Free text stays valid client-side;
// this only suggests.
import { NextRequest } from "next/server";

interface NominatimResult {
  name?: string;
  display_name?: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json({ results: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("countrycodes", "th");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  // Force English place names instead of local Thai script.
  url.searchParams.set("accept-language", "en");

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim usage policy requires an identifying User-Agent.
        "User-Agent": "keliling-thailand-admin/1.0 (pickup-suggest)",
        // Belt-and-suspenders: also request English via header.
        "Accept-Language": "en",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json()) as NominatimResult[];
    const results = data
      .map((r) => {
        const label = r.display_name ?? "";
        const name = r.name?.trim() || label.split(",")[0]?.trim() || label;
        return { name, label };
      })
      .filter((r) => r.label);
    return Response.json({ results });
  } catch {
    return Response.json({ results: [] }, { status: 502 });
  }
}
