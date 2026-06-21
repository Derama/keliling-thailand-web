// Types for the itinerary builder (in-memory, branded print output).

export interface ItineraryActivity {
  id: string;
  time: string;
  text: string;
}

/** A place card (attraction) attached to a day — shown with image in print. */
export interface ItineraryPlace {
  id: string;
  name: string;
  image: string;
  desc: string;
}

export interface ItineraryDay {
  id: string;
  title: string;
  date: string;
  /** Eyebrow middle tag, e.g. "MENUJU PESISIR". Optional. */
  theme?: string;
  /** Eyebrow right tag, e.g. "PATTAYA". Optional. */
  city?: string;
  /** Route line, e.g. "BANGKOK → PATTAYA → CHECK IN HOTEL". Optional. */
  route?: string;
  /** Italic intro paragraph shown under the title. Optional. */
  intro?: string;
  /** City highlight blurb shown in the bottom band of the day page. Optional. */
  cityHighlight?: string;
  activities: ItineraryActivity[];
  places: ItineraryPlace[];
}

// ── Auto timetable ────────────────────────────────────────────
// The day's schedule is derived from its attraction photos: one timed stop
// per place, spread across the touring day. Each activity links to its place
// by id so manual label edits survive, and times rebalance when places change.

const DAY_START_MIN = 9 * 60; // 09:00
const DAY_END_MIN = 17 * 60; // 17:00

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Evenly spread n stop times across the touring day (09:00–17:00). */
export function distributeTimes(n: number): string[] {
  if (n <= 0) return [];
  if (n === 1) return [fmtMin(DAY_START_MIN)];
  const step = (DAY_END_MIN - DAY_START_MIN) / n;
  return Array.from({ length: n }, (_, i) =>
    fmtMin(Math.round(DAY_START_MIN + i * step))
  );
}

/** Default meal stops the admin can add to a day (Indonesian labels). */
export const MEAL_STOPS: { time: string; text: string }[] = [
  { time: "07:30", text: "Sarapan" },
  { time: "12:30", text: "Makan Siang" },
  { time: "19:00", text: "Makan Malam" },
];

function timeToMin(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t || "").trim());
  // Rows without a valid time sink to the end so they're easy to fill in.
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.MAX_SAFE_INTEGER;
}

/** Order a day's stops chronologically; untimed rows go last. */
export function sortActivitiesByTime(
  acts: ItineraryActivity[]
): ItineraryActivity[] {
  return [...acts].sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
}

/**
 * Rebuild a day's timetable around its attraction photos: one stop per place
 * (times auto-distributed, label = place name, preserving a prior edit), while
 * KEEPING any extra rows the admin added (meals, custom stops). Sorted by time.
 */
export function scheduleFromPlaces(
  places: ItineraryPlace[],
  prev: ItineraryActivity[] = []
): ItineraryActivity[] {
  const placeIds = new Set(places.map((p) => p.id));
  const times = distributeTimes(places.length);
  const placeStops = places.map((p, i) => {
    const existing = prev.find((a) => a.id === p.id);
    return { id: p.id, time: times[i], text: existing?.text || p.name };
  });
  // Anything not tied to a current place is a manual row — keep it untouched.
  const extras = prev.filter((a) => !placeIds.has(a.id));
  return sortActivitiesByTime([...placeStops, ...extras]);
}

/** Trip-level meta for the brochure cover + day pills. */
export interface ItineraryMeta {
  vehicle: string; // e.g. "VAN"
  heroImage: string; // cover hero URL
  edition: string; // e.g. "EDISI 2026"
  docNo: string; // e.g. "NO. 002"
}
