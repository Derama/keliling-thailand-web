// Site-wide constants and WhatsApp helpers.

export const WA_NUMBER = "6285750923934";

export const CONTACT_WHATSAPP = [
  { name: "Riddhan Fawwaz", number: "6285750923934" },
  { name: "Deva Adithya Rama", number: "66647646597" },
] as const;

export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/kelilingthailand/",
  facebook: "https://www.facebook.com/profile.php?id=61574350213706",
} as const;

export const OPERATOR_DETAILS = {
  name: "Love Bangkok Co., Ltd.",
  tourismLicense: "11/13151",
  companyRegistration: "0205568016435",
  address:
    "49/21 Moo 10, Nong Prue, Bang Lamung, Chon Buri 20150, Thailand",
} as const;

const productionUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  "https://kelilingthailand.com";

/** Absolute origin without trailing slash — for JSON-LD and canonical URLs. */
export const siteUrl = (
  productionUrl.startsWith("http") ? productionUrl : `https://${productionUrl}`
).replace(/\/$/, "");

export function waLink(message: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function waLinkTo(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Replace {key} tokens in a translation template, e.g. fillTemplate(t, { city: "Bangkok" }). */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}
