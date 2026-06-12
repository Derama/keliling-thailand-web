import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import TourDetailContent from "@/components/TourDetailContent";
import { cities, getCity, cheapestPrice, availableVehicles } from "@/lib/tours";
import { cityNames, attractionNames, translations } from "@/lib/translations";
import { fillTemplate, siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return cities.map((c) => ({ city: c.id }));
}

// JSON-LD and meta descriptions use the Indonesian copy: it is the
// server-rendered default language, so it matches what crawlers index.
const guideId = translations.id.destinationGuide;

function templateVars(cityId: string) {
  const city = getCity(cityId)!;
  return {
    city: cityNames[cityId],
    minPrice: (cheapestPrice(cityId) ?? 0).toLocaleString(),
    duration: city.durationHours,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const cityData = getCity(city);
  const name = cityNames[city];
  if (!cityData || !name) return {};

  const minPrice = cheapestPrice(city);
  const topAttractions = cityData.attractions
    .slice(0, 3)
    .map((a) => attractionNames[a.id])
    .join(", ");
  const title = `Tur Privat ${name} — Harga & Itinerary`;
  const description = `Tur privat ${name} sehari penuh (${cityData.durationHours} jam): ${topAttractions}, dan lainnya. Mulai ${minPrice?.toLocaleString()} THB per kendaraan dengan sopir — jemput di hotel Anda.`;

  return {
    title,
    description,
    keywords: `tur privat ${name.toLowerCase()}, sewa mobil ${name.toLowerCase()}, day trip ${name.toLowerCase()}, tur ${name.toLowerCase()} dari bangkok, harga tur ${name.toLowerCase()}`,
    alternates: { canonical: `/tours/${city}` },
    openGraph: {
      title,
      description,
      url: `/tours/${city}`,
      type: "website",
      images: [{ url: cityData.image, alt: name }],
    },
  };
}

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const cityData = getCity(city);
  if (!cityData) notFound();

  const name = cityNames[city];
  const vars = templateVars(city);
  const prices = availableVehicles(city)
    .map((v) => cityData.prices[v.id])
    .filter((p): p is number => p != null);
  const pageUrl = `${siteUrl}/tours/${city}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Tur", item: `${siteUrl}/tours` },
      { "@type": "ListItem", position: 3, name, item: pageUrl },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guideId.faqs.map((faq) => ({
      "@type": "Question",
      name: fillTemplate(faq.q, vars),
      acceptedAnswer: {
        "@type": "Answer",
        text: fillTemplate(faq.a, vars),
      },
    })),
  };

  const tripLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: `Tur Privat ${name}`,
    description: guideId.intros[city as keyof typeof guideId.intros]?.[0],
    url: pageUrl,
    provider: { "@id": `${siteUrl}/#organization` },
    itinerary: {
      "@type": "ItemList",
      itemListElement: cityData.attractions.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: attractionNames[a.id],
      })),
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "THB",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
    },
  };

  return (
    <>
      <JsonLd data={[breadcrumbLd, faqLd, tripLd]} />
      <TourDetailContent cityId={city} />
    </>
  );
}
