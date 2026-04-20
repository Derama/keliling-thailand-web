import type { Metadata } from "next";
import HomeContent from "@/components/HomeContent";

export const metadata: Metadata = {
  title: "Alphard Experience — Premium Private Transport in Thailand",
  description:
    "Premium Toyota Alphard & Vellfire private transport across Thailand — airport transfers, Bangkok city tours, corporate, wedding and influencer bookings with Indonesian, English, and Thai-speaking drivers.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Alphard Experience — Premium Private Transport in Thailand",
    description:
      "Premium Alphard & Vellfire private transport across Thailand, with drivers who speak Indonesian, English, and Thai.",
    url: "/",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeContent />;
}
