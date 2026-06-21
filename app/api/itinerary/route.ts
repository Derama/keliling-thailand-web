import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

interface PlaceRow {
  city: string;
  name: string;
  image_url: string | null;
  description: string | null;
}

// JSON shape the model must return (strict structured output).
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tripTitle: { type: "string" },
    notes: { type: "string" },
    days: {
      type: "array",
      items: {
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
              },
              required: ["name"],
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
      },
    },
  },
  required: ["tripTitle", "notes", "days"],
} as const;

const SYSTEM = `You are a travel planner for "Keliling Thailand", an Indonesian-run private tour & vehicle charter company in Thailand (Bangkok, Pattaya, Khao Yai, Hua Hin, Ayutthaya, Kanchanaburi, Chiang Mai/Rai).

Write a realistic day-by-day itinerary based on the customer's request. Rules:
- Write all text in Bahasa Indonesia.
- For each day provide:
  - "title": a short evocative day title (e.g. "Pattaya — Pantai & Buddha Agung").
  - "theme": a 1-3 word UPPERCASE tag for the day's vibe (e.g. "MENUJU PESISIR", "ONE DAY TRIP", "HARI KEDATANGAN").
  - "city": the main city/area that day in UPPERCASE (e.g. "BANGKOK", "PATTAYA", "KHAO YAI").
  - "route": a short arrow route in UPPERCASE (e.g. "BANGKOK → PATTAYA → CHECK IN HOTEL").
  - "intro": one warm 1-2 sentence italic-style summary of the day.
  - "cityHighlight": 1-2 sentences highlighting the city/area visited that day — what it is famous for, its vibe or signature experiences (for a magazine-style "highlight kota" footer band).
  - "activities": time-stamped activities (e.g. "08:00"), concrete with real attractions, meals, transfers. Keep timing realistic for Thailand traffic.
- "notes": short inclusions/exclusions or tips (1-3 lines).
- Do not invent prices. Do not mention competitors.`;

// Mini-tier default; override with OPENAI_MODEL if needed.
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

  let prompt = "";
  try {
    const body = await request.json();
    prompt = String(body?.prompt ?? "").trim();
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (!prompt) {
    return Response.json(
      { error: "Tulis permintaan customer dulu." },
      { status: 400 }
    );
  }

  // Curated attraction catalog (only rows with a photo can become a card).
  let catalogRows: PlaceRow[] = [];
  try {
    const { data, error } = await supabase
      .from("places")
      .select("city, name, image_url, description")
      .order("sort", { ascending: true });
    if (error) console.error("itinerary: places fetch failed", error.message);
    catalogRows = ((data as PlaceRow[]) ?? []).filter((r) => !!r.image_url);
  } catch {
    catalogRows = []; // text-only itinerary if the catalog can't be read
  }

  // Group names by UPPERCASE city for the prompt.
  const byCity = new Map<string, string[]>();
  for (const r of catalogRows) {
    const key = (r.city ?? "").toUpperCase();
    const list = byCity.get(key) ?? [];
    list.push(r.name);
    byCity.set(key, list);
  }
  const catalogText = byCity.size
    ? [...byCity.entries()]
        .map(([city, names]) => `${city}: ${names.join(" | ")}`)
        .join("\n")
    : "(katalog kosong)";

  try {
    const client = new OpenAI();
    const systemWithCatalog =
      SYSTEM +
      `\n\nKATALOG ATRAKSI (pilih HANYA dari daftar ini untuk "places"):\n` +
      catalogText +
      `\n\nUntuk setiap hari, isi "places" dengan 2-3 nama atraksi NYATA dari katalog yang cocok dengan kota hari itu (field "city"). Salin nama PERSIS seperti di katalog. Jika kota itu tidak ada di katalog, kembalikan "places": [].`;

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemWithCatalog },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "itinerary", strict: true, schema: SCHEMA },
      },
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text) as {
      tripTitle?: string;
      notes?: string;
      days?: Array<{
        city?: string;
        places?: { name?: string }[];
        [k: string]: unknown;
      }>;
    };

    // Resolve place names to real cards: exact (case-insensitive) match,
    // preferring the day's city, else any city. Drop misses. Cap 3/day.
    const norm = (s: string) => s.trim().toLowerCase();
    const days = (parsed.days ?? []).map((d) => {
      const cityKey = (d.city ?? "").toUpperCase();
      const chosen = (d.places ?? [])
        .map((p) => norm(p.name ?? ""))
        .filter(Boolean);
      const cards: { name: string; image: string; desc: string }[] = [];
      for (const wanted of chosen) {
        if (cards.length >= 3) break;
        const row =
          catalogRows.find(
            (r) => (r.city ?? "").toUpperCase() === cityKey && norm(r.name) === wanted
          ) ?? catalogRows.find((r) => norm(r.name) === wanted);
        if (row && !cards.some((c) => norm(c.name) === norm(row.name))) {
          cards.push({
            name: row.name,
            image: row.image_url ?? "",
            desc: row.description ?? "",
          });
        }
      }
      return { ...d, places: cards };
    });

    return Response.json({ ...parsed, days });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
