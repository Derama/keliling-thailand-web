import type { Metadata } from "next";
import TestimonyContent from "@/components/TestimonyContent";

export const metadata: Metadata = {
  title: "Testimoni Pelanggan — Keliling Thailand",
  description:
    "Cerita dan testimoni klien Indonesia, Singapura, dan mancanegara yang menggunakan layanan city tour privat kami untuk transportasi premium di Thailand.",
  alternates: { canonical: "/testimony" },
  openGraph: {
    title: "Testimoni Pelanggan — Keliling Thailand",
    description:
      "Reviews from Indonesian, Singaporean, and international travelers using our private city tours in Thailand.",
    url: "/testimony",
    type: "website",
  },
};

export default function TestimonyPage() {
  return <TestimonyContent />;
}
