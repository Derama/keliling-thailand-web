import type { Metadata } from "next";
import ServicesContent from "@/components/ServicesContent";

export const metadata: Metadata = {
  title: "Layanan — Keliling Thailand",
  description:
    "SUV Charter, Airport Transfer, dan Day Tour di Thailand untuk berbagai kebutuhan perjalanan. Armada premium, pengemudi berpengalaman, dan harga transparan.",
};

export default function ServicesPage() {
  return <ServicesContent />;
}
