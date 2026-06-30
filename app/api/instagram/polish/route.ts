import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { buildPolishPrompt } from "@/lib/admin/instagram";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { text: { type: "string" } },
  required: ["text"],
} as const;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY belum di-set di server." },
      { status: 500 }
    );
  }

  let raw = "";
  try {
    const body = await request.json();
    raw = String(body?.text ?? "").trim();
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (!raw) {
    return Response.json({ error: "Isi ulasan dulu." }, { status: 400 });
  }

  try {
    const { system, user: userMsg } = buildPolishPrompt(raw);
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "polish", strict: true, schema: SCHEMA },
      },
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return Response.json(JSON.parse(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
