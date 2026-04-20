import type { Metadata } from "next";
import ServicesContent from "@/components/ServicesContent";

export const metadata: Metadata = {
  title: "Layanan — SUV Charter, Airport Transfer & Day Tour",
  description:
    "SUV Charter, Airport Transfer, dan Day Tour di Thailand untuk berbagai kebutuhan perjalanan. Armada premium Toyota Alphard, Vellfire, Fortuner, dan Altis dengan harga transparan.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Layanan — Keliling Thailand",
    description:
      "SUV Charter, Airport Transfer, dan Day Tour di Thailand dengan armada premium.",
    url: "/services",
    type: "website",
  },
};

export default function ServicesPage() {
  return <ServicesContent />;
}
