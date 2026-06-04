import type { Metadata } from "next";
import HomeContent from "@/components/HomeContent";

const sharePreviewImage = "/Group 10.png?v=20260420b";

export const metadata: Metadata = {
  title: "Keliling Thailand | Private City Tours, Airport Transfer & Day Trips",
  description:
    "Private city tours across Thailand — pick a city and attractions, then ride in an Altis, SUV, Van, or Mini Bus. Airport transfers, day trips, and intercity routes with fast WhatsApp booking and Indonesian, English, and Thai-speaking support.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Keliling Thailand | Premium Private Transport Across Thailand",
    description:
      "Book private city tours, airport transfers, day trips, and intercity travel in Thailand with fast WhatsApp confirmation.",
    url: "/",
    type: "website",
    siteName: "Keliling Thailand",
    images: [
      {
        url: sharePreviewImage,
        width: 1945,
        height: 958,
        alt: "Keliling Thailand private city tours preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keliling Thailand | Premium Private Transport Across Thailand",
    description:
      "Private city tours, airport transfers, day trips, and intercity transport in Thailand with fast WhatsApp booking.",
    images: [sharePreviewImage],
  },
};

export default function HomePage() {
  return <HomeContent />;
}
