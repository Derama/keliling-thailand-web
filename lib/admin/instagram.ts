export type PostFormat = "4x5" | "1x1" | "9x16";
export type TemplateId = "A" | "B" | "C" | "D" | "E" | "F";

export const TEMPLATE_IDS: TemplateId[] = ["A", "B", "C", "D", "E", "F"];

export type PostKind = "review" | "attraction" | "journey";

export const POST_KINDS: PostKind[] = ["review", "attraction", "journey"];

export const KIND_LABELS: Record<PostKind, string> = {
  review: "Review Customer",
  attraction: "Atraksi & Event",
  journey: "Journey Trip",
};

export type AttractionTemplateId = "P1" | "P2" | "P3";
export const ATTRACTION_TEMPLATE_IDS: AttractionTemplateId[] = ["P1", "P2", "P3"];

export type JourneyStyleId = "J1" | "J2";
export const JOURNEY_STYLE_IDS: JourneyStyleId[] = ["J1", "J2"];

export const FORMAT_SIZES: Record<PostFormat, { w: number; h: number }> = {
  "4x5": { w: 1080, h: 1350 },
  "1x1": { w: 1080, h: 1080 },
  "9x16": { w: 1080, h: 1920 },
};

export const FORMAT_LABELS: Record<PostFormat, string> = {
  "4x5": "Portrait 4:5",
  "1x1": "Square 1:1",
  "9x16": "Story 9:16",
};

export interface BrandColors {
  navy: string;
  yellow: string;
}

export interface PostData {
  photoUrl: string;
  reviewText: string;
  customerName: string;
  city: string;
  destination: string;
  rating: number; // 1–5
  logoUrl: string | null;
  brandColors: BrandColors;
}

export function defaultPostData(): PostData {
  return {
    photoUrl: "",
    reviewText: "",
    customerName: "",
    city: "",
    destination: "",
    rating: 5,
    logoUrl: null,
    brandColors: { navy: "#1B2A4A", yellow: "#F5C518" },
  };
}

/** Attraction / event promo post ("Songkran 2026 di Bangkok!"). */
export interface AttractionData {
  photoUrl: string;
  title: string; // "Songkran Festival 2026"
  location: string; // "Bangkok"
  date: string; // free text, e.g. "13–15 April 2026"
  hook: string; // one attention-grabbing line
  logoUrl: string | null;
  brandColors: BrandColors;
}

export function defaultAttractionData(): AttractionData {
  return {
    photoUrl: "",
    title: "",
    location: "",
    date: "",
    hook: "",
    logoUrl: null,
    brandColors: { navy: "#1B2A4A", yellow: "#F5C518" },
  };
}

/** One carousel slide of a trip-story post. */
export interface JourneySlide {
  photoUrl: string;
  label: string; // "Day 1"
  text: string; // "Grand Palace & Wat Arun"
}

/** Trip-story carousel ("5D4N Bangkok & Pattaya"): cover + day slides. */
export interface JourneyData {
  title: string; // "5D4N Bangkok & Pattaya"
  customerName: string; // optional — "Perjalanan {name}"
  coverPhotoUrl: string;
  slides: JourneySlide[];
  logoUrl: string | null;
  brandColors: BrandColors;
}

export function defaultJourneyData(): JourneyData {
  return {
    title: "",
    customerName: "",
    coverPhotoUrl: "",
    slides: [{ photoUrl: "", label: "Day 1", text: "" }],
    logoUrl: null,
    brandColors: { navy: "#1B2A4A", yellow: "#F5C518" },
  };
}

/** Prompt for tightening a raw, possibly-messy short text without inventing facts. */
export function buildPolishPrompt(raw: string): { system: string; user: string } {
  const system = `You clean up short texts (customer reviews, promo hooks, day captions) for a travel company's social posts.
Rules:
- Reply in the SAME language as the input.
- Fix spelling, grammar, and spacing; make it warm and natural.
- Keep it to 1-2 short sentences suitable for a photo overlay.
- Do NOT invent, add, or fabricate any detail, place, name, or claim not present in the input.
- Plain text only — no quotes, no hashtags, no emoji.`;
  const user = `Teks mentah:\n${raw}`;
  return { system, user };
}

export type CaptionRequest =
  | { kind: "review"; reviewText: string; customerName: string; destination: string }
  | { kind: "attraction"; title: string; location: string; date: string; hook: string }
  | { kind: "journey"; title: string; customerName: string; days: string[] };

const CAPTION_BASE = `Kamu menulis caption Instagram untuk "Keliling Thailand", jasa tour privat asal Indonesia di Thailand.
Aturan umum:
- Tulis dalam Bahasa Indonesia, hangat dan mengundang.
- Akhiri dengan ajakan lembut untuk DM / WhatsApp.
- Tambahkan satu baris berisi 8-12 hashtag relevan (wisata Thailand + destinasi).
- Jangan mengarang detail yang tidak disebut. Jangan pakai markdown.`;

/** Chat messages for the Indonesian caption + hashtags generator, per post kind. */
export function buildCaptionMessages(
  input: CaptionRequest
): Array<{ role: "system" | "user"; content: string }> {
  let system: string;
  let user: string;
  switch (input.kind) {
    case "attraction":
      system = `${CAPTION_BASE}
Jenis post: promosi atraksi / event untuk menarik traffic.
- Mulai dengan hook yang bikin penasaran atau FOMO.
- 2-4 kalimat: apa event/atraksinya, kapan, kenapa seru.`;
      user = `Event/atraksi: ${input.title || "(tanpa judul)"}
Lokasi: ${input.location || "Thailand"}
Tanggal: ${input.date || "(tidak disebut)"}
Hook: ${input.hook || "(kosong)"}`;
      break;
    case "journey":
      system = `${CAPTION_BASE}
Jenis post: cerita perjalanan customer (carousel).
- Ceritakan ringkas alur trip dari day highlights, gaya storytelling.
- 3-5 kalimat, ajak pembaca swipe untuk lihat perjalanannya.`;
      user = `Judul trip: ${input.title || "(tanpa judul)"}
Nama customer: ${input.customerName || "(tanpa nama)"}
Highlight per hari:
${input.days.filter(Boolean).join("\n") || "(kosong)"}`;
      break;
    default:
      system = `${CAPTION_BASE}
Jenis post: testimoni customer.
- 2-4 kalimat berdasarkan ulasan pelanggan dan destinasi.`;
      user = `Ulasan: ${input.reviewText || "(kosong)"}
Nama pelanggan: ${input.customerName || "(tanpa nama)"}
Destinasi: ${input.destination || "Thailand"}`;
  }
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
