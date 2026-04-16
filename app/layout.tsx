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
  title: "Keliling Thailand — Transportasi Wisata untuk Turis Indonesia",
  description:
    "Layanan transportasi premium di Thailand khusus untuk wisatawan Indonesia. SUV charter, airport transfer, dan day tour tersedia. Hubungi kami via WhatsApp!",
  keywords: "keliling thailand, tour thailand, transportasi thailand, wisata thailand, turis indonesia thailand",
  openGraph: {
    title: "Keliling Thailand",
    description: "Transportasi wisata terpercaya untuk turis Indonesia di Thailand",
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
