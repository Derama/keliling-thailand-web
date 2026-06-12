import type { Order } from "./types";

export function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatTHB(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Profit in THB, or null when fx_rate is missing/zero. */
export function profitTHB(
  o: Pick<Order, "price_idr" | "cost_thb" | "fx_rate">
): number | null {
  if (!o.fx_rate) return null;
  return o.price_idr / o.fx_rate - o.cost_thb;
}

export function profitIDR(
  o: Pick<Order, "price_idr" | "cost_thb" | "fx_rate">
): number | null {
  const thb = profitTHB(o);
  return thb === null ? null : thb * o.fx_rate;
}

/**
 * Document number like KT-2606-03 / KT-INV-2606-03.
 * `count` = how many numbers with this prefix+month already exist.
 */
export function buildDocNumber(
  prefix: "KT" | "KT-INV",
  count: number,
  date: Date = new Date()
): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${prefix}-${yy}${mm}-${String(count + 1).padStart(2, "0")}`;
}

/** Local-time YYYY-MM-DD. Never use toISOString() for calendar dates — UTC+7 shifts the day. */
export function isoLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-06-13" -> "13 Jun 2026"; null-safe. */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
