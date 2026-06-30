// lib/admin/leadMessaging.ts

export type LeadChannel =
  | "instagram" | "whatsapp" | "facebook" | "tiktok" | "website" | "other";

/** Replace {nama} with the lead's name. Unknown placeholders are left as-is. */
export function fillTemplate(template: string, lead: { name: string }): string {
  return template.replaceAll("{nama}", lead.name);
}

/** wa.me link with prefilled text; null when there's no usable phone. */
export function waLink(phone: string | null, text: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/** Public profile URL for a handle on a channel, or null when not derivable. */
export function profileUrl(
  channel: LeadChannel,
  handle: string | null
): string | null {
  if (!handle) return null;
  const h = handle.trim();
  if (!h) return null;
  if (isUrl(h)) return h;
  const user = h.replace(/^@/, "");
  switch (channel) {
    case "instagram":
      return `https://instagram.com/${user}`;
    case "tiktok":
      return `https://www.tiktok.com/@${user}`;
    case "facebook":
      return `https://facebook.com/${user}`;
    default:
      return null; // whatsapp/website/other: only a full URL is usable
  }
}
