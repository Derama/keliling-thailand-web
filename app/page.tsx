import type { Metadata } from "next";
import HomeContent from "@/components/HomeContent";

const sharePreviewImage = "/preview-black-car.png?v=20260420";

export const metadata: Metadata = {
  title: "Keliling Thailand | Premium Alphard, Airport Transfer & Private Tours",
  description:
    "Private transport in Thailand with Toyota Alphard and premium vehicles for airport transfers, Bangkok city rides, private tours, corporate travel, weddings, and VIP itineraries. Fast WhatsApp booking with Indonesian, English, and Thai-speaking support.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Keliling Thailand | Premium Private Transport Across Thailand",
    description:
      "Book Alphard airport transfers, Bangkok city rides, private tours, corporate transport, and VIP travel in Thailand with fast WhatsApp confirmation.",
    url: "/",
    type: "website",
    siteName: "Keliling Thailand",
    images: [
      {
        url: sharePreviewImage,
        width: 2856,
        height: 1755,
        alt: "Keliling Thailand premium Toyota Alphard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keliling Thailand | Premium Private Transport Across Thailand",
    description:
      "Alphard airport transfers, Bangkok city rides, private tours, and VIP transport in Thailand with fast WhatsApp booking.",
    images: [sharePreviewImage],
  },
};

export default function HomePage() {
  return <HomeContent />;
}
