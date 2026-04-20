import type { Metadata } from "next";
import LocationContent from "@/components/LocationContent";

export const metadata: Metadata = {
  title: "Lokasi Pickup & Service Area di Thailand",
  description:
    "Wilayah layanan Keliling Thailand: Bangkok, Suvarnabhumi (BKK), Don Mueang (DMK), Pattaya, Hua Hin, Phuket, Krabi, dan kota-kota wisata lainnya di Thailand.",
  alternates: { canonical: "/location" },
  openGraph: {
    title: "Lokasi Pickup & Service Area di Thailand",
    description:
      "Service area coverage across Bangkok, Pattaya, Phuket, Krabi, and major Thailand tourist cities.",
    url: "/location",
    type: "website",
  },
};

export default function LocationPage() {
  return <LocationContent />;
}
