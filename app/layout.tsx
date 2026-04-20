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
  "https://keliling-thailand-web.vercel.app";

const metadataBase = productionUrl.startsWith("http")
  ? new URL(productionUrl)
  : new URL(`https://${productionUrl}`);

const siteUrl = metadataBase.toString().replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Alphard Experience — Premium Private Transport in Thailand",
    template: "%s | Keliling Thailand",
  },
  description:
    "Premium private transport in Thailand for Indonesian, Singaporean, Chinese, Middle Eastern, Western, and Thai travelers. Ideal for corporate trips, weddings, birthdays, influencer itineraries, and Bangkok stays.",
  keywords:
    "alphard experience, thailand private transport, bangkok premium chauffeur, thailand airport transfer, wedding transport bangkok, corporate travel thailand",
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
    title: "Alphard Experience — Premium Private Transport in Thailand",
    description:
      "Premium private transport in Thailand for business, celebrations, and high-comfort travel.",
    type: "website",
    url: "/",
    siteName: "Keliling Thailand",
    locale: "id_ID",
    alternateLocale: ["en_US", "th_TH"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alphard Experience — Premium Private Transport in Thailand",
    description:
      "Premium private transport in Thailand for business, celebrations, and high-comfort travel.",
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
  alternateName: "Alphard Experience",
  url: siteUrl,
  logo: `${siteUrl}/newlog.png`,
  image: `${siteUrl}/newlog.png`,
  description:
    "Premium private transport in Thailand with Toyota Alphard, Vellfire, Fortuner, and Altis. Airport transfers, city tours, corporate, and wedding transportation.",
  telephone: "+66-64-764-6597",
  priceRange: "$$",
  areaServed: [
    { "@type": "City", name: "Bangkok" },
    { "@type": "City", name: "Pattaya" },
    { "@type": "City", name: "Phuket" },
    { "@type": "City", name: "Krabi" },
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
  serviceType: "Private chauffeur transportation",
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
          name: "Airport Transfer",
          url: `${siteUrl}/airport-transfer`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "City Tours",
          url: `${siteUrl}/city-tours`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "SUV Charter",
          url: `${siteUrl}/services`,
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
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingWhatsApp />
        </LanguageProvider>
      </body>
    </html>
  );
}
