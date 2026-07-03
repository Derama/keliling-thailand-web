"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";
import {
  TourPackage,
  packageTitle,
  cheapestPackagePrice,
} from "@/lib/packages";
import { cityNames } from "@/lib/translations";
import { fillTemplate } from "@/lib/site";

interface PackageCardProps {
  pkg: TourPackage;
  onSelect?: (pkg: TourPackage, trigger: HTMLButtonElement) => void;
}

export default function PackageCard({ pkg, onSelect }: PackageCardProps) {
  const { t } = useLanguage();
  const title = packageTitle(pkg);
  const price = cheapestPackagePrice(pkg);
  const tagline = t.packages.taglines[pkg.id as keyof typeof t.packages.taglines];

  const content = (
    <>
      <div className="relative h-48">
        <Image
          src={pkg.image}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <span className="absolute top-3 left-3 bg-[#1B2A4A]/90 text-white text-xs font-bold px-3 py-1 rounded-full">
          {pkg.days}D{pkg.nights}N
        </span>
        {pkg.badge && (
          <span className="absolute top-3 right-3 bg-[#F5C518] text-[#1B2A4A] text-xs font-bold px-3 py-1 rounded-full">
            {t.packages.badges[pkg.badge]}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-bold text-[#1B2A4A] text-lg leading-snug">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {pkg.cityIds.map((id) => cityNames[id]).join(" · ")}
        </p>
        <p className="text-sm text-gray-600 mt-2 flex-1">{tagline}</p>
        {price != null ? (
          <p className="mt-3 text-sm font-bold text-[#1B2A4A]">
            {t.common.from} {price.toLocaleString()} {t.common.thb}
          </p>
        ) : (
          <p className="mt-3 text-xs text-gray-400">
            {fillTemplate(t.packages.citiesCount, { count: pkg.cityIds.length })} ·{" "}
            {fillTemplate(t.packages.durationLong, {
              days: pkg.days,
              nights: pkg.nights,
            })}
          </p>
        )}
        <span className="mt-2 text-sm font-semibold text-[#1B2A4A] group-hover:text-[#B8930A] transition-colors">
          {t.packages.viewDetail} →
        </span>
      </div>
    </>
  );

  const className =
    "group flex flex-col text-left rounded-2xl overflow-hidden bg-white shadow hover:shadow-xl transition-shadow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5C518]/70";

  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        onClick={(event) => onSelect(pkg, event.currentTarget)}
        aria-haspopup="dialog"
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={`/tours/packages/${pkg.id}`} className={className}>
      {content}
    </Link>
  );
}
