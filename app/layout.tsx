import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import JsonLd from "@/components/JsonLd";
import { LanguageProvider } from "@/components/LanguageContext";

const productionUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  "https://kelilingthailand.com";

const metadataBase = productionUrl.startsWith("http")
  ? new URL(productionUrl)
  : new URL(`https://${productionUrl}`);

const siteUrl = metadataBase.toString().replace(/\/$/, "");

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

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${siteUrl}/#organization`,
  name: "Keliling Thailand",
  alternateName: "Keliling Thailand Tours",
  url: siteUrl,
  logo: `${siteUrl}/newlog.png`,
  image: `${siteUrl}/newlog.png`,
  description:
    "Private group tours in Thailand with sedan, SUV, van, and mini bus. Whole-vehicle bookings with driver for city tours, day trips, and airport transfers.",
  telephone: "+62-857-5092-3934",
  priceRange: "$$",
  areaServed: [
    { "@type": "City", name: "Bangkok" },
    { "@type": "City", name: "Pattaya" },
    { "@type": "City", name: "Ayutthaya" },
    { "@type": "City", name: "Kanchanaburi" },
    { "@type": "City", name: "Hua Hin" },
    { "@type": "City", name: "Khao Yai" },
    { "@type": "Country", name: "Thailand" },
  ],
  address: {
    "@type": "PostalAddress",
    addressCountry: "TH",
    addressLocality: "Bangkok",
  },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: siteUrl,
  name: "Keliling Thailand",
  inLanguage: ["id-ID", "en-US", "th-TH"],
  publisher: { "@id": `${siteUrl}/#organization` },
};

const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Private group tours and vehicle charter with driver",
  provider: { "@id": `${siteUrl}/#organization` },
  areaServed: { "@type": "Country", name: "Thailand" },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Keliling Thailand services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Private City Tours",
          url: `${siteUrl}/tours`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Vehicle Charter (Sedan, SUV, Van, Mini Bus)",
          url: `${siteUrl}/fleet`,
        },
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-black">
        <JsonLd data={[organizationLd, websiteLd, serviceLd]} />
        <LanguageProvider>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
          <FloatingWhatsApp />
        </LanguageProvider>
      </body>
    </html>
  );
}
