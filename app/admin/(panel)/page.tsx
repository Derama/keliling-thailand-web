"use client";

import { useEffect, useState } from "react";
import DashboardView from "@/components/admin/views/DashboardView";
import OrdersView from "@/components/admin/views/OrdersView";
import PriceListView from "@/components/admin/views/PriceListView";
import InvoiceLibraryView from "@/components/admin/views/InvoiceLibraryView";
import ItineraryLibraryView from "@/components/admin/views/ItineraryLibraryView";
import BrochureLibraryView from "@/components/admin/views/BrochureLibraryView";
import PlacesView from "@/components/admin/views/PlacesView";
import JobOrderLibraryView from "@/components/admin/views/JobOrderLibraryView";
import CalendarView from "@/components/admin/views/CalendarView";
import CustomersView from "@/components/admin/views/CustomersView";
import PdfTrimmerView from "@/components/admin/views/PdfTrimmerView";
import {
  BlogView,
} from "@/components/admin/views/marketing/MarketingViews";
import InstagramStudioView from "@/components/admin/views/marketing/InstagramStudioView";
import VideoStudioView from "@/components/admin/views/marketing/VideoStudioView";
import LeadsView from "@/components/admin/views/LeadsView";
import AdminBottomNav from "@/components/admin/AdminBottomNav";

const STORAGE_KEY = "admin-tab";

// Tabs shown directly in the phone bottom bar; the rest go in "Lainnya".
const PRIMARY_IDS: readonly string[] = ["dashboard", "orders", "joborder", "invoice"];

type Tab = {
  id: string;
  label: string;
  View: React.ComponentType;
};

// Single unified admin — operations plus the marketing tools (leads, blog,
// instagram). The separate marketing role/login was removed.
const TABS: readonly Tab[] = [
  { id: "dashboard", label: "Dashboard", View: DashboardView },
  { id: "orders", label: "Order", View: OrdersView },
  { id: "prices", label: "Daftar Harga", View: PriceListView },
  { id: "places", label: "Tempat", View: PlacesView },
  { id: "invoice", label: "Buat Invoice", View: InvoiceLibraryView },
  { id: "itinerary", label: "Itinerary", View: ItineraryLibraryView },
  { id: "brochure", label: "Brosur", View: BrochureLibraryView },
  { id: "joborder", label: "Job Order", View: JobOrderLibraryView },
  { id: "calendar", label: "Kalender", View: CalendarView },
  { id: "customers", label: "Customer", View: CustomersView },
  { id: "pdftrim", label: "PDF Trimmer", View: PdfTrimmerView },
  { id: "leads", label: "Leads", View: LeadsView },
  { id: "blog", label: "Blog & SEO", View: BlogView },
  { id: "instagram", label: "Instagram Studio", View: InstagramStudioView },
  { id: "video", label: "Video Studio", View: VideoStudioView },
];

export default function AdminPage() {
  const [active, setActive] = useState<string>(TABS[0].id);

  // Restore last-opened tab after mount (avoids hydration mismatch).
  // sessionStorage, not localStorage: a reload mid-work keeps the tab, but a
  // fresh visit or login always lands on the Dashboard.
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount storage sync, avoids hydration mismatch
    if (saved && TABS.some((t) => t.id === saved)) setActive(saved);
  }, []);

  function select(id: string) {
    setActive(id);
    sessionStorage.setItem(STORAGE_KEY, id);
  }

  const ActiveView = TABS.find((t) => t.id === active)?.View ?? TABS[0].View;

  return (
    <div className="space-y-6">
      <div className="no-print hidden flex-wrap gap-1 border-b border-gray-200 sm:flex">
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

      <AdminBottomNav
        tabs={TABS}
        active={active}
        onSelect={select}
        primaryIds={PRIMARY_IDS}
      />
    </div>
  );
}
