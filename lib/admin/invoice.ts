// Shared types/constants/helpers for the standalone invoice builder (THB, not persisted).

export type InvoiceMode = "customer" | "operator" | "personal";

/** Operator + personal share the Base/Margin layout; only customer differs. */
export function isOperatorMode(mode: InvoiceMode): boolean {
  return mode !== "customer";
}

export type InvoiceStatus = "awaiting" | "paid";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  awaiting: "AWAITING PAYMENT",
  paid: "PAID",
};

/** Default per-unit margin (THB) suggested on operator invoice lines. */
export const OPERATOR_MARGIN = 100;

export interface InvoiceLine {
  id: string;
  desc: string;
  /** Number of units (nights, cars, tickets…). */
  qty: number;
  /** Per-unit capital (cost / base price). */
  capital: number;
  /** Per-unit selling price (customer invoice). */
  sell: number;
  /** Per-unit margin added on the operator invoice (Base + Margin). */
  margin: number;
  /** Optional vehicle/category tag shown in the "Service Type" column. */
  serviceType?: string;
  /** Optional unit hint shown next to qty (e.g. "malam", "jam"). */
  unit?: string;
}

/** Customer line total: sell × qty. */
export function lineCustomerTotal(l: InvoiceLine): number {
  return l.sell * l.qty;
}

/** Operator line total: (capital + margin) × qty. */
export function lineOperatorTotal(l: InvoiceLine): number {
  return (l.capital + l.margin) * l.qty;
}

/** Profit for the active mode. */
export function lineProfit(l: InvoiceLine, mode: InvoiceMode): number {
  return mode === "customer" ? (l.sell - l.capital) * l.qty : l.margin * l.qty;
}

export interface InvoiceTotals {
  customerTotal: number;
  capitalTotal: number;
  marginTotal: number;
  operatorTotal: number;
  customerProfit: number;
}

export function invoiceTotals(lines: InvoiceLine[]): InvoiceTotals {
  const customerTotal = lines.reduce((s, l) => s + lineCustomerTotal(l), 0);
  const capitalTotal = lines.reduce((s, l) => s + l.capital * l.qty, 0);
  const marginTotal = lines.reduce((s, l) => s + l.margin * l.qty, 0);
  return {
    customerTotal,
    capitalTotal,
    marginTotal,
    operatorTotal: capitalTotal + marginTotal,
    customerProfit: customerTotal - capitalTotal,
  };
}

/** Grand total shown to the billed party for the active mode. */
export function grandTotal(totals: InvoiceTotals, mode: InvoiceMode): number {
  return mode === "customer" ? totals.customerTotal : totals.operatorTotal;
}
