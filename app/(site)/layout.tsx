import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import JsonLd from "@/components/JsonLd";
import { LanguageProvider } from "@/components/LanguageContext";
import { PlanBuilderProvider } from "@/components/PlanBuilderContext";
import {
  CONTACT_WHATSAPP,
  OPERATOR_DETAILS,
  SOCIAL_LINKS,
  siteUrl,
} from "@/lib/site";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${siteUrl}/#organization`,
  name: "Keliling Thailand",
  alternateName: "Keliling Thailand Tours",
  legalName: OPERATOR_DETAILS.name,
  url: siteUrl,
  logo: `${siteUrl}/newlog.png`,
  image: `${siteUrl}/newlog.png`,
  description:
    "Private group tours in Thailand with sedan, SUV, van, and mini bus. Whole-vehicle bookings with driver for city tours, day trips, and airport transfers.",
  telephone: CONTACT_WHATSAPP.map((contact) => `+${contact.number}`),
  sameAs: [SOCIAL_LINKS.instagram, SOCIAL_LINKS.facebook],
  identifier: [
    {
      "@type": "PropertyValue",
      name: "Tourism License",
      value: OPERATOR_DETAILS.tourismLicense,
    },
    {
      "@type": "PropertyValue",
      name: "Company Registration",
      value: OPERATOR_DETAILS.companyRegistration,
    },
  ],
  priceRange: "$$",
  areaServed: [
    { "@type": "City", name: "Bangkok" },
    { "@type": "City", name: "Pattaya" },
    { "@type": "City", name: "Ayutthaya" },
    { "@type": "City", name: "Kanchanaburi" },
    { "@type": "City", name: "Hua Hin" },
    { "@type": "City", name: "Khao Yai" },
    { "@type": "Country", name: "Thailand" },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "49/21 Moo 10, Nong Prue",
    addressLocality: "Bang Lamung",
    addressRegion: "Chon Buri",
    postalCode: "20150",
    addressCountry: "TH",
  },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: siteUrl,
  name: "Keliling Thailand",
  inLanguage: ["id-ID", "en-US", "th-TH"],
  publisher: { "@id": `${siteUrl}/#organization` },
};

const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Private group tours and vehicle charter with driver",
  provider: { "@id": `${siteUrl}/#organization` },
  areaServed: { "@type": "Country", name: "Thailand" },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Keliling Thailand services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Private City Tours",
          url: `${siteUrl}/tours`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Vehicle Charter (Sedan, SUV, Van, Mini Bus)",
          url: `${siteUrl}/fleet`,
        },
      },
    ],
  },
};

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <JsonLd data={[organizationLd, websiteLd, serviceLd]} />
      <LanguageProvider>
        <PlanBuilderProvider>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
          <FloatingWhatsApp />
        </PlanBuilderProvider>
      </LanguageProvider>
    </>
  );
}
