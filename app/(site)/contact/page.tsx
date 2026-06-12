import type { Metadata } from "next";
import ContactContent from "@/components/ContactContent";

export const metadata: Metadata = {
  title: "Kontak",
  description:
    "Hubungi Keliling Thailand via WhatsApp untuk tur privat, sewa kendaraan dengan sopir, dan airport transfer di Thailand.",
};

export default function ContactPage() {
  return <ContactContent />;
}
