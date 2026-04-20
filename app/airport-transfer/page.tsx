import type { Metadata } from "next";
import AirportTransferContent from "@/components/AirportTransferContent";

export const metadata: Metadata = {
  title: "Airport Transfer Bangkok — Suvarnabhumi & Don Mueang",
  description:
    "Layanan antar-jemput bandara premium di Bangkok (Suvarnabhumi BKK, Don Mueang DMK), Phuket, dan Krabi dengan Toyota Alphard & Vellfire. Harga transparan, driver berbahasa Indonesia, Inggris, dan Thai.",
  keywords:
    "airport transfer bangkok, suvarnabhumi transfer, don mueang transfer, alphard bangkok airport, antar jemput bandara thailand",
  alternates: { canonical: "/airport-transfer" },
  openGraph: {
    title: "Airport Transfer Bangkok — Suvarnabhumi & Don Mueang",
    description:
      "Premium airport transfers across Thailand with Toyota Alphard & Vellfire. Multi-language drivers.",
    url: "/airport-transfer",
    type: "website",
  },
};

export default function AirportTransferPage() {
  return <AirportTransferContent />;
}
