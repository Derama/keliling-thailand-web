import OpenAI from "openai";
import {
  resolveGeneratedPlaces,
  type CatalogPlace,
} from "@/lib/admin/itineraryGeneration";
import { createClient } from "@/lib/supabase/server";

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
      },
    },
  },
  required: ["tripTitle", "notes", "days"],
} as const;

const SYSTEM = `You are a travel planner for "Keliling Thailand", an Indonesian-run private tour & vehicle charter company in Thailand (Bangkok, Pattaya, Khao Yai, Hua Hin, Ayutthaya, Kanchanaburi, Chiang Mai/Rai).

Write a realistic day-by-day itinerary based on the customer's request. Rules:
- Write all text in Bahasa Indonesia.
- Every explicitly named destination or attraction is mandatory: never omit it, replace it, or substitute a different place.
- Preserve the requested number and division of days. Do not merge, remove, or add days unless the customer asks for it.
- Arrange visits in a realistic geographic order, accounting for Bangkok traffic, attraction opening times, ferry schedules, and travel time between stops.
- Every attraction activity must begin with the attraction's exact name, followed by a warm 1-2 sentence Indonesian description of the experience, such as family time, photos, culture, or shopping.
- Include pickup, transfers, meals, hotel check-in, and return trips when relevant to the requested day.
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
  let catalogRows: CatalogPlace[] = [];
  try {
    const { data, error } = await supabase
      .from("places")
      .select("city, name, image_url, description")
      .order("sort", { ascending: true });
    if (error) console.error("itinerary: places fetch failed", error.message);
    catalogRows = ((data as CatalogPlace[]) ?? []).filter((r) => !!r.image_url);
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
      `\n\nKATALOG ATRAKSI (sumber untuk atraksi tambahan yang tidak diminta customer):\n` +
      catalogText +
      `\n\nAturan "activities" dan "places":
- Setiap atraksi atau destinasi yang disebut eksplisit oleh customer WAJIB muncul di "activities" dan "places", meskipun namanya tidak ada di katalog. Jangan hilangkan atau ganti tempat tersebut. Tempat di luar katalog akan tetap ditampilkan tanpa foto.
- Atraksi tambahan pilihan AI yang tidak diminta customer WAJIB berasal dari katalog dan gunakan nama PERSIS seperti di katalog.
- Urutkan semua atraksi sesuai alur kunjungan yang realistis dari pagi ke sore. Masukkan semua tempat wajib lebih dulu; tambahkan atraksi katalog hanya jika tidak menggeser tempat wajib dari maksimal empat entri visual.
- Untuk setiap "places[].activity", awali dengan nama atraksi yang PERSIS sama dengan "places[].name", lalu tulis deskripsi hangat 1-2 kalimat dalam Bahasa Indonesia tentang pengalaman di sana, termasuk momen keluarga, foto, budaya, atau belanja yang relevan.
- Jika kota tidak ada di katalog, tetap masukkan semua atraksi yang diminta customer ke "places"; jangan menambahkan atraksi pilihan AI.`;

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
        places?: { name?: string; activity?: string }[];
        [k: string]: unknown;
      }>;
    };

    const days = (parsed.days ?? []).map((d) => {
      return {
        ...d,
        places: resolveGeneratedPlaces(
          d.places ?? [],
          catalogRows,
          d.city ?? ""
        ),
      };
    });

    // Auto cover: an attraction photo from the FIRST city (day 1). Fall back to
    // any later day only if day 1 has no photo. Editable client-side.
    const heroImage =
      ((days[0]?.places ?? []).find((c) => c.image) ??
        days.flatMap((d) => d.places).find((c) => c.image))?.image ?? "";

    return Response.json({ ...parsed, days, heroImage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
