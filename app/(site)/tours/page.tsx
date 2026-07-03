import type { Metadata } from "next";
import ToursContent from "@/components/ToursContent";

export const metadata: Metadata = {
  title: "Tur Privat & Paket Wisata",
  description:
    "Paket tur multi-hari (Bangkok Pattaya 4D3N, Khao Yai, Kanchanaburi, Hua Hin) dan tur privat harian per kota. Satu kendaraan khusus untuk rombongan Anda.",
};

export default function ToursPage() {
  return <ToursContent />;
}
