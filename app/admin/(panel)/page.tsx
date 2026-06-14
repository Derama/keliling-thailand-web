"use client";

import { useEffect, useState } from "react";
import DashboardView from "@/components/admin/views/DashboardView";
import OrdersView from "@/components/admin/views/OrdersView";
import PriceListView from "@/components/admin/views/PriceListView";
import InvoiceBuilderView from "@/components/admin/views/InvoiceBuilderView";
import ItineraryBuilderView from "@/components/admin/views/ItineraryBuilderView";
import CalendarView from "@/components/admin/views/CalendarView";
import CustomersView from "@/components/admin/views/CustomersView";

const TABS = [
  { id: "dashboard", label: "Dashboard", View: DashboardView },
  { id: "orders", label: "Order", View: OrdersView },
  { id: "prices", label: "Daftar Harga", View: PriceListView },
  { id: "invoice", label: "Buat Invoice", View: InvoiceBuilderView },
  { id: "itinerary", label: "Itinerary", View: ItineraryBuilderView },
  { id: "calendar", label: "Kalender", View: CalendarView },
  { id: "customers", label: "Customer", View: CustomersView },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STORAGE_KEY = "admin-tab";

export default function AdminPage() {
  const [active, setActive] = useState<TabId>("dashboard");

  // Restore last-opened tab after mount (avoids hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as TabId | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount localStorage sync, avoids hydration mismatch
    if (saved && TABS.some((t) => t.id === saved)) setActive(saved);
  }, []);

  function select(id: TabId) {
    setActive(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const ActiveView =
    TABS.find((t) => t.id === active)?.View ?? DashboardView;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            className={`-mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              active === t.id
                ? "border-b-2 border-[#F5C518] text-[#1B2A4A]"
                : "text-gray-500 hover:text-[#1B2A4A]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ActiveView />
    </div>
  );
}
