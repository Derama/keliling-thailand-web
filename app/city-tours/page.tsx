import type { Metadata } from "next";
import CityToursContent from "@/components/CityToursContent";

export const metadata: Metadata = {
  title: "Bangkok City Tours — Private Alphard Driver",
  description:
    "City tour Bangkok, Pattaya, Ayutthaya, dan destinasi populer Thailand lainnya dengan supir pribadi dan Toyota Alphard. Itinerary fleksibel untuk keluarga, couple, dan grup kecil.",
  keywords:
    "bangkok city tour, pattaya tour, ayutthaya tour, alphard private driver thailand, thailand day tour",
  alternates: { canonical: "/city-tours" },
  openGraph: {
    title: "Bangkok City Tours — Private Alphard Driver",
    description:
      "Private Alphard city tours across Bangkok, Pattaya, and Ayutthaya with flexible itineraries.",
    url: "/city-tours",
    type: "website",
  },
};

export default function CityToursPage() {
  return <CityToursContent />;
}
