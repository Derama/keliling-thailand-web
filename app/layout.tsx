import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageContext";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alphard Experience — Premium Private Transport in Thailand",
  description:
    "Premium private transport in Thailand for Indonesian, Singaporean, Chinese, Middle Eastern, Western, and Thai travelers. Ideal for corporate trips, weddings, birthdays, influencer itineraries, and Bangkok stays.",
  keywords:
    "alphard experience, thailand private transport, bangkok premium chauffeur, thailand airport transfer, wedding transport bangkok, corporate travel thailand",
  openGraph: {
    title: "Alphard Experience",
    description:
      "Premium private transport in Thailand for business, celebrations, and high-comfort travel.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-black">
        <LanguageProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
