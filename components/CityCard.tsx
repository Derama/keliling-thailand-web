"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { City, cheapestPrice } from "@/lib/tours";
import { cityNames } from "@/lib/translations";

export default function CityCard({ city }: { city: City }) {
  const { t } = useLanguage();
  const price = cheapestPrice(city.id);

  return (
    <Link
      href={`/tours/${city.id}`}
      className="group rounded-2xl overflow-hidden bg-white shadow hover:shadow-xl transition-shadow"
    >
      <div className="relative h-48">
        <Image
          src={city.image}
          alt={cityNames[city.id]}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[#1B2A4A] text-lg">{cityNames[city.id]}</h3>
        <p className="text-sm text-gray-500">
          {city.durationHours} {t.common.hours} · {city.attractions.length}{" "}
          {t.tours.attractions}
        </p>
        {price != null && (
          <p className="mt-2 text-sm font-bold text-[#1B2A4A]">
            {t.common.from} {price.toLocaleString()} {t.common.thb}
          </p>
        )}
      </div>
    </Link>
  );
}
