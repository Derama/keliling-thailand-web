"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";

export default function Footer() {
  const { language } = useLanguage();
  const footerCopy = {
    id: {
      description:
        "Solusi transportasi terpercaya untuk semua wisatawan di Thailand. Nyaman, aman, dan berkesan.",
      nav: "Navigasi",
      services: "Layanan Kami",
      book: "Pesan Sekarang",
      contact: "Hubungi Kami",
    },
    en: {
      description:
        "Trusted transport solutions for all travellers in Thailand. Comfortable, safe, and memorable.",
      nav: "Navigation",
      services: "Our Services",
      book: "Book Now",
      contact: "Contact Us",
    },
    th: {
      description:
        "โซลูชันการเดินทางที่ไว้วางใจได้สำหรับนักท่องเที่ยวทุกคนในประเทศไทย สะดวกสบาย ปลอดภัย และน่าประทับใจ",
      nav: "เมนู",
      services: "บริการของเรา",
      book: "จองตอนนี้",
      contact: "ติดต่อเรา",
    },
  }[language];

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="flex flex-col items-center gap-4 text-center">
            <Image
              src="/Full logo.png"
              alt="Keliling Thailand"
              width={480}
              height={144}
              className="h-16 md:h-28 w-auto object-contain"
            />
            <p className="text-white text-sm leading-relaxed max-w-xs text-center">
              {footerCopy.description}
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-4">
              {footerCopy.nav}
            </h3>
            <ul className="space-y-2 text-sm text-white">
              <li>
                <Link href="/" className="hover:text-[#F5C518] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-[#F5C518] transition-colors">
                  {footerCopy.services}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#F5C518] transition-colors">
                  {footerCopy.book}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="text-center md:text-left">
            <h3 className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-4">
              {footerCopy.contact}
            </h3>
            <ul className="space-y-2 text-sm text-white">
              <li className="flex items-center justify-center md:justify-start gap-2">
                <span>📱</span>
                <a href="https://wa.me/6285750923934" className="hover:text-[#F5C518] transition-colors">
                  WhatsApp
                </a>
              </li>
              <li className="flex items-center justify-center md:justify-start gap-2">
                <span>📸</span>
                <a
                  href="https://instagram.com/kelilingthailand"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F5C518] transition-colors"
                >
                  @kelilingthailand
                </a>
              </li>
              <li className="flex items-center justify-center md:justify-start gap-2">
                <span>📍</span>
                <span>Bangkok, Thailand</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-xs text-white">
          © {new Date().getFullYear()} Keliling Thailand. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
