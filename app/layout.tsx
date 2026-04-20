import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { LanguageProvider } from "@/components/LanguageContext";

const productionUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  "https://keliling-thailand-web.vercel.app";

const metadataBase = productionUrl.startsWith("http")
  ? new URL(productionUrl)
  : new URL(`https://${productionUrl}`);

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
  },
  openGraph: {
    title: "Alphard Experience — Premium Private Transport in Thailand",
    description:
      "Premium private transport in Thailand for business, celebrations, and high-comfort travel.",
    type: "website",
    url: "/",
    siteName: "Keliling Thailand",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alphard Experience — Premium Private Transport in Thailand",
    description:
      "Premium private transport in Thailand for business, celebrations, and high-comfort travel.",
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
