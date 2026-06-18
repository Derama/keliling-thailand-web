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

const SYSTEM = `You write short attraction blurbs for "Keliling Thailand", an Indonesian-run private tour company in Thailand.

Given an attraction name and city, write ONE concise description in Bahasa Indonesia.
Rules:
- 1-2 sentences, max ~30 words. Marketing tone but factual.
- Mention what makes the place worth visiting.
- Do not invent prices, opening hours, or competitor names.
- Plain text only, no markdown, no quotes.`;

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

  let name = "";
  let city = "";
  try {
    const body = await request.json();
    name = String(body?.name ?? "").trim();
    city = String(body?.city ?? "").trim();
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (!name) {
    return Response.json(
      { error: "Isi nama tempat dulu." },
      { status: 400 }
    );
  }

  try {
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: city
            ? `Tempat: ${name}\nKota: ${city}`
            : `Tempat: ${name}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "place", strict: true, schema: SCHEMA },
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
