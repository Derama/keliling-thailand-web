"use client";

import { useLanguage } from "@/components/LanguageContext";
import {
  CONTACT_WHATSAPP,
  OPERATOR_DETAILS,
  SOCIAL_LINKS,
  waLinkTo,
} from "@/lib/site";

export default function ContactContent() {
  const { t } = useLanguage();

  const infoCards = [
    { title: t.contact.locationTitle, desc: t.contact.locationDesc },
    { title: t.contact.hoursTitle, desc: t.contact.hoursDesc },
  ];

  return (
    <main className="pt-24 pb-16 max-w-4xl mx-auto px-4">
      <h1 className="text-4xl font-extrabold text-[#1B2A4A]">{t.contact.title}</h1>
      <p className="text-gray-600 mt-2">{t.contact.subtitle}</p>

      <section className="mt-10" aria-labelledby="whatsapp-contacts">
        <div className="text-center">
          <h2
            id="whatsapp-contacts"
            className="text-2xl font-extrabold text-[#1B2A4A]"
          >
            {t.contact.waTitle}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{t.contact.waDesc}</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {CONTACT_WHATSAPP.map((contact) => (
            <a
              key={contact.number}
              href={waLinkTo(contact.number, t.contact.waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#25D366]/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/20"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#25D366] text-white">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12.04 2a9.84 9.84 0 0 0-8.4 14.96L2 22l5.18-1.61A9.97 9.97 0 1 0 12.04 2Zm0 17.95a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.07.96 1-2.99-.2-.31a8.05 8.05 0 1 1 6.7 3.65Zm4.44-6.03c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.25 7.25 0 0 1-1.34-1.66c-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-[#1B2A4A]">
                  {contact.name}
                </span>
                <span className="mt-1 block text-sm font-semibold text-gray-600 group-hover:text-[#1EAF54]">
                  +{contact.number}
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="social-contacts">
        <div className="text-center">
          <h2
            id="social-contacts"
            className="text-2xl font-extrabold text-[#1B2A4A]"
          >
            {t.contact.socialTitle}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{t.contact.socialDesc}</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <a
            href={SOCIAL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#C13584]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#C13584]/15"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#C13584] text-white">
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span>
              <span className="block font-bold text-[#1B2A4A]">
                {t.contact.instagramLabel}
              </span>
              <span className="mt-1 block text-sm font-semibold text-gray-600 group-hover:text-[#C13584]">
                @kelilingthailand
              </span>
            </span>
          </a>

          <a
            href={SOCIAL_LINKS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#1877F2]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1877F2]/15"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#1877F2] text-white">
              <svg
                aria-hidden="true"
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M13.6 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.4v3h2.8v8h3.4Z" />
              </svg>
            </span>
            <span>
              <span className="block font-bold text-[#1B2A4A]">
                {t.contact.facebookLabel}
              </span>
              <span className="mt-1 block text-sm font-semibold text-gray-600 group-hover:text-[#1877F2]">
                Keliling Thailand
              </span>
            </span>
          </a>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {infoCards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-gray-200 p-5 text-center"
          >
            <h2 className="font-bold text-[#1B2A4A]">{card.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{card.desc}</p>
          </div>
        ))}
      </div>

      <section
        className="mt-10 rounded-2xl bg-[#1B2A4A] p-6 text-[#FEF9EC] sm:p-8"
        aria-labelledby="operator-details"
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F5C518]">
          {t.contact.operatorTitle}
        </p>
        <h2 id="operator-details" className="mt-2 text-2xl font-extrabold">
          {OPERATOR_DETAILS.name}
        </h2>

        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#FEF9EC]/55">
              {t.contact.tourismLicenseLabel}
            </dt>
            <dd className="mt-1 font-semibold">
              {OPERATOR_DETAILS.tourismLicense}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#FEF9EC]/55">
              {t.contact.companyRegistrationLabel}
            </dt>
            <dd className="mt-1 font-semibold">
              {OPERATOR_DETAILS.companyRegistration}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#FEF9EC]/55">
              {t.contact.operatorAddressLabel}
            </dt>
            <dd className="mt-1 max-w-2xl leading-6">
              {OPERATOR_DETAILS.address}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
