import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Image
              src="/Full logo.png"
              alt="Keliling Thailand"
              width={480}
              height={144}
              className="h-20 md:h-36 w-auto object-contain flex-shrink-0"
            />
            <p className="text-white text-base leading-relaxed">
              Solusi transportasi terpercaya untuk wisatawan Indonesia di Thailand.
              Nyaman, aman, dan berkesan.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-4">
              Navigasi
            </h3>
            <ul className="space-y-2 text-sm text-white">
              <li>
                <Link href="/" className="hover:text-[#F5C518] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-[#F5C518] transition-colors">
                  Layanan Kami
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#F5C518] transition-colors">
                  Pesan Sekarang
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[#F5C518] font-bold text-sm uppercase tracking-widest mb-4">
              Hubungi Kami
            </h3>
            <ul className="space-y-2 text-sm text-white">
              <li className="flex items-center gap-2">
                <span>📱</span>
                <a
                  href="https://wa.me/66647646597"
                  className="hover:text-[#F5C518] transition-colors"
                >
                  WhatsApp
                </a>
              </li>
              <li className="flex items-center gap-2">
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
              <li className="flex items-center gap-2">
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
