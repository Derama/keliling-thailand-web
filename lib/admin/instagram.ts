export type PostFormat = "4x5" | "1x1" | "9x16";
export type TemplateId = "A" | "B" | "C" | "D" | "E" | "F";

export const TEMPLATE_IDS: TemplateId[] = ["A", "B", "C", "D", "E", "F"];

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

/** Prompt for tightening a raw, possibly-messy review without inventing facts. */
export function buildPolishPrompt(raw: string): { system: string; user: string } {
  const system = `You clean up short customer reviews for a travel company's social posts.
Rules:
- Reply in the SAME language as the input.
- Fix spelling, grammar, and spacing; make it warm and natural.
- Keep it to 1-2 short sentences suitable for a photo overlay.
- Do NOT invent, add, or fabricate any detail, place, name, or claim not present in the input.
- Plain text only — no quotes, no hashtags, no emoji.`;
  const user = `Review mentah:\n${raw}`;
  return { system, user };
}

export interface CaptionInput {
  reviewText: string;
  customerName: string;
  destination: string;
}

/** Chat messages for the Indonesian caption + hashtags generator. */
export function buildCaptionMessages(
  input: CaptionInput
): Array<{ role: "system" | "user"; content: string }> {
  const system = `Kamu menulis caption Instagram untuk "Keliling Thailand", jasa tour privat asal Indonesia di Thailand.
Aturan:
- Tulis dalam Bahasa Indonesia, hangat dan mengundang.
- 2-4 kalimat berdasarkan ulasan pelanggan dan destinasi.
- Akhiri dengan ajakan lembut untuk DM / WhatsApp.
- Tambahkan satu baris berisi 8-12 hashtag relevan (wisata Thailand + destinasi).
- Jangan mengarang detail yang tidak disebut. Jangan pakai markdown.`;
  const user = `Ulasan: ${input.reviewText || "(kosong)"}
Nama pelanggan: ${input.customerName || "(tanpa nama)"}
Destinasi: ${input.destination || "Thailand"}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
