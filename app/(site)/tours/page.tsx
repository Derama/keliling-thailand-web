import type { Metadata } from "next";
import ToursContent from "@/components/ToursContent";

export const metadata: Metadata = {
  title: "Tur Privat per Kota",
  description:
    "Tur privat sehari penuh di Bangkok, Pattaya, Ayutthaya, Kanchanaburi, Hua Hin, dan Khao Yai. Satu kendaraan khusus untuk rombongan Anda, harga per mobil.",
};

export default function ToursPage() {
  return <ToursContent />;
}
