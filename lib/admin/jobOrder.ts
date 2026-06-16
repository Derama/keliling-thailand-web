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

export interface JobOrderData {
  jobOrderNo: string;
  date: string; // header date
  travelAgent: string;
  totalPax: string; // free text, e.g. "8 PAX"; also drives blank passenger rows
  bedType: string;
  hotelPattaya: string;
  hotelBangkok: string;
  days: JobOrderDay[];
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
