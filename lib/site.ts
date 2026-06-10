// Site-wide constants and WhatsApp helpers.

export const WA_NUMBER = "6285750923934";

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
