import OpenAI from "openai";
import {
  resolveGeneratedPlaces,
  type CatalogPlace,
} from "@/lib/admin/itineraryGeneration";
import { createClient } from "@/lib/supabase/server";

// Single-day arrangement: the admin pastes a raw place list (e.g.
// "Bangkok: Jodd Fair, Erawadee Shop, Platinum, Pratunam") and the model
// returns that day's stops in a realistic visiting order with hours.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    theme: { type: "string" },
    city: { type: "string" },
    route: { type: "string" },
    intro: { type: "string" },
    cityHighlight: { type: "string" },
    activities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          time: { type: "string" },
          text: { type: "string" },
        },
        required: ["time", "text"],
      },
    },
    places: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          activity: { type: "string" },
        },
        required: ["name", "activity"],
      },
    },
  },
  required: [
    "title",
    "theme",
    "city",
    "route",
    "intro",
    "cityHighlight",
    "activities",
    "places",
  ],
} as const;

const SYSTEM = `You are a travel planner for "Keliling Thailand", an Indonesian-run private tour & vehicle charter company in Thailand.

The admin pastes a raw list of places for ONE touring day, usually as "Kota: tempat, tempat, tempat" (e.g. "Bangkok: Jodd Fair, Erawadee Shop, Platinum, Pratunam"). Arrange that single day. Rules:
- Write all text in Bahasa Indonesia.
- Every pasted place is mandatory: never omit, replace, or substitute it. Fix obvious misspellings to the attraction's real name.
- Order the stops in a realistic geographic route from morning to evening, accounting for Bangkok traffic, opening hours (markets/night markets open late — e.g. Jodd Fair opens ±16:00), and travel time between stops.
- "activities": one time-stamped row per stop ("HH:MM" 24h). Each attraction row uses the format "Nama Atraksi: deskripsi" — the attraction's exact name, a colon, then ONE Indonesian sentence of 6-10 words (fits a single printed line; e.g. "Elephant Village: Melihat dan belajar tentang gajah dari jarak dekat."). Also include meals and short transfers where natural (breakfast/lunch/dinner around the stops). Do NOT include hotel pickup/drop-off unless the pasted text mentions it.
- "places": every pasted attraction (visiting order), each "activity" in the same "Nama Atraksi: deskripsi" format with ONE warm Indonesian sentence of 6-10 words about the experience there.
- "title": short evocative day title. "theme": 1-3 word UPPERCASE vibe tag. "city": main city UPPERCASE. "route": short UPPERCASE arrow route of the day's stops. "intro": warm 1-2 sentence day summary. "cityHighlight": 1-2 sentences on what the city is famous for.
- Do not invent prices. Do not mention competitors.`;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(request: Request) {
  // Gate: only authenticated admins may spend API tokens.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY belum di-set di server." },
      { status: 500 }
    );
  }

  let text = "";
  try {
    const body = await request.json();
    text = String(body?.text ?? "").trim();
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (!text) {
    return Response.json(
      { error: "Tempel daftar tempat dulu." },
      { status: 400 }
    );
  }

  // Catalog gives canonical names + photos for pasted places that match.
  let catalogRows: CatalogPlace[] = [];
  try {
    const { data, error } = await supabase
      .from("places")
      .select("city, name, image_url, description")
      .order("sort", { ascending: true });
    if (error) console.error("itinerary/day: places fetch failed", error.message);
    catalogRows = (data as CatalogPlace[]) ?? [];
  } catch {
    catalogRows = [];
  }
  const catalogText = catalogRows.length
    ? [...new Set(catalogRows.map((r) => r.name))].join(" | ")
    : "(katalog kosong)";

  try {
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            SYSTEM +
            `\n\nKATALOG ATRAKSI (jika tempat yang ditempel cocok dengan katalog, gunakan nama PERSIS seperti di katalog):\n` +
            catalogText,
        },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "itinerary_day", strict: true, schema: SCHEMA },
      },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as {
      city?: string;
      places?: { name?: string; activity?: string }[];
      [k: string]: unknown;
    };

    return Response.json({
      ...parsed,
      places: resolveGeneratedPlaces(
        parsed.places ?? [],
        catalogRows,
        parsed.city ?? ""
      ),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
