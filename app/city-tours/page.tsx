import type { Metadata } from "next";
import CityToursContent from "@/components/CityToursContent";

export const metadata: Metadata = {
  title: "Thailand Private City Tours — Pick Your Itinerary",
  description:
    "City tour Bangkok, Pattaya, Ayutthaya, dan destinasi populer Thailand lainnya dengan supir pribadi dan pilihan Altis, SUV, Van, atau Mini Bus. Itinerary fleksibel untuk keluarga, couple, dan grup kecil.",
  keywords:
    "bangkok city tour, pattaya tour, ayutthaya tour, private driver thailand, thailand day tour, city tour builder",
  alternates: { canonical: "/city-tours" },
  openGraph: {
    title: "Thailand Private City Tours — Pick Your Itinerary",
    description:
      "Private city tours across Bangkok, Pattaya, Ayutthaya, and more with flexible itineraries.",
    url: "/city-tours",
    type: "website",
  },
};

export default function CityToursPage() {
  return <CityToursContent />;
}
