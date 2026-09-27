import type { Metadata } from "next";
import ToursContent from "@/components/ToursContent";

export const metadata: Metadata = {
  title: "Tour Private & Paket Wisata",
  description:
    "Paket tour multi-hari (Bangkok Pattaya 4D3N, Khao Yai, Kanchanaburi, Hua Hin) dan tour private harian per kota. Satu kendaraan khusus untuk rombongan Anda.",
};

export default function ToursPage() {
  return <ToursContent />;
}
