import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { buildCaptionMessages, type CaptionRequest } from "@/lib/admin/instagram";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { caption: { type: "string" } },
  required: ["caption"],
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

  let input: CaptionRequest;
  try {
    const body = await request.json();
    const s = (v: unknown) => String(v ?? "").trim();
    const kind = s(body?.kind) || "review";
    if (kind === "attraction") {
      input = {
        kind,
        title: s(body?.title),
        location: s(body?.location),
        date: s(body?.date),
        hook: s(body?.hook),
      };
    } else if (kind === "journey") {
      input = {
        kind,
        title: s(body?.title),
        customerName: s(body?.customerName),
        days: Array.isArray(body?.days) ? body.days.map(s) : [],
      };
    } else {
      input = {
        kind: "review",
        reviewText: s(body?.reviewText),
        customerName: s(body?.customerName),
        destination: s(body?.destination),
      };
    }
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }

  try {
    const messages = buildCaptionMessages(input);
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "caption", strict: true, schema: SCHEMA },
      },
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return Response.json(JSON.parse(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
