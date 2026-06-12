// Site-wide constants and WhatsApp helpers.

export const WA_NUMBER = "6285750923934";

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

/** Replace {key} tokens in a translation template, e.g. fillTemplate(t, { city: "Bangkok" }). */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}
