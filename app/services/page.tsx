import type { Metadata } from "next";
import ServicesContent from "@/components/ServicesContent";

export const metadata: Metadata = {
  title: "Layanan — Keliling Thailand",
  description:
    "SUV Charter, Airport Transfer, dan Day Tour untuk wisatawan Indonesia di Thailand. Armada premium, pengemudi berpengalaman, harga transparan.",
};

export default function ServicesPage() {
  return <ServicesContent />;
}
