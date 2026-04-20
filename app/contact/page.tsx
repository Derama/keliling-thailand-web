import type { Metadata } from "next";
import ContactContent from "@/components/ContactContent";

export const metadata: Metadata = {
  title: "Kontak & Konsultasi Gratis — Keliling Thailand",
  description:
    "Hubungi Keliling Thailand via WhatsApp untuk konsultasi gratis soal transportasi premium di Thailand. Respon cepat, harga transparan, tim berbahasa Indonesia, Inggris, dan Thai.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Kontak & Konsultasi Gratis — Keliling Thailand",
    description:
      "Free WhatsApp consultation for premium private transport in Thailand.",
    url: "/contact",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactContent />;
}
