"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageContext";
import { Language } from "@/lib/translations";

const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: "id", flag: "🇮🇩", label: "Indonesia" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "th", flag: "🇹🇭", label: "ภาษาไทย" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const langDesktopRef = useRef<HTMLDivElement>(null);
  const langMobileRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const mobileServicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const inDesktop = langDesktopRef.current?.contains(e.target as Node);
      const inMobile = langMobileRef.current?.contains(e.target as Node);
      if (!inDesktop && !inMobile) {
        setLangOpen(false);
      }
      const inDesktopServices = servicesRef.current?.contains(e.target as Node);
      const inMobileServices = mobileServicesRef.current?.contains(e.target as Node);
      if (!inDesktopServices && !inMobileServices) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const serviceDropdownLinks = [
    { href: "/city-tours", label: t.nav.cityTours, icon: "🗺️" },
    { href: "/airport-transfer", label: t.nav.airportTransfer, icon: "✈️" },
    { href: "/services", label: t.nav.dayTour, icon: "🚙" },
    { href: "/location", label: t.nav.location, icon: "📍" },
  ];

  const isServicesActive = ["/city-tours", "/airport-transfer", "/services", "/location"].includes(pathname);

  const currentLang = LANGUAGES.find((l) => l.code === language)!;

  const isHome = pathname === "/";
  const transparent = isHome && !scrolled;
  const navBg = scrolled ? "bg-[#F5C518] shadow-lg" : isHome ? "bg-transparent" : "bg-[#F5C518] shadow-lg";
  const textPrimary = transparent ? "text-white" : "text-[#1B2A4A]";
  const borderSubtle = transparent ? "border-white/40" : "border-[#1B2A4A]/30";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/Logo.png"
              alt="Keliling Thailand"
              width={64}
              height={64}
              className="h-16 w-16 object-contain transition-all duration-300"
              style={transparent ? { filter: "brightness(0) invert(1)" } : {}}
              priority
            />
            <div style={{ fontFamily: "Georgia, serif" }} className={`ml-1 pl-3 border-l-2 ${borderSubtle} flex flex-col leading-none gap-1`}>
              <span className={`${textPrimary} font-bold text-sm tracking-[0.15em]`}>Keliling</span>
              <span className={`${textPrimary} font-bold text-xl tracking-[0.1em] uppercase`}>Thailand</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {/* Home */}
            <Link
              href="/"
              className={`group relative text-sm font-semibold whitespace-nowrap transition-all duration-200 hover:text-black ${textPrimary}`}
            >
              <span className="relative px-2 py-1 rounded-md transition-all duration-200 group-hover:bg-[#F5C518]">
                {t.nav.home}
                <span
                  className={`absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full transition-all duration-300 ${transparent ? "bg-white" : "bg-black"} ${
                    pathname === "/" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </span>
            </Link>

            {/* About */}
            <Link
              href="/about"
              className={`group relative text-sm font-semibold whitespace-nowrap transition-all duration-200 hover:text-black ${
                pathname === "/about" ? "text-black" : textPrimary
              }`}
            >
              <span className="relative px-2 py-1 rounded-md transition-all duration-200 group-hover:bg-[#F5C518]">
                {t.nav.about}
                <span
                  className={`absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full bg-black transition-all duration-300 ${
                    pathname === "/about" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </span>
            </Link>

            {/* Services dropdown */}
            <div ref={servicesRef} className="relative">
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                className={`group flex items-center gap-1 text-sm font-semibold whitespace-nowrap transition-all duration-200 hover:text-black ${
                  isServicesActive ? "text-black" : textPrimary
                }`}
              >
                <span className="relative px-2 py-1 rounded-md transition-all duration-200 flex items-center gap-1 group-hover:bg-[#F5C518]">
                  {t.nav.services}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${servicesOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span
                    className={`absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full bg-black transition-all duration-300 ${
                      isServicesActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </span>
              </button>

              <div
                className={`absolute left-0 top-full mt-3 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden min-w-[210px] transition-all duration-200 origin-top ${
                  servicesOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                }`}
              >
                {serviceDropdownLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setServicesOpen(false)}
                    className={`group/item flex items-center gap-3 px-5 py-3.5 text-sm font-semibold transition-all duration-150 ${
                      pathname === link.href
                        ? "bg-[#F5C518] text-black"
                        : "text-gray-700 hover:bg-[#F5C518] hover:text-black hover:pl-6"
                    }`}
                  >
                    <span className="text-base transition-transform duration-150 group-hover/item:scale-110">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Testimony */}
            <Link
              href="/testimony"
              className={`group relative text-sm font-semibold whitespace-nowrap transition-all duration-200 hover:text-black ${
                pathname === "/testimony" ? "text-black" : textPrimary
              }`}
            >
              <span className="relative px-2 py-1 rounded-md transition-all duration-200 group-hover:bg-[#F5C518]">
                {t.nav.testimony}
                <span
                  className={`absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full bg-black transition-all duration-300 ${
                    pathname === "/testimony" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </span>
            </Link>

            {/* CTA */}
            <Link
              href="/contact"
              className={`group relative px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap overflow-hidden ${
                transparent
                  ? "bg-white text-[#1B2A4A] hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-100"
                  : "bg-[#1B2A4A] text-[#F5C518] hover:bg-[#253d6b] hover:shadow-[0_4px_20px_rgba(27,42,74,0.4)] hover:scale-105 active:scale-100"
              }`}
            >
              {t.nav.reservation}
            </Link>

            {/* Language Switcher */}
            <div ref={langDesktopRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className={`flex items-center gap-1.5 transition-colors text-sm font-semibold rounded-full px-3 py-1.5 ${textPrimary} border ${borderSubtle} hover:opacity-70`}
                aria-label="Switch language"
              >
                <span>{currentLang.flag}</span>
                <span>{currentLang.code.toUpperCase()}</span>
                <svg
                  className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-2 bg-[#F5C518] border border-black/20 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setLangOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-colors ${
                        language === lang.code
                          ? "bg-[#1B2A4A] text-[#F5C518]"
                          : "text-[#1B2A4A] hover:bg-[#1B2A4A]/10"
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Language + Hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <div ref={langMobileRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className={`flex items-center gap-1 text-sm font-semibold rounded-full px-2.5 py-1.5 ${textPrimary} border ${borderSubtle}`}
              >
                <span>{currentLang.flag}</span>
                <span>{currentLang.code.toUpperCase()}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 bg-[#F5C518] border border-black/20 rounded-xl shadow-xl overflow-hidden min-w-[140px] z-50">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setLangOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-colors ${
                        language === lang.code
                          ? "bg-[#1B2A4A] text-[#F5C518]"
                          : "text-[#1B2A4A] hover:bg-[#1B2A4A]/10"
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className={`${textPrimary} p-2`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              <div className="w-6 flex flex-col gap-1.5">
                <span className={`block h-0.5 transition-all duration-300 ${transparent ? "bg-white" : "bg-[#1B2A4A]"} ${isOpen ? "rotate-45 translate-y-2" : ""}`} />
                <span className={`block h-0.5 transition-all duration-300 ${transparent ? "bg-white" : "bg-[#1B2A4A]"} ${isOpen ? "opacity-0" : ""}`} />
                <span className={`block h-0.5 transition-all duration-300 ${transparent ? "bg-white" : "bg-[#1B2A4A]"} ${isOpen ? "-rotate-45 -translate-y-2" : ""}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#F5C518] border-t border-black/20 px-4 py-4 flex flex-col gap-1">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className={`text-sm font-semibold py-3 transition-colors ${pathname === "/" ? "text-[#1B2A4A] underline" : "text-[#1B2A4A]"}`}
          >
            {t.nav.home}
          </Link>
          <Link
            href="/about"
            onClick={() => setIsOpen(false)}
            className={`text-sm font-semibold py-3 transition-colors ${pathname === "/about" ? "text-[#1B2A4A] underline" : "text-[#1B2A4A]"}`}
          >
            {t.nav.about}
          </Link>

          {/* Services expandable on mobile */}
          <div ref={mobileServicesRef}>
            <div className="flex items-center justify-between">
              <Link
                href="/services"
                onClick={() => setIsOpen(false)}
                className={`flex-1 text-sm font-semibold py-3 text-[#1B2A4A] ${isServicesActive ? "underline" : ""}`}
              >
                {t.nav.services}
              </Link>
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                aria-label="Toggle services menu"
                className="p-2 text-[#1B2A4A]"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${servicesOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {servicesOpen && (
              <div className="pl-4 flex flex-col gap-1 pb-1">
                {serviceDropdownLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => { setIsOpen(false); setServicesOpen(false); }}
                    className="flex items-center gap-2 text-sm font-medium py-1.5 text-[#1B2A4A]/80"
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/testimony"
            onClick={() => setIsOpen(false)}
            className={`text-sm font-semibold py-3 transition-colors ${pathname === "/testimony" ? "text-[#1B2A4A] underline" : "text-[#1B2A4A]"}`}
          >
            {t.nav.testimony}
          </Link>
          <Link
            href="/contact"
            onClick={() => setIsOpen(false)}
            className="mt-2 bg-[#1B2A4A] text-[#F5C518] px-4 py-3 rounded-full text-sm font-bold text-center"
          >
            {t.nav.reservation}
          </Link>
        </div>
      </div>
    </nav>
  );
}
