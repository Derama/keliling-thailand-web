import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Keliling Thailand — layanan tur privat untuk wisatawan Indonesia di Thailand. Kendaraan dengan sopir untuk tur kota, day trip, dan airport transfer.",
};

export default function AboutPage() {
  return <AboutContent />;
}
