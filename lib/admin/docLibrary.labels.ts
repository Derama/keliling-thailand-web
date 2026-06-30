// lib/admin/docLibrary.labels.ts

/** Minimal row shape shared by library itineraries and document templates. */
export interface LibraryLike {
  id: string;
  title: string;
  // Accepts any saved draft shape (itinerary Draft, JobOrderData, InvoiceDraft);
  // narrowed to a record internally.
  data: unknown;
  updated_at: string;
  order_number?: string | null;
}

/** A formatted row for TemplatePickerModal. */
export interface PickerRowData {
  id: string;
  label: string;
  sub: string;
}

function savedAt(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Build a picker label + sub from a saved row. Title wins; otherwise we fall
 * back to whichever recognizable fields the draft carries (itinerary trip/
 * customer, or invoice number/billTo). The sub line shows day count (if any),
 * the originating order number, and when it was last saved.
 */
export function pickerRow(row: LibraryLike): PickerRowData {
  const d = (row.data ?? {}) as Record<string, unknown>;
  const title = (row.title ?? "").trim();

  let label = title;
  if (!label) {
    const parts = [
      d.tripTitle as string,
      d.invoiceNumber as string,
      d.customer as string,
      d.billTo as string,
    ].filter((s) => typeof s === "string" && s.trim());
    label = parts.join(" · ");
  }
  if (!label) label = "Tanpa judul";

  const subBits: string[] = [];
  const days = d.days;
  if (Array.isArray(days) && days.length) subBits.push(`${days.length} hari`);
  if (row.order_number) subBits.push(`order ${row.order_number}`);
  const when = savedAt(row.updated_at);
  if (when) subBits.push(`disimpan ${when}`);

  return { id: row.id, label, sub: subBits.join(" · ") };
}
