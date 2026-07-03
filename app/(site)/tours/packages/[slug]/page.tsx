import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import PackageDetailContent from "@/components/PackageDetailContent";
import { tourPackages, getPackage, packageTitle } from "@/lib/packages";
import { cityNames, attractionNames, translations } from "@/lib/translations";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return tourPackages.map((p) => ({ slug: p.id }));
}

// Metadata and JSON-LD use the Indonesian copy: it is the server-rendered
// default language, so it matches what crawlers index.
const packagesId = translations.id.packages;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pkg = getPackage(slug);
  if (!pkg) return {};

  const title = packageTitle(pkg);
  const description =
    packagesId.descriptions[pkg.id as keyof typeof packagesId.descriptions];
  const cities = pkg.cityIds.map((id) => cityNames[id].toLowerCase());

  return {
    title: `Paket Tur ${title} — Itinerary Lengkap`,
    description,
    keywords: `paket tur ${cities.join(" ")}, tur ${title.toLowerCase()}, paket wisata thailand ${pkg.days} hari, group trip thailand`,
    alternates: { canonical: `/tours/packages/${pkg.id}` },
    openGraph: {
      title: `Paket Tur ${title}`,
      description,
      url: `/tours/packages/${pkg.id}`,
      type: "website",
      images: [{ url: pkg.image, alt: title }],
    },
  };
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = getPackage(slug);
  if (!pkg) notFound();

  const title = packageTitle(pkg);
  const pageUrl = `${siteUrl}/tours/packages/${pkg.id}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Tur", item: `${siteUrl}/tours` },
      { "@type": "ListItem", position: 3, name: title, item: pageUrl },
    ],
  };

  const tripLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: `Paket Tur ${title}`,
    description:
      packagesId.descriptions[pkg.id as keyof typeof packagesId.descriptions],
    url: pageUrl,
    provider: { "@id": `${siteUrl}/#organization` },
    itinerary: {
      "@type": "ItemList",
      itemListElement: pkg.itinerary.map((day, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `Hari ${i + 1} — ${cityNames[day.cityId]}: ${day.attractionIds
          .map((id) => attractionNames[id])
          .join(", ")}`,
      })),
    },
  };

  return (
    <>
      <JsonLd data={[breadcrumbLd, tripLd]} />
      <PackageDetailContent packageId={slug} />
    </>
  );
}
