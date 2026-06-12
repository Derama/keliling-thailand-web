import type { Metadata } from "next";
import FleetContent from "@/components/FleetContent";

export const metadata: Metadata = {
  title: "Armada & Harga",
  description:
    "Sedan, SUV, van, dan mini bus dengan sopir untuk 1–20 penumpang. Harga per kendaraan per hari termasuk sopir, BBM, tol, dan parkir. Airport transfer tersedia.",
};

export default function FleetPage() {
  return <FleetContent />;
}
