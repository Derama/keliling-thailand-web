import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

// JSON shape the model must return — same as the generate route PLUS stable ids
// on days / activities / places so the client can merge by identity and keep
// every untouched item (and its manual edits) byte-for-byte.
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
          id: { type: "string" },
          title: { type: "string" },
          theme: { type: "string" },
          city: { type: "string" },
          route: { type: "string" },
          intro: { type: "string" },
          cityHighlight: { type: "string" },
          date: { type: "string" },
          activities: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                time: { type: "string" },
                text: { type: "string" },
              },
              required: ["id", "time", "text"],
            },
          },
          places: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                activity: { type: "string" },
              },
              required: ["id", "name", "activity"],
            },
          },
        },
        required: [
          "id",
          "title",
          "theme",
          "city",
          "route",
          "intro",
          "cityHighlight",
          "date",
          "activities",
          "places",
        ],
      },
    },
  },
  required: ["tripTitle", "notes", "days"],
} as const;

const SYSTEM = `You are editing an existing day-by-day travel itinerary for "Keliling Thailand", an Indonesian-run private tour & vehicle charter company in Thailand.

You receive the CURRENT itinerary as JSON and an instruction from the admin. Apply ONLY the requested change. This is critical:
- Keep every other day, activity, and place EXACTLY as given — same id, same text, same order, same time. Do not rephrase, reorder, or "improve" anything the instruction did not ask about.
- Preserve every "id" you are given. Reuse the same id for any day / activity / place you keep or modify. Only invent a new id (any short unique string) for an item you genuinely add.
- All text stays in Bahasa Indonesia.
- Times stay realistic for Thailand traffic.
- For any attraction you ADD, set "places[].activity" to begin with the attraction's exact name, then a warm 1-2 sentence Indonesian description.
- Never invent prices. Never mention competitors.
- Do not change the number of days unless the instruction asks. Return the FULL updated itinerary (all days), not just the changed part.`;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const norm = (s: string) => s.trim().toLowerCase();

export async function POST(request: Request) {
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

  let current: unknown = null;
  let instruction = "";
  try {
    const body = await request.json();
    current = body?.current ?? null;
    instruction = String(body?.instruction ?? "").trim();
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (!instruction) {
    return Response.json(
      { error: "Tulis perubahan yang diinginkan dulu." },
      { status: 400 }
    );
  }
  if (!current || typeof current !== "object") {
    return Response.json(
      { error: "Tidak ada itinerary untuk diubah." },
      { status: 400 }
    );
  }

  // Catalog (only photo-bearing rows) so added attractions can resolve a photo.
  let catalog: { city: string; name: string; image_url: string | null }[] = [];
  try {
    const { data } = await supabase
      .from("places")
      .select("city, name, image_url")
      .order("sort", { ascending: true });
    catalog = ((data as typeof catalog) ?? []).filter((r) => !!r.image_url);
  } catch {
    catalog = [];
  }
  const imageByName = new Map<string, string>();
  for (const r of catalog) {
    const key = norm(r.name);
    if (r.image_url && !imageByName.has(key)) imageByName.set(key, r.image_url);
  }

  const catalogText = catalog.length
    ? [...new Set(catalog.map((r) => r.name))].join(" | ")
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
            `\n\nKATALOG ATRAKSI (gunakan nama PERSIS bila menambah atraksi berfoto):\n` +
            catalogText,
        },
        {
          role: "user",
          content: `ITINERARY SAAT INI (JSON):\n${JSON.stringify(
            current
          )}\n\nPERMINTAAN PERUBAHAN:\n${instruction}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "itinerary_edit", strict: true, schema: SCHEMA },
      },
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text) as {
      tripTitle?: string;
      notes?: string;
      days?: Array<{
        places?: { name?: string }[];
        [k: string]: unknown;
      }>;
    };

    // Attach a best-effort catalog photo (by name) to every returned place. The
    // client still prefers an existing place's photo when the id is unchanged,
    // so manually uploaded photos survive.
    const days = (parsed.days ?? []).map((d) => ({
      ...d,
      places: (d.places ?? []).map((p) => ({
        ...p,
        image: imageByName.get(norm(p?.name ?? "")) ?? "",
      })),
    }));

    return Response.json({ ...parsed, days });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
