import type { Order } from "./types";

// Deterministic grouping (server === client) — avoids Intl hydration mismatches.
function group(n: number, sep: string): string {
  const neg = n < 0;
  const digits = String(Math.round(Math.abs(n)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return neg ? `-${grouped}` : grouped;
}

export function formatIDR(n: number): string {
  return `Rp ${group(n, ".")}`;
}

export function formatTHB(n: number): string {
  return `฿${group(n, ",")}`;
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

// Document numbers (KT-YYMM-NN / KT-INV-YYMM-NN) are now assigned atomically by
// Postgres BEFORE INSERT triggers — see scripts/migrations/007-doc-numbering.sql.
// The old client-side buildDocNumber() was removed to avoid format drift.

/** Local-time YYYY-MM-DD. Never use toISOString() for calendar dates — UTC+7 shifts the day. */
export function isoLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Date + time stamp for "Printed …" footers, e.g. "21 Jun 2026, 14:30". */
export function formatPrintedAt(d: Date = new Date()): string {
  const date = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
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
