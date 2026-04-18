"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { extendedTranslations } from "@/lib/translations";

const WA_LINK =
  "https://wa.me/66647646597?text=Halo%20Keliling%20Thailand!%20Saya%20ingin%20memesan%20layanan%20transportasi.";

export default function ServicesContent() {
  const { language } = useLanguage();
  const s = extendedTranslations[language].servicesPage;

  return (
    <>
      {/* Page Header */}
      <section
        className="pt-28 pb-16 relative"
        style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #253d6b 100%)" }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-[#F5C518] font-bold text-sm uppercase tracking-widest">
            {s.header.eyebrow}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mt-3 mb-4">
            {s.header.title}
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            {s.header.subtitle}
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {s.services.map((svc) => (
              <div
                key={svc.title}
                className={`rounded-2xl overflow-hidden border-2 flex flex-col transition-all ${
                  svc.highlight
                    ? "border-[#F5C518] shadow-2xl shadow-yellow-100 lg:col-span-1"
                    : "border-gray-100 hover:border-[#F5C518] hover:shadow-md"
                }`}
              >
                {/* Tag bar */}
                {svc.highlight ? (
                  <div className="bg-[#F5C518] text-black text-center text-xs font-bold py-2 uppercase tracking-widest">
                    {svc.tag}
                  </div>
                ) : (
                  <div className="bg-amber-50 text-[#1B2A4A]/50 text-center text-xs font-bold py-2 uppercase tracking-widest">
                    {svc.tag}
                  </div>
                )}

                <div className="p-6 sm:p-8 flex flex-col flex-1">
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">
                    {svc.subtitle}
                  </div>
                  <h2 className="text-2xl font-extrabold text-black mb-3">{svc.title}</h2>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">{svc.description}</p>

                  <ul className="space-y-2 mb-8 flex-1">
                    {svc.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-[#F5C518] font-bold mt-0.5 shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-gray-100 pt-6">
                    {svc.highlight ? (
                      /* Dual-price display for Alphard */
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-[#1B2A4A] rounded-xl py-5 px-3 text-center">
                          <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">5 jam</div>
                          <div className="text-[#F5C518] text-2xl font-extrabold leading-none mb-1">5.000</div>
                          <div className="text-white/60 text-xs">THB</div>
                        </div>
                        <div className="bg-[#F5C518] rounded-xl py-5 px-3 text-center">
                          <div className="text-black/50 text-[10px] font-bold uppercase tracking-widest mb-2">10 jam</div>
                          <div className="text-black text-2xl font-extrabold leading-none mb-1">8.500</div>
                          <div className="text-black/60 text-xs">THB</div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">{s.priceTable.colPrice}</div>
                        <div className="text-2xl font-extrabold text-black">{svc.price}</div>
                      </div>
                    )}
                    <a
                      href={WA_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-sm transition-colors ${
                        svc.highlight
                          ? "bg-[#F5C518] text-black hover:bg-yellow-400"
                          : "bg-[#1B2A4A] text-white hover:bg-[#253d6b]"
                      }`}
                    >
                      {svc.orderBtn}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">{s.priceTable.disclaimer}</p>
        </div>
      </section>

      {/* Popular Destinations */}
      <section
        className="py-20"
        style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #253d6b 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[#F5C518] font-bold text-sm uppercase tracking-widest">
              {s.destinations.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              {s.destinations.title}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {s.destinations.items.map((d) => (
              <div
                key={d.name}
                className="bg-white/10 border border-white/20 rounded-xl p-4 text-center hover:border-[#F5C518] hover:bg-white/15 transition-all cursor-default"
              >
                <svg className="w-5 h-5 text-[#F5C518] mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <div className="text-white text-sm font-semibold leading-tight">{d.name}</div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">{s.destinations.more}</p>
        </div>
      </section>

      {/* Price Comparison */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-[#F5C518] font-bold text-sm uppercase tracking-widest">
              {s.priceTable.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black mt-2">{s.priceTable.title}</h2>
            <p className="text-gray-500 mt-3 text-sm">{s.priceTable.subtitle}</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 border-b border-gray-100">
                  <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-gray-500 font-semibold">{s.priceTable.colService}</th>
                  <th className="text-center px-2 py-3 sm:px-4 sm:py-4 text-gray-500 font-semibold">{s.priceTable.colPrice}</th>
                  <th className="text-center px-2 py-3 sm:px-4 sm:py-4 text-gray-500 font-semibold">{s.priceTable.colDriver}</th>
                  <th className="text-center px-2 py-3 sm:px-4 sm:py-4 text-gray-500 font-semibold">{s.priceTable.colFixed}</th>
                  <th className="text-center px-2 py-3 sm:px-4 sm:py-4 text-gray-500 font-semibold">{s.priceTable.colGuarantee}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {s.priceTable.rows.map((row) => (
                  <tr key={row.name} className={row.highlight ? "bg-[#F5C518]/5" : ""}>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 font-extrabold text-black">
                      <div className="flex flex-col gap-1">
                        <span>{row.name}</span>
                        {row.highlight && row.badge && (
                          <span className="text-xs bg-[#F5C518] text-black px-2 py-0.5 rounded-full font-bold w-fit">
                            {row.badge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`text-center px-2 py-3 sm:px-4 sm:py-4 font-bold ${row.highlight ? "text-black" : "text-gray-600"}`}>
                      {row.price}
                    </td>
                    <td className={`text-center px-2 py-3 sm:px-4 sm:py-4 text-xl font-bold ${row.driver === "✓" ? "text-[#F5C518]" : row.driver === "~" ? "text-yellow-500" : "text-red-400"}`}>
                      {row.driver}
                    </td>
                    <td className={`text-center px-2 py-3 sm:px-4 sm:py-4 text-xl font-bold ${row.fixed === "✓" ? "text-[#F5C518]" : row.fixed === "~" ? "text-yellow-500" : "text-red-400"}`}>
                      {row.fixed}
                    </td>
                    <td className={`text-center px-2 py-3 sm:px-4 sm:py-4 text-xl font-bold ${row.guarantee === "✓" ? "text-[#F5C518]" : row.guarantee === "~" ? "text-yellow-500" : "text-red-400"}`}>
                      {row.guarantee}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-gray-400 text-xs mt-4">{s.priceTable.note}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-amber-50">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-[#F5C518] font-bold text-sm uppercase tracking-widest">
              {s.faq.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black mt-2">{s.faq.title}</h2>
          </div>

          <div className="space-y-4">
            {s.faq.items.map((faq) => (
              <div key={faq.q} className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-bold text-black mb-2">{faq.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="py-16"
        style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #253d6b 100%)" }}
      >
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">{s.cta.title}</h2>
          <p className="text-white/70 mb-8">{s.cta.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn text-base shadow-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {s.cta.whatsappBtn}
            </a>
            <Link
              href="/contact"
              className="bg-white text-[#1B2A4A] px-6 py-3 rounded-full font-bold hover:bg-[#F5C518] hover:text-[#1B2A4A] transition-colors inline-flex items-center justify-center gap-2"
            >
              {s.cta.bookingBtn}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
