"use client";

import { useEffect, useState } from "react";
import DashboardView from "@/components/rental/views/DashboardView";
import VehiclesView from "@/components/rental/views/VehiclesView";
import RentersView from "@/components/rental/views/RentersView";
import RentalsView from "@/components/rental/views/RentalsView";
import PaymentsView from "@/components/rental/views/PaymentsView";
import RentalBottomNav from "@/components/rental/RentalBottomNav";

type Tab = { id: string; label: string; View: React.ComponentType };

const TABS: readonly Tab[] = [
  { id: "dashboard", label: "Dashboard", View: DashboardView },
  { id: "vehicles", label: "Armada", View: VehiclesView },
  { id: "renters", label: "Penyewa", View: RentersView },
  { id: "rentals", label: "Sewa", View: RentalsView },
  { id: "payments", label: "Pembayaran", View: PaymentsView },
];

const STORAGE_KEY = "rental-tab";

export default function RentalPage() {
  const [active, setActive] = useState<string>(TABS[0].id);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount localStorage sync, avoids hydration mismatch
    if (saved && TABS.some((t) => t.id === saved)) setActive(saved);
  }, []);

  function select(id: string) {
    setActive(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const ActiveView = TABS.find((t) => t.id === active)?.View ?? TABS[0].View;

  return (
    <div className="space-y-6">
      <div className="hidden flex-wrap gap-1 border-b border-gray-200 sm:flex">
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

      <RentalBottomNav tabs={TABS} active={active} onSelect={select} />
    </div>
  );
}
