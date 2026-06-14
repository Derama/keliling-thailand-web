// Shared types/constants for the standalone invoice builder (THB, not persisted).

export type InvoiceMode = "customer" | "operator";

/** Extra margin (THB) added per line on the tour-operator invoice. */
export const OPERATOR_MARGIN = 100;

export interface InvoiceLine {
  id: string;
  desc: string;
  capital: number;
  sell: number;
}
