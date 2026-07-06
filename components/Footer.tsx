"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import {
  CONTACT_WHATSAPP,
  OPERATOR_DETAILS,
  SOCIAL_LINKS,
  waLinkTo,
} from "@/lib/site";

export default function Footer() {
  const { t } = useLanguage();

  const links = [
    { href: "/tours", label: t.nav.tours },
    { href: "/fleet", label: t.nav.fleet },
    { href: "/about", label: t.nav.about },
    { href: "/testimony", label: t.nav.testimony },
    { href: "/blog", label: t.nav.blog },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <footer className="bg-[#1B2A4A] text-white mt-auto">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.7fr_1fr_0.8fr]">
        <div>
          <p className="font-bold text-lg mb-2">Keliling Thailand</p>
          <p className="text-sm text-white/70">{t.footer.tagline}</p>
          <div className="mt-5 text-sm">
            <p className="text-white/50">{t.footer.operatedBy}</p>
            <p className="mt-1 font-bold">{OPERATOR_DETAILS.name}</p>
            <p className="mt-1 text-xs text-white/55">{t.footer.licenseShort}</p>
            <p className="mt-2 max-w-xs text-xs leading-5 text-white/55">
              {OPERATOR_DETAILS.address}
            </p>
          </div>
        </div>
        <div>
          <p className="font-bold mb-3">{t.footer.linksTitle}</p>
          <ul className="space-y-2 text-sm text-white/70">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-[#F5C518]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-bold mb-3">{t.footer.contactTitle}</p>
          <ul className="space-y-3 text-sm">
            {CONTACT_WHATSAPP.map((contact) => (
              <li key={contact.number}>
                <a
                  href={waLinkTo(contact.number, t.contact.waMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <span className="block font-semibold text-white/85 group-hover:text-[#25D366]">
                    {contact.name}
                  </span>
                  <span className="text-white/55">+{contact.number}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-bold mb-3">{t.footer.socialTitle}</p>
          <div className="flex flex-col gap-3 text-sm text-white/70">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F5C518]"
            >
              Instagram · @kelilingthailand
            </a>
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F5C518]"
            >
              Facebook · Keliling Thailand
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Keliling Thailand. {t.footer.rights}{" "}
        <span className="mx-1">·</span>
        <Link href="/admin" className="hover:text-[#F5C518]">
          {t.footer.admin}
        </Link>
        <span className="mx-1">·</span>
        <Link href="/rental" className="hover:text-[#F5C518]">
          {t.footer.rental}
        </Link>
      </div>
    </footer>
  );
}
