"use client";

import { useState } from "react";
import LocationSearch from "@/components/LocationSearch";
import DatePicker from "@/components/DatePicker";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/components/LanguageContext";

const WA_NUMBER = "66647646597";
const WA_BASE = `https://wa.me/${WA_NUMBER}`;

const CONTACT_WA = {
  id: "Halo Keliling Thailand! Saya ingin bertanya tentang layanan transportasi. [dari: Contact Page - Chat Langsung]",
  en: "Hello Keliling Thailand! I'd like to ask about your transport services. [from: Contact Page - Direct Chat]",
  th: "สวัสดี Keliling Thailand! ฉันต้องการสอบถามเกี่ยวกับบริการรถ [จาก: Contact Page - แชทตรง]",
} as const;

export default function ContactContent() {
  const { t, language } = useLanguage();
  const c = t.contact;
  const alphardVehicle = c.vehicles.find((vehicle) =>
    vehicle.toLowerCase().includes("alphard")
  );
  const vehicleOptions = alphardVehicle
    ? [alphardVehicle, ...c.vehicles.filter((vehicle) => vehicle !== alphardVehicle)]
    : c.vehicles;

  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    service: "",
    vehicle: "",
    date: "",
    pax: "1",
    pickup: "",
    dropoff: "",
    notes: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const selectedVehicle = form.vehicle || alphardVehicle || "";

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Save booking to Supabase (fire-and-forget — WhatsApp still opens regardless)
    fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch((err) => console.error("Booking save failed:", err));

    const msg = [
      c.waMessage,
      ``,
      `👤 ${c.waName}: ${form.name}`,
      `📱 ${c.waWa}: ${form.whatsapp}`,
      `🚗 ${c.waService}: ${form.service}`,
      selectedVehicle ? `🚐 ${c.waVehicle}: ${selectedVehicle}` : "",
      `📅 ${c.waDate}: ${form.date}`,
      `👥 ${c.waPax}: ${form.pax} ${c.waPaxUnit}`,
      form.pickup ? `📍 ${c.waPickup}: ${form.pickup}` : "",
      form.dropoff ? `🏁 ${c.waDropoff}: ${form.dropoff}` : "",
      form.notes ? `📝 ${c.waNotes}: ${form.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const waUrl = `${WA_BASE}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
    setSubmitted(true);
  }

  return (
    <>
      <section className="relative overflow-hidden bg-[#1B2A4A] pt-28 pb-20">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#F5C518]" />
        <div className="absolute -left-10 top-20 h-40 w-40 rounded-full bg-[#F5C518]/12 blur-3xl" />
        <div className="absolute bottom-8 right-0 h-56 w-56 rounded-full bg-white/6 blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-4 text-center sm:px-6 lg:px-8">
          <span className="text-[#F5C518] font-bold text-sm uppercase tracking-widest">
            {c.badge}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mt-3 mb-4">
            {c.title1}<br /><span className="text-[#F5C518]">{c.title2}</span>
          </h1>
          <p className="text-white/68 text-lg max-w-2xl mx-auto leading-relaxed">
            {c.subtitle}
          </p>
        </div>
      </section>

      <section className="py-20 bg-amber-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <ScrollReveal className="space-y-6">
              <div className="rounded-[2rem] border border-white/10 bg-[#1B2A4A] p-7 text-white shadow-2xl">
                <div className="text-3xl mb-3">💬</div>
                <h3 className="text-xl font-bold mb-2">{c.chatDirectTitle}</h3>
                <p className="text-white/62 text-sm mb-5 leading-relaxed">
                  {c.chatDirectDesc}
                </p>
                <a
                  href={`${WA_BASE}?text=${encodeURIComponent(CONTACT_WA[language])}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-btn w-full justify-center text-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {c.openWhatsApp}
                </a>
              </div>

              <div className="rounded-[2rem] border border-[#1B2A4A]/10 bg-white p-6 shadow-lg">
                <h3 className="font-bold text-[#1B2A4A] mb-4">{c.contactInfoTitle}</h3>
                <ul className="space-y-4 text-sm text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1B2A4A]/6 text-xl">📱</span>
                    <div>
                      <div className="font-semibold text-[#1B2A4A]">{c.waLabel}</div>
                      <div>+66 XX-XXXX-XXXX</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1B2A4A]/6 text-xl">📸</span>
                    <div>
                      <div className="font-semibold text-[#1B2A4A]">{c.igLabel}</div>
                      <a
                        href="https://instagram.com/kelilingthailand"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F5C518] hover:underline"
                      >
                        @kelilingthailand
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1B2A4A]/6 text-xl">📍</span>
                    <div>
                      <div className="font-semibold text-[#1B2A4A]">{c.locationLabel}</div>
                      <div>{c.locationValue}</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1B2A4A]/6 text-xl">🕐</span>
                    <div>
                      <div className="font-semibold text-[#1B2A4A]">{c.hoursLabel}</div>
                      <div>{c.hoursValue}</div>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-[2rem] bg-[#F5C518] p-5 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-black">⚡ &lt; 1 Jam</div>
                <div className="text-sm text-black/70 mt-1">
                  {c.responseTime}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal className="lg:col-span-1">
              <div className="rounded-[2rem] border border-[#1B2A4A]/10 bg-white p-8 shadow-[0_24px_70px_rgba(16,32,60,0.12)]">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-extrabold text-[#1B2A4A] mb-2">
                      {c.thankYouTitle}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {c.thankYouDesc}
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="rounded-full bg-[#1B2A4A] px-6 py-3 font-bold text-white transition-colors hover:bg-[#F5C518] hover:text-black"
                    >
                      {c.newBookingBtn}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#F5C518] mb-2">
                      Reservasi
                    </p>
                    <h2 className="text-2xl font-extrabold text-[#1B2A4A] mb-6">
                      {c.formTitle}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {c.nameLabel}
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            value={form.name}
                            onChange={handleChange}
                            placeholder={c.namePlaceholder}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-[#FCFBF6] focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {c.waNumberLabel}
                          </label>
                          <input
                            type="tel"
                            name="whatsapp"
                            required
                            value={form.whatsapp}
                            onChange={handleChange}
                            placeholder={c.waNumberPlaceholder}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-[#FCFBF6] focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {c.serviceLabel}
                          </label>
                          <select
                            name="service"
                            required
                            value={form.service}
                            onChange={handleChange}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-[#FCFBF6] focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-colors"
                          >
                            <option value="">{c.servicePlaceholder}</option>
                            {c.services.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {c.vehicleLabel}
                          </label>
                          <select
                            name="vehicle"
                            required
                            value={selectedVehicle}
                            onChange={handleChange}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-[#FCFBF6] focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-colors"
                          >
                            {!alphardVehicle && (
                              <option value="">{c.vehiclePlaceholder}</option>
                            )}
                            {vehicleOptions.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {c.pickupLabel}
                          </label>
                          <LocationSearch
                            value={form.pickup}
                            onChange={(val) => setForm((prev) => ({ ...prev, pickup: val }))}
                            placeholder={c.pickupPlaceholder}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {c.dropoffLabel}
                          </label>
                          <LocationSearch
                            value={form.dropoff}
                            onChange={(val) => setForm((prev) => ({ ...prev, dropoff: val }))}
                            placeholder={c.dropoffPlaceholder}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {c.dateLabel}
                          </label>
                          <DatePicker
                            value={form.date}
                            onChange={(val) => setForm((prev) => ({ ...prev, date: val }))}
                            placeholder={c.dateLabel}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {c.paxLabel}
                          </label>
                          <select
                            name="pax"
                            value={form.pax}
                            onChange={handleChange}
                            className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-[#FCFBF6] focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-colors"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, "8+"].map((n) => (
                              <option key={n} value={String(n)}>
                                {n} {c.paxUnit}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          {c.notesLabel}
                        </label>
                        <textarea
                          name="notes"
                          value={form.notes}
                          onChange={handleChange}
                          rows={4}
                          placeholder={c.notesPlaceholder}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-[#FCFBF6] focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-colors resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#F5C518] text-black font-bold py-4 rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-yellow-600/15"
                      >
                        <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        {c.submitBtn}
                      </button>

                      <p className="text-center text-xs text-gray-400">
                        {c.disclaimer}
                      </p>
                    </form>
                  </>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}
