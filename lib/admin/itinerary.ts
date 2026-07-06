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
  /** AI-written descriptive line for the timetable (what you do there). */
  activity?: string;
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
  { time: "07:30", text: "Sarapan di hotel" },
  { time: "12:30", text: "Makan siang kuliner lokal" },
  { time: "19:00", text: "Makan malam santai" },
];

function timeToMin(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t || "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Insert a row at the position its time fits (before the first later-timed row),
 * without reordering the rest — keeps the admin's arrangement intact.
 */
export function insertByTime(
  acts: ItineraryActivity[],
  row: ItineraryActivity
): ItineraryActivity[] {
  const t = timeToMin(row.time);
  let idx = acts.findIndex((a) => timeToMin(a.time) > t);
  if (idx < 0) idx = acts.length;
  const next = [...acts];
  next.splice(idx, 0, row);
  return next;
}

/**
 * Rebuild a day's timetable around its attraction photos while preserving the
 * admin's arranged ORDER (rows are not re-sorted by clock time):
 *   - existing rows stay in their current positions;
 *   - attraction rows keep their time/label edits (default time only if empty);
 *   - manual rows (meals, custom stops) are left untouched;
 *   - newly added attractions are appended at the end.
 */
/** Timetable label for a place: "Nama Tempat: deskripsi" (AI "activity" lines
 * already carry the name prefix; catalog descriptions don't). */
function placeStopText(p: ItineraryPlace): string {
  if (p.activity) return p.activity;
  return p.desc ? `${p.name}: ${p.desc}` : p.name;
}

export function scheduleFromPlaces(
  places: ItineraryPlace[],
  prev: ItineraryActivity[] = []
): ItineraryActivity[] {
  const byId = new Map(places.map((p) => [p.id, p]));
  const defaults = distributeTimes(places.length);
  const defaultTime = new Map(places.map((p, i) => [p.id, defaults[i]]));

  const out: ItineraryActivity[] = [];
  const seen = new Set<string>();
  for (const a of prev) {
    const p = byId.get(a.id);
    if (p) {
      out.push({
        id: a.id,
        time: a.time || defaultTime.get(a.id) || "",
        text: a.text || placeStopText(p),
      });
      seen.add(a.id);
    } else {
      out.push(a); // manual row — keep as-is, in place
    }
  }
  for (const p of places) {
    if (!seen.has(p.id)) {
      out.push({
        id: p.id,
        time: defaultTime.get(p.id) || "",
        text: placeStopText(p),
      });
    }
  }
  return out;
}

function normalizeActivityText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function matchingPlace(
  places: ItineraryPlace[],
  activityText: string
): ItineraryPlace | undefined {
  const normalizedActivity = normalizeActivityText(activityText);
  const matches = places.flatMap((place) => {
    const normalizedName = normalizeActivityText(place.name);
    const matchesActivity =
      normalizedName !== "" &&
      ` ${normalizedActivity} `.includes(` ${normalizedName} `);
    return matchesActivity ? [{ place, normalizedName }] : [];
  });
  matches.sort((a, b) => b.normalizedName.length - a.normalizedName.length);
  return matches[0]?.place;
}

/**
 * Build a day's schedule on generate: photo-linked attraction stops merged with
 * the complete AI schedule. A matching AI attraction updates its linked stop's
 * time without duplicating it; unmatched rows are slotted by time with fresh ids
 * so meals, logistics, and requested attractions survive as manual rows.
 */
export function mergeAiSchedule(
  places: ItineraryPlace[],
  aiRows: { time?: string; text?: string }[]
): ItineraryActivity[] {
  let out = scheduleFromPlaces(places);
  for (const r of aiRows) {
    const text = (r.text ?? "").trim();
    if (!text) continue;

    const place = matchingPlace(places, text);
    if (place) {
      const index = out.findIndex((activity) => activity.id === place.id);
      if (index >= 0) {
        const existing = out[index];
        out[index] = {
          ...existing,
          time: (r.time ?? "").trim() || existing.time,
          text: place.activity || existing.text || text,
        };
      }
      continue;
    }

    out = insertByTime(out, {
      id: crypto.randomUUID(),
      time: (r.time ?? "").trim(),
      text,
    });
  }
  return out;
}

/** One practical reminder shown on the itinerary closing page. */
export interface TravelTip {
  label: string;
  text: string;
}

/** Default "Info Perjalanan" reminders — seeded into each new draft, editable. */
export const DEFAULT_TRAVEL_TIPS: TravelTip[] = [
  { label: "Mata Uang", text: "Baht Thailand (THB). Tukar di money changer (mis. SuperRich) untuk kurs terbaik." },
  { label: "Listrik", text: "220V, soket tipe A/B/C. Bawa universal adapter." },
  { label: "Cuaca & Pakaian", text: "Panas & lembap. Baju ringan, sunblock, dan payung lipat." },
  { label: "Etika Kuil", text: "Tutup bahu & lutut saat memasuki kuil." },
  { label: "Nomor Darurat", text: "Polisi 191 · Turis 1155 · Ambulans 1669." },
  { label: "Selama Perjalanan", text: "Ada kendala? Hubungi tim kami via WhatsApp kapan saja." },
];

/** Trip-level meta for the brochure cover + day pills. */
export interface ItineraryMeta {
  vehicle: string; // e.g. "VAN"
  heroImage: string; // cover hero URL
  edition: string; // e.g. "EDISI 2026"
  docNo: string; // e.g. "NO. 002"
}
