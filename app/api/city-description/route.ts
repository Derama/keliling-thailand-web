import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

// JSON shape the model must return.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    description: { type: "string" },
  },
  required: ["description"],
} as const;

const SYSTEM = `You write short city intros for the travel brochure of "Keliling Thailand", an Indonesian-run private tour company in Thailand.

Given a city name and (optionally) its top destinations, write ONE city description in Bahasa Indonesia.
Rules:
- 2-3 sentences, max ~45 words. Warm marketing tone but factual.
- Capture the city's vibe and why it's worth visiting; weave in a couple of the named destinations naturally if given.
- Do not invent prices, opening hours, distances, or competitor names.
- Plain text only, no markdown, no quotes, no headings.`;

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

  let city = "";
  let places: string[] = [];
  try {
    const body = await request.json();
    city = String(body?.city ?? "").trim();
    if (Array.isArray(body?.places)) {
      places = body.places
        .map((p: unknown) => String(p ?? "").trim())
        .filter(Boolean)
        .slice(0, 8);
    }
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (!city) {
    return Response.json({ error: "Nama kota kosong." }, { status: 400 });
  }

  try {
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: places.length
            ? `Kota: ${city}\nDestinasi unggulan: ${places.join(", ")}`
            : `Kota: ${city}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "city", strict: true, schema: SCHEMA },
      },
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);
    return Response.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
