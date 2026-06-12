import type { Metadata, Viewport } from "next";
import "./globals.css";

const productionUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  "https://kelilingthailand.com";

const metadataBase = productionUrl.startsWith("http")
  ? new URL(productionUrl)
  : new URL(`https://${productionUrl}`);

export const metadata: Metadata = {
  metadataBase,
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
  title: {
    default: "Tur Privat Keliling Thailand — Sewa Mobil + Sopir untuk Rombongan",
    template: "%s | Keliling Thailand",
  },
  description:
    "Tur privat di Thailand untuk rombongan Indonesia: sedan, SUV, van, dan mini bus dengan sopir. Harga per kendaraan, itinerary bisa disesuaikan. Bangkok, Pattaya, Ayutthaya, dan lainnya.",
  keywords:
    "tur privat thailand, sewa mobil thailand, sewa van bangkok, private tour thailand, sewa mini bus thailand, airport transfer bangkok",
  alternates: {
    canonical: "/",
    languages: {
      "id-ID": "/",
      "en-US": "/",
      "th-TH": "/",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "Tur Privat Keliling Thailand untuk Rombongan Anda",
    description:
      "Sedan, SUV, van, dan mini bus dengan sopir. Harga per kendaraan, bukan per orang.",
    type: "website",
    url: "/",
    siteName: "Keliling Thailand",
    locale: "id_ID",
    alternateLocale: ["en_US", "th_TH"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tur Privat Keliling Thailand untuk Rombongan Anda",
    description:
      "Sedan, SUV, van, dan mini bus dengan sopir. Harga per kendaraan, bukan per orang.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-black">
        {children}
      </body>
    </html>
  );
}
