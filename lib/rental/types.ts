// Self-drive rental domain types. Mirrors lib/admin/types.ts conventions.
// Admin UI is Indonesian-only.

export type VehicleStatus = "available" | "rented" | "maintenance";
export type RentalStatus = "booked" | "out" | "returned" | "cancelled";
export type HandoverKind = "out" | "in";
export type PaymentKind = "deposit" | "rental" | "refund";
export type FuelLevel = "full" | "3-4" | "1-2" | "1-4" | "empty";

export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  type: string | null;
  daily_rate_thb: number;
  deposit_thb: number;
  status: VehicleStatus;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface Renter {
  id: string;
  name: string;
  phone: string | null;
  license_no: string | null;
  license_photo_path: string | null;
  origin_city: string | null;
  notes: string | null;
  created_at: string;
}

export interface Rental {
  id: string;
  rental_number: string;
  vehicle_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  days: number;
  daily_rate_thb: number;
  deposit_thb: number;
  total_thb: number;
  fx_rate: number;
  status: RentalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Rental joined with vehicle + renter (select("*, vehicles(*), renters(*)")). */
export interface RentalWithRefs extends Rental {
  vehicles: Vehicle;
  renters: Renter;
}

export interface RentalHandover {
  id: string;
  rental_id: string;
  kind: HandoverKind;
  odometer_km: number | null;
  fuel_level: FuelLevel | null;
  oil_level: string | null;
  signature: string | null;
  inspected_at: string;
  notes: string | null;
}

export interface HandoverMedia {
  id: string;
  handover_id: string;
  type: "photo" | "video";
  storage_path: string;
  created_at: string;
}

export interface RentalPayment {
  id: string;
  rental_id: string;
  kind: PaymentKind;
  amount_thb: number;
  paid_at: string;
  method: string | null;
  note: string | null;
}

export const VEHICLE_STATUSES: VehicleStatus[] = [
  "available",
  "rented",
  "maintenance",
];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: "Tersedia",
  rented: "Disewa",
  maintenance: "Servis",
};

export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  available: "bg-green-100 text-green-800",
  rented: "bg-yellow-100 text-yellow-800",
  maintenance: "bg-gray-200 text-gray-700",
};

export const RENTAL_STATUSES: RentalStatus[] = [
  "booked",
  "out",
  "returned",
  "cancelled",
];

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  booked: "Dipesan",
  out: "Keluar",
  returned: "Kembali",
  cancelled: "Batal",
};

export const RENTAL_STATUS_COLORS: Record<RentalStatus, string> = {
  booked: "bg-blue-100 text-blue-800",
  out: "bg-yellow-100 text-yellow-800",
  returned: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const FUEL_LEVELS: FuelLevel[] = ["full", "3-4", "1-2", "1-4", "empty"];

export const FUEL_LEVEL_LABELS: Record<FuelLevel, string> = {
  full: "Penuh",
  "3-4": "3/4",
  "1-2": "1/2",
  "1-4": "1/4",
  empty: "Kosong",
};

export const PAYMENT_KINDS: PaymentKind[] = ["deposit", "rental", "refund"];

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  deposit: "Deposit",
  rental: "Sewa",
  refund: "Refund",
};
