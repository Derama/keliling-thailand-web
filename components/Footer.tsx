"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { waLink, WA_NUMBER } from "@/lib/site";

export default function Footer() {
  const { t } = useLanguage();

  const links = [
    { href: "/tours", label: t.nav.tours },
    { href: "/fleet", label: t.nav.fleet },
    { href: "/about", label: t.nav.about },
    { href: "/testimony", label: t.nav.testimony },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <footer className="bg-[#1B2A4A] text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-bold text-lg mb-2">Keliling Thailand</p>
          <p className="text-sm text-white/70">{t.footer.tagline}</p>
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
          <a
            href={waLink(t.home.waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/70 hover:text-[#25D366]"
          >
            WhatsApp +{WA_NUMBER}
          </a>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Keliling Thailand. {t.footer.rights}
      </div>
    </footer>
  );
}
