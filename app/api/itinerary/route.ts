import OpenAI from "openai";
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
        },
        required: ["title", "activities"],
      },
    },
  },
  required: ["tripTitle", "notes", "days"],
} as const;

const SYSTEM = `You are a travel planner for "Keliling Thailand", an Indonesian-run private tour & vehicle charter company in Thailand (Bangkok, Pattaya, Khao Yai, Hua Hin, Ayutthaya, Kanchanaburi, Chiang Mai/Rai).

Write a realistic day-by-day itinerary based on the customer's request. Rules:
- Write all text in Bahasa Indonesia.
- Each day: a short day title and a list of time-stamped activities (e.g. "08:00").
- Be concrete: name real attractions, meals, and transfers. Keep timing realistic for Thailand traffic.
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

  try {
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "itinerary", strict: true, schema: SCHEMA },
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
