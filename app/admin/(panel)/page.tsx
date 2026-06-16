"use client";

import { useEffect, useState } from "react";
import DashboardView from "@/components/admin/views/DashboardView";
import OrdersView from "@/components/admin/views/OrdersView";
import PriceListView from "@/components/admin/views/PriceListView";
import InvoiceBuilderView from "@/components/admin/views/InvoiceBuilderView";
import ItineraryBuilderView from "@/components/admin/views/ItineraryBuilderView";
import PlacesView from "@/components/admin/views/PlacesView";
import JobOrderBuilderView from "@/components/admin/views/JobOrderBuilderView";
import CalendarView from "@/components/admin/views/CalendarView";
import CustomersView from "@/components/admin/views/CustomersView";
import {
  BlogView,
  LeadsView,
  InstagramStudioView,
} from "@/components/admin/views/marketing/MarketingViews";
import { useRole } from "@/components/admin/RoleContext";
import AdminBottomNav from "@/components/admin/AdminBottomNav";

// Primary tabs shown directly in the phone bottom bar; the rest go in "Lainnya".
const PRIMARY_TABS: Record<string, readonly string[]> = {
  operation: ["dashboard", "orders", "joborder", "invoice"],
  marketing: ["blog", "leads", "instagram"],
};

type Tab = {
  id: string;
  label: string;
  View: React.ComponentType;
};

const OPERATION_TABS: readonly Tab[] = [
  { id: "dashboard", label: "Dashboard", View: DashboardView },
  { id: "orders", label: "Order", View: OrdersView },
  { id: "prices", label: "Daftar Harga", View: PriceListView },
  { id: "places", label: "Tempat", View: PlacesView },
  { id: "invoice", label: "Buat Invoice", View: InvoiceBuilderView },
  { id: "itinerary", label: "Itinerary", View: ItineraryBuilderView },
  { id: "joborder", label: "Job Order", View: JobOrderBuilderView },
  { id: "calendar", label: "Kalender", View: CalendarView },
  { id: "customers", label: "Customer", View: CustomersView },
];

const MARKETING_TABS: readonly Tab[] = [
  { id: "blog", label: "Blog & SEO", View: BlogView },
  { id: "leads", label: "Leads", View: LeadsView },
  { id: "instagram", label: "Instagram Studio", View: InstagramStudioView },
];

export default function AdminPage() {
  const role = useRole();
  const tabs = role === "marketing" ? MARKETING_TABS : OPERATION_TABS;
  const storageKey = `admin-tab-${role}`;

  const [active, setActive] = useState<string>(tabs[0].id);

  // Restore last-opened tab after mount (avoids hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount localStorage sync, avoids hydration mismatch
    if (saved && tabs.some((t) => t.id === saved)) setActive(saved);
  }, [storageKey, tabs]);

  function select(id: string) {
    setActive(id);
    localStorage.setItem(storageKey, id);
  }

  const ActiveView = tabs.find((t) => t.id === active)?.View ?? tabs[0].View;

  const primaryIds =
    PRIMARY_TABS[role === "marketing" ? "marketing" : "operation"];

  return (
    <div className="space-y-6">
      <div className="hidden flex-wrap gap-1 border-b border-gray-200 sm:flex">
        {tabs.map((t) => (
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

      <AdminBottomNav
        tabs={tabs}
        active={active}
        onSelect={select}
        primaryIds={primaryIds}
      />
    </div>
  );
}
