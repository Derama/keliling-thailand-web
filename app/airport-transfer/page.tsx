import type { Metadata } from "next";
import AirportTransferContent from "@/components/AirportTransferContent";

export const metadata: Metadata = {
  title: "Airport Transfer Bangkok — Suvarnabhumi & Don Mueang",
  description:
    "Layanan antar-jemput bandara premium di Bangkok (Suvarnabhumi BKK, Don Mueang DMK), Khao Yai, dan Hua Hin dengan pilihan Altis, SUV, dan Van. Harga transparan, driver berbahasa Indonesia, Inggris, dan Thai.",
  keywords:
    "airport transfer bangkok, suvarnabhumi transfer, don mueang transfer, airport transfer altis suv van, antar jemput bandara thailand",
  alternates: { canonical: "/airport-transfer" },
  openGraph: {
    title: "Airport Transfer Bangkok — Suvarnabhumi & Don Mueang",
    description:
      "Premium airport transfers across Thailand with Altis, SUV, and Van. Multi-language drivers.",
    url: "/airport-transfer",
    type: "website",
  },
};

export default function AirportTransferPage() {
  return <AirportTransferContent />;
}
