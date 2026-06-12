export type OrderStatus =
  | "inquiry"
  | "confirmed"
  | "ongoing"
  | "completed"
  | "cancelled";

export type InvoiceType = "deposit" | "balance" | "full";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  origin_city: string | null;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  trip_start: string | null;
  trip_end: string | null;
  pax: number | null;
  pickup_location: string | null;
  vehicle: string | null;
  driver_name: string | null;
  itinerary: string | null;
  price_idr: number;
  cost_thb: number;
  fx_rate: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Order row joined with its customer (select("*, customers(*)")). */
export interface OrderWithCustomer extends Order {
  customers: Customer;
}

export interface Payment {
  id: string;
  order_id: string;
  amount_idr: number;
  paid_at: string;
  method: string | null;
  note: string | null;
}

export interface InvoiceLineItem {
  description: string;
  amount_idr: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  type: InvoiceType;
  amount_idr: number;
  line_items: InvoiceLineItem[];
  issued_at: string;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "inquiry",
  "confirmed",
  "ongoing",
  "completed",
  "cancelled",
];

/** Admin UI is Indonesian-only (see spec). */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  inquiry: "Inquiry",
  confirmed: "Confirmed",
  ongoing: "Jalan",
  completed: "Selesai",
  cancelled: "Batal",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  inquiry: "bg-gray-200 text-gray-700",
  confirmed: "bg-blue-100 text-blue-800",
  ongoing: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const INVOICE_TYPES: InvoiceType[] = ["deposit", "balance", "full"];

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  deposit: "Deposit / DP",
  balance: "Pelunasan",
  full: "Full Payment",
};
