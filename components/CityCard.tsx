"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import { City, cheapestPrice } from "@/lib/tours";
import { cityNames } from "@/lib/translations";
import { fillTemplate } from "@/lib/site";

interface CityCardProps {
  city: City;
  onSelect?: (city: City, trigger: HTMLButtonElement) => void;
  onPlan?: (city: City) => void;
}

export default function CityCard({ city, onSelect, onPlan }: CityCardProps) {
  const { t } = useLanguage();
  const price = cheapestPrice(city.id);
  const name = cityNames[city.id] ?? city.id;

  const content = (
    <>
      <div className="relative h-48">
        <Image
          src={city.image}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[#1B2A4A] text-lg">{name}</h3>
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
    </>
  );

  const className =
    "group block w-full rounded-2xl overflow-hidden bg-white text-left shadow hover:shadow-xl transition-shadow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/70";

  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        onClick={(event) => onSelect(city, event.currentTarget)}
        aria-haspopup="dialog"
      >
        {content}
      </button>
    );
  }

  if (onPlan) {
    return (
      <article className="overflow-hidden rounded-2xl bg-white shadow transition-shadow hover:shadow-xl">
        <Link
          href={`/tours/${city.id}`}
          className="group block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#F5C518]/70"
        >
          {content}
        </Link>
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => onPlan(city)}
            aria-label={fillTemplate(t.packages.dailyPlanAria, { city: name })}
            className="w-full rounded-full bg-[#F5C518] px-4 py-2.5 text-sm font-bold text-[#1B2A4A] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/50"
          >
            {t.packages.dailyPlanButton}
          </button>
        </div>
      </article>
    );
  }

  return (
    <Link href={`/tours/${city.id}`} className={className}>
      {content}
    </Link>
  );
}
