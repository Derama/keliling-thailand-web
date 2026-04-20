import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "Tentang Kami — Keliling Thailand",
  description:
    "Kenali tim Keliling Thailand: pengemudi profesional berbahasa Indonesia, Inggris, dan Thai, serta armada Toyota Alphard, Vellfire, Fortuner, dan Altis untuk perjalanan premium di Bangkok, Pattaya, Phuket, dan Krabi.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Tentang Kami — Keliling Thailand",
    description:
      "Tim pengemudi profesional dan armada premium untuk perjalanan bisnis maupun liburan di Thailand.",
    url: "/about",
    type: "website",
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
