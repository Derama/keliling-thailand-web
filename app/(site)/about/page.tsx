import type { Metadata } from "next";
import AboutContent from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Keliling Thailand adalah layanan tour private yang dioperasikan oleh Love Bangkok Co., Ltd., perusahaan pariwisata Thailand berlisensi.",
};

export default function AboutPage() {
  return <AboutContent />;
}
