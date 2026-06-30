// Types and static company data for the printable guide job order
// (ใบสั่งงานมัคคุเทศก์). In-memory only — see
// docs/superpowers/specs/2026-06-14-admin-job-order-generator-design.md

export interface JobOrderDay {
  id: string; // crypto.randomUUID()
  date: string; // free text, e.g. "13/06"
  itinerary: string;
  lunch: string;
  dinner: string;
  hotel: string;
}

export interface JobOrderHotel {
  id: string; // crypto.randomUUID()
  city: string; // e.g. "Pattaya", "Ayutthaya", "Khao Yai"
  name: string; // hotel name or "NO"
}

export interface JobOrderData {
  jobOrderNo: string;
  date: string; // header date
  travelAgent: string;
  guideName: string;
  idCard: string;
  carRegister: string;
  phone: string;
  emergencyContact: string;
  licenseNo: string;
  urgentCall: string;
  arrival: string; // Waktu Kedatangan — arrival time in Thailand
  departure: string; // Waktu Kepulangan — departure time from Thailand
  totalPax: string; // free text, e.g. "8 PAX"; also drives blank passenger rows
  showPassengers: boolean; // toggle blank passenger table on the printed doc
  bedType: string;
  hotels: JobOrderHotel[]; // one row per city stayed in
  days: JobOrderDay[];
  /** Library mirror row this order's job order is synced to (document_templates). */
  libraryId?: string | null;
}

/** Licensed entity printed on the job order. Hardcoded — Love Bangkok is the
 *  licensed operator; only the styling follows the Keliling Thailand brand. */
export const LOVE_BANGKOK = {
  name: "Love Bangkok Co., Ltd.",
  emergencyContact: "Love Bangkok.Co.Ltd",
  licenseNo: "11/13151",
  phone: "+6695-451-1582 Mr. Kevin",
  urgentCall: "+6683-827373-9 Love Bangkok Team",
  footerPhone: "+66 83 827 3739",
  email: "corporate@Lovebangkokco-ltd.com",
  address:
    "3/41 Phetchaburi Rd, Khwaeng Thanon Phaya Thai, Khet Ratchathewi, Krung Thep",
  logo: "/lovebangkok/logo.png",
  seal: "/lovebangkok/seal.png",
} as const;

/** Operator fields pre-filled from Love Bangkok, but editable in the builder. */
export const JOB_ORDER_DEFAULTS = {
  emergencyContact: LOVE_BANGKOK.emergencyContact,
  licenseNo: LOVE_BANGKOK.licenseNo,
  phone: LOVE_BANGKOK.phone,
  urgentCall: LOVE_BANGKOK.urgentCall,
} as const;

/** Passenger rows to print for handwriting, parsed from totalPax.
 *  First integer found wins ("8 PAX" -> 8); defaults to 1, clamped to [1, 30]. */
export function passengerRowCount(totalPax: string): number {
  const match = totalPax.match(/\d+/);
  const n = match ? parseInt(match[0], 10) : 1;
  return Math.min(Math.max(n || 1, 1), 30);
}

export function newJobOrderDay(): JobOrderDay {
  return {
    id: crypto.randomUUID(),
    date: "",
    itinerary: "",
    lunch: "",
    dinner: "",
    hotel: "",
  };
}

export function newJobOrderHotel(city = ""): JobOrderHotel {
  return { id: crypto.randomUUID(), city, name: "" };
}

/** DATE helper: tripStart (YYYY-MM-DD) + n days → "DD/MM". Blank if no start. */
function shortDatePlus(tripStartIso: string | null | undefined, n: number): string {
  if (!tripStartIso) return "";
  const d = new Date(`${tripStartIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/**
 * Turn the order's free-text itinerary into job-order day rows. One non-blank
 * line per day; a leading "Hari N:" / "Day N:" / "N." prefix is stripped into
 * the itinerary text, and each date is derived from tripStart + dayIndex.
 * Empty input yields one blank day (preserves the builder's default).
 */
export function daysFromItineraryText(
  text: string | null | undefined,
  tripStartIso: string | null | undefined
): JobOrderDay[] {
  const lines = (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [newJobOrderDay()];
  return lines.map((line, i) => ({
    ...newJobOrderDay(),
    date: shortDatePlus(tripStartIso, i),
    itinerary: line.replace(/^(hari|day)\s*\d+\s*[:.)-]?\s*|^\d+\s*[:.)-]\s*/i, ""),
  }));
}
