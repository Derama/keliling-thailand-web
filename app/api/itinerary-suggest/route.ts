import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { getCity } from "@/lib/itinerary";
import { itineraryTranslations } from "@/lib/translations";

type Lang = "id" | "en" | "th";

// Simple in-memory per-IP throttle: max 5 requests / 60s. Resets on redeploy;
// adequate to deter casual key-cost abuse. Not a distributed rate limiter.
const WINDOW_MS = 60_000;
const MAX_HITS = 5;
const hits = new Map<string, number[]>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

export async function POST(req: NextRequest) {
  let body: { cityId?: string; prompt?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const cityId = typeof body.cityId === "string" ? body.cityId : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const lang: Lang =
    body.lang === "en" || body.lang === "th" ? body.lang : "id";

  if (!cityId || !prompt) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const city = getCity(cityId);
  if (!city) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Build the catalog of valid attractions: id + localized display name.
  const names = itineraryTranslations[lang].attractions as Record<string, string>;
  const validIds = new Set(city.attractions.map((a) => a.id));
  const catalog = city.attractions
    .map((a) => `- ${a.id}: ${names[a.id] ?? a.id} (~${a.hours}h)`)
    .join("\n");

  const langName =
    lang === "en" ? "English" : lang === "th" ? "Thai" : "Indonesian";

  const system = [
    "You are a Thailand day-tour planner for Keliling Thailand.",
    `The tour is a single day in this city, max ${city.durationHours} hours of visiting.`,
    "You may ONLY choose attractions from the provided list, by their exact id.",
    "Order them into a sensible visiting sequence.",
    `Write 'dayPlan' as a short, friendly day-by-day narrative in ${langName}.`,
    'Respond ONLY as JSON: {"attractionIds": string[], "dayPlan": string}.',
  ].join(" ");

  const user = `City: ${cityId}\nAvailable attractions:\n${catalog}\n\nTraveler description: ${prompt}`;

  let raw: string;
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
      { timeout: 15_000 }
    );
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("itinerary-suggest OpenAI error:", err);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  let parsed: { attractionIds?: unknown; dayPlan?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  // Validate: keep only real ids for this city, preserve AI order, dedupe.
  const seen = new Set<string>();
  const attractionIds = Array.isArray(parsed.attractionIds)
    ? parsed.attractionIds.filter(
        (id): id is string =>
          typeof id === "string" &&
          validIds.has(id) &&
          !seen.has(id) &&
          (seen.add(id), true)
      )
    : [];
  const dayPlan = typeof parsed.dayPlan === "string" ? parsed.dayPlan : "";

  if (attractionIds.length === 0) {
    return NextResponse.json({ error: "no_suggestion" }, { status: 200 });
  }

  return NextResponse.json({ attractionIds, dayPlan });
}
