import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TourDetailContent from "@/components/TourDetailContent";
import { cities, getCity } from "@/lib/tours";
import { cityNames } from "@/lib/translations";

export function generateStaticParams() {
  return cities.map((c) => ({ city: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const name = cityNames[city];
  if (!name) return {};
  return {
    title: `Tur Privat ${name}`,
    description: `Tur privat ${name} sehari penuh dengan kendaraan dan sopir pribadi. Harga per mobil untuk rombongan Anda — sedan, SUV, van, atau mini bus.`,
  };
}

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  if (!getCity(city)) notFound();
  return <TourDetailContent cityId={city} />;
}
