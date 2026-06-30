"use client";

import Image from "next/image";
import { formatDate } from "@/lib/admin/utils";
import { KELILING_THAILAND } from "@/lib/admin/company";
import type { ItineraryDay, ItineraryPlace, TravelTip } from "@/lib/admin/itinerary";

const NAVY = "#1B2A4A";
const GOLD = "#F5C518";
const RUST = "#B95A33"; // editorial accent for display type

// wa.me link from the company WhatsApp number (digits only).
const WA_DIGITS = KELILING_THAILAND.whatsapp.replace(/\D/g, "");
const WA_LINK = `https://wa.me/${WA_DIGITS}`;
const WA_QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(
  WA_LINK
)}`;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Split a title into [head, tail] for the two-tone serif look. */
function splitTitle(t: string): [string, string] {
  const m = t.match(/^(.*?)(?:\s*[-–—:]\s*)(.+)$/);
  if (m) return [m[1].trim(), m[2].trim()];
  const words = t.trim().split(/\s+/);
  if (words.length < 2) return [t, ""];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function TwoTone({ text, className }: { text: string; className?: string }) {
  const [a, b] = splitTitle(text || "");
  return (
    <h2 className={`font-serif leading-[1.04] ${className ?? ""}`}>
      <span style={{ color: NAVY }}>{a}</span>
      {b && (
        <>
          {" "}
          <span style={{ color: RUST }}>{b}</span>
        </>
      )}
    </h2>
  );
}
function weekday(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("id-ID", { weekday: "long" })
    .toUpperCase();
}

export default function ItineraryDoc({
  tripTitle,
  customer,
  pax,
  notes,
  vehicle,
  heroImage,
  days,
  galleryImages = [],
  travelTips = [],
  showTravelTips = true,
}: {
  tripTitle: string;
  customer: string;
  pax: string;
  notes: string;
  vehicle: string;
  heroImage: string;
  days: ItineraryDay[];
  /** Free trip photos (not tied to a day) for the closing recap gallery. */
  galleryImages?: string[];
  /** Editable "Info Perjalanan" reminders for the closing page. */
  travelTips?: TravelTip[];
  /** Whether to render the Info Perjalanan block. */
  showTravelTips?: boolean;
}) {
  const dated = days.map((d) => d.date).filter(Boolean);
  const dateRange =
    dated.length > 1
      ? `${formatDate(dated[0])} – ${formatDate(dated[dated.length - 1])}`
      : dated[0]
        ? formatDate(dated[0])
        : null;
  const nights = days.length > 1 ? days.length - 1 : 0;
  const cities = Array.from(
    new Set(days.map((d) => d.city?.trim()).filter(Boolean))
  ) as string[];
  const withPhoto = days.flatMap((d) => d.places).filter((p) => p.image);
  const hero = heroImage || withPhoto[0]?.image || "";
  // Trip recap gallery for the closing page — free trip photos first, then the
  // day attractions. Dedupe by image, cap at 8.
  const freePhotos: ItineraryPlace[] = galleryImages
    .filter(Boolean)
    .map((image) => ({ id: image, name: "", image, desc: "" }));
  const gallery = Array.from(
    new Map([...freePhotos, ...withPhoto].map((p) => [p.image, p])).values()
  ).slice(0, 8);
  const pill = [vehicle, pax].filter(Boolean).join(" · ").toUpperCase();
  const totalPages = 1 + days.length + 1;

  return (
    <div>
      <p className="no-print mb-2 text-center text-xs font-medium text-gray-400">
        {totalPages} halaman A4 · 1 hari = 1 halaman
      </p>

      <div className="kt-itin-sheets space-y-8 rounded-xl bg-gray-200/70 p-4 sm:p-8 print:space-y-0 print:rounded-none print:bg-white print:p-0">
        <Sheet pageNo={1} totalPages={totalPages}>
          <CoverPage
            tripTitle={tripTitle}
            customer={customer}
            pax={pax}
            days={days.length}
            nights={nights}
            dateRange={dateRange}
            cities={cities}
            hero={hero}
          />
        </Sheet>

        {days.map((d, i) => (
          <Sheet key={d.id} pageNo={i + 2} totalPages={totalPages}>
            <DayPage day={d} dayNo={i + 1} pill={pill} />
          </Sheet>
        ))}

        <Sheet pageNo={totalPages} totalPages={totalPages}>
          <ClosingPage
            notes={notes}
            gallery={gallery}
            travelTips={showTravelTips ? travelTips : []}
          />
        </Sheet>
      </div>
    </div>
  );
}

function Sheet({
  pageNo,
  totalPages,
  children,
}: {
  pageNo: number;
  totalPages: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="no-print mb-1 text-center text-xs font-medium text-gray-400">
        Halaman {pageNo} / {totalPages}
      </p>
      <article className="kt-page invoice-doc mx-auto flex min-h-[1123px] w-full max-w-[794px] flex-col overflow-hidden bg-white text-[#1B2A4A] shadow-lg ring-1 ring-gray-200 print:shadow-none print:ring-0">
        {children}
      </article>
    </div>
  );
}

// eslint-disable-next-line @next/next/no-img-element
const Img = (p: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...p} />;

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[0.28em]"
      style={{ color: light ? GOLD : "#9aa3b2" }}
    >
      {children}
    </p>
  );
}

// ── Cover: full-bleed editorial hero ─────────────────────────

function CoverPage({
  tripTitle,
  customer,
  pax,
  days,
  nights,
  dateRange,
  cities,
  hero,
}: {
  tripTitle: string;
  customer: string;
  pax: string;
  days: number;
  nights: number;
  dateRange: string | null;
  cities: string[];
  hero: string;
}) {
  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden"
      style={{
        background: hero
          ? NAVY
          : `radial-gradient(130% 90% at 50% -10%, #2a3f6b 0%, ${NAVY} 58%)`,
      }}
    >
      {hero && <Img src={hero} className="absolute inset-0 h-full w-full object-cover" />}
      {/* navy scrim for legible text over a photo */}
      <div
        className="absolute inset-0"
        style={{
          background: hero
            ? "linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.15) 38%, rgba(15,23,42,0.85) 100%)"
            : "none",
        }}
      />

      {/* No-photo cover: inset gold frame + oversized destination watermark so
          the page reads as an editorial cover, not an empty navy block. */}
      {!hero && (
        <>
          <div className="pointer-events-none absolute inset-6 rounded-sm border border-[#F5C518]/20" />
          <span
            className="pointer-events-none absolute -bottom-12 -right-6 select-none font-serif uppercase leading-none text-white/[0.05]"
            style={{ fontSize: "12rem" }}
          >
            {cities[0] || "Thailand"}
          </span>
        </>
      )}

      {/* Top brand bar */}
      <div className="relative flex items-center justify-between p-10 sm:p-12">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5C518] shadow">
            <Image src="/Logo.png" alt="" width={38} height={29} priority />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            KELILING THAILAND
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/70">
          EDISI 2026 · NO. 002
        </span>
      </div>

      {/* Title block — pinned to the bottom over a photo, vertically centered
          without one so the cover never leaves a dead navy void. */}
      <div className={`relative p-10 sm:p-12 ${hero ? "mt-auto" : "my-auto"}`}>
        <Eyebrow light>Itinerary · {days} Hari {nights} Malam</Eyebrow>
        <h1 className="mt-3 max-w-2xl font-serif text-6xl leading-[1.0] text-white">
          {tripTitle || "Itinerary Perjalanan"}
        </h1>
        <div className="mt-4 h-1 w-24 rounded-full" style={{ backgroundColor: GOLD }} />

        {customer ? (
          <div
            className="mt-5 border-l-2 pl-4"
            style={{ borderColor: GOLD }}
          >
            <span className="block text-[9px] font-semibold uppercase tracking-[0.3em] text-white/65">
              Disusun khusus untuk
            </span>
            <span className="mt-0.5 block font-serif text-xl leading-tight text-white">
              {customer}
            </span>
            {(pax || dateRange) && (
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
                {pax && <span>{pax} Tamu</span>}
                {pax && dateRange && <span style={{ color: GOLD }}>·</span>}
                {dateRange && <span>{dateRange}</span>}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {pax && <GlassChip label="Pax" value={pax} />}
            {dateRange && <GlassChip label="Tanggal" value={dateRange} />}
          </div>
        )}

        {cities.length > 0 && (
          <p className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
            {cities.map((c, i) => (
              <span key={c} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: GOLD }}>•</span>}
                {c}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

function GlassChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs backdrop-blur-sm">
      <span className="text-[9px] font-bold uppercase tracking-wide text-white/60">
        {label}
      </span>
      <span className="font-semibold text-white">{value}</span>
    </span>
  );
}

// ── Day page ─────────────────────────────────────────────────

function DayPage({
  day,
  dayNo,
  pill,
}: {
  day: ItineraryDay;
  dayNo: number;
  pill: string;
}) {
  const photos = day.places.filter((p) => p.image).slice(0, 4);
  const eyebrow = [weekday(day.date), day.theme?.toUpperCase(), day.city?.toUpperCase()]
    .filter(Boolean)
    .join("   ·   ");

  return (
    <div className="flex flex-1 flex-col p-10 sm:p-12">
      {/* Running brand header */}
      <div
        className="mb-6 flex items-center justify-between pb-3"
        style={{ borderBottom: `2px solid ${GOLD}` }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5C518]">
            <Image src="/Logo.png" alt="" width={18} height={14} priority />
          </span>
          <span
            className="text-[11px] font-extrabold tracking-tight"
            style={{ color: NAVY }}
          >
            KELILING THAILAND
          </span>
        </div>
        <span className="font-mono text-[9px] tracking-[0.25em] text-gray-400">
          ITINERARY · EDISI 2026
        </span>
      </div>

      {/* Header: D0x marker + gold pill */}
      <div className="flex items-start justify-between">
        <p className="font-serif text-5xl leading-none" style={{ color: NAVY }}>
          D{pad2(dayNo)}
        </p>
        {pill && (
          <span
            className="rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            {pill}
          </span>
        )}
      </div>

      {/* Eyebrow + two-tone serif title + route */}
      {eyebrow && (
        <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
          {eyebrow}
        </p>
      )}
      <TwoTone text={day.title || `Hari ${dayNo}`} className="mt-1 text-4xl" />
      {day.route && (
        <p className="mt-2 font-mono text-[10px] tracking-[0.18em] text-gray-400">
          {day.route}
        </p>
      )}

      {/* Thick rule */}
      <div className="mt-4 flex items-center gap-2">
        <span className="h-[3px] w-20 rounded-full" style={{ backgroundColor: NAVY }} />
        <span className="h-px flex-1" style={{ backgroundColor: `${NAVY}26` }} />
      </div>

      {/* Day description */}
      {day.intro && (
        <p className="mt-4 max-w-xl font-serif text-[13px] italic leading-relaxed text-gray-600">
          {day.intro}
        </p>
      )}

      {/* Body — full-width numbered schedule */}
      <ol className="mt-5 flex-1">
        {day.activities.map((a, i) => (
          <li
            key={a.id}
            className="flex gap-3 py-2"
            style={{ borderTop: i ? `1px solid ${NAVY}12` : undefined }}
          >
            <span
              className="w-8 shrink-0 font-serif text-2xl leading-none"
              style={{ color: `${RUST}B3` }}
            >
              {pad2(i + 1)}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold leading-snug" style={{ color: NAVY }}>
                {a.time || "—"}
              </p>
              {a.text && (
                <p className="text-[11.5px] leading-snug text-gray-600">{a.text}</p>
              )}
            </div>
          </li>
        ))}
        {day.activities.length === 0 && (
          <li className="py-2 text-xs text-gray-400">Belum ada kegiatan.</li>
        )}
      </ol>

      {/* City highlight band — the day's photo home, anchored to the bottom */}
      {(day.city || day.cityHighlight || photos.length > 0) && (
        <section className="mt-6 border-t-2 pt-4" style={{ borderColor: GOLD }}>
          <div className="flex items-baseline gap-3">
            <Eyebrow>Highlight Kota</Eyebrow>
            {day.city && (
              <span
                className="font-serif text-2xl leading-none"
                style={{ color: RUST }}
              >
                {day.city}
              </span>
            )}
          </div>
          {day.cityHighlight && (
            <p className="mt-2 max-w-3xl font-serif text-[12.5px] italic leading-relaxed text-gray-600">
              {day.cityHighlight}
            </p>
          )}
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {photos.map((p, i) => (
                <figure key={`band-${p.id}`}>
                  <div className="h-28 overflow-hidden rounded-lg bg-gray-100">
                    <Img src={p.image} className="h-full w-full object-cover" />
                  </div>
                  <figcaption className="mt-1">
                    <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                      {pad2(i + 1)} · {p.name}
                    </p>
                    {p.desc && (
                      <p className="line-clamp-2 text-[9px] leading-snug text-gray-400">
                        {p.desc}
                      </p>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      <footer
        className="mt-4 flex items-center justify-between pt-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500"
        style={{ borderTop: `2px solid ${GOLD}` }}
      >
        <span style={{ color: NAVY }}>Keliling Thailand</span>
        <span>Hari {dayNo}</span>
        <span>{KELILING_THAILAND.website}</span>
      </footer>
    </div>
  );
}

// ── Closing ──────────────────────────────────────────────────

function ClosingPage({
  notes,
  gallery,
  travelTips,
}: {
  notes: string;
  gallery: ItineraryPlace[];
  travelTips: TravelTip[];
}) {
  const k = KELILING_THAILAND;
  // The main WhatsApp line belongs to a named contact — show that name instead
  // of a bare "WhatsApp" label. Drop that contact from the extra list so the
  // number isn't printed twice.
  const waDigits = k.whatsapp.replace(/\D/g, "");
  const waContact = k.contacts.find(
    (c) => c.phone.replace(/\D/g, "") === waDigits
  );
  const extraContacts = k.contacts.filter(
    (c) => c.phone.replace(/\D/g, "") !== waDigits
  );
  return (
    <div className="flex flex-1 flex-col p-10 sm:p-12">
      <div className="flex items-center gap-2.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5C518] shadow-sm">
          <Image src="/Logo.png" alt="" width={30} height={23} priority />
        </span>
        <div className="leading-tight">
          <p className="text-base font-extrabold tracking-tight">KELILING THAILAND</p>
          <p className="text-[11px] text-gray-600">{k.tagline}</p>
        </div>
      </div>

      <div className="mt-10">
        <Eyebrow>Terima Kasih</Eyebrow>
        <h2 className="mt-2 max-w-md font-serif text-4xl leading-tight text-[#1B2A4A]">
          Siap menemani perjalanan Anda di Negeri Gajah Putih.
        </h2>
      </div>

      {/* Practical travel reminders — editable + toggleable from the builder */}
      {travelTips.length > 0 && (
        <div className="mt-8">
        <Eyebrow>Info Perjalanan</Eyebrow>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
          {travelTips.map((t) => (
            <div key={t.label} className="flex gap-2.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: GOLD }}
              />
              <p className="text-[11px] leading-snug text-gray-600">
                <span className="font-semibold" style={{ color: NAVY }}>
                  {t.label}.
                </span>{" "}
                {t.text}
              </p>
            </div>
          ))}
        </div>
        </div>
      )}

      {gallery.length > 0 && (
        <div className="mt-8">
          <Eyebrow>Galeri Perjalanan</Eyebrow>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {gallery.map((p) => (
              <div
                key={p.image}
                className="h-24 overflow-hidden rounded-lg bg-gray-100"
              >
                <Img src={p.image} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {notes && (
        <div className="mt-6">
          <Eyebrow>Catatan &amp; Ketentuan</Eyebrow>
          <div className="mt-2 rounded-lg border-l-4 border-[#F5C518] bg-gray-50 p-4 text-xs leading-relaxed text-gray-700">
            <p className="whitespace-pre-line">{notes}</p>
          </div>
        </div>
      )}

      <div className="mt-auto">
        <Eyebrow>Hubungi Tim Kami</Eyebrow>
        <div className="mt-2 flex items-start gap-10">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-8 text-xs">
            <ContactRow
              label={waContact ? waContact.name : "WhatsApp"}
              value={k.whatsapp}
              wide
              singleLine
            />
            {extraContacts.map((c) => (
              <ContactRow
                key={c.name}
                label={c.name}
                value={c.phone}
                wide
                singleLine
              />
            ))}
            <ContactRow label="Instagram" value={k.instagram} singleLine />
            <ContactRow label="Facebook" value={k.facebook} singleLine />
            <ContactRow label="Email" value={k.email} wide />
            <ContactRow label="Website" value={k.website} wide />
          </div>
          {/* WhatsApp QR — scan to chat / rebook */}
          <div className="ml-2 shrink-0 text-center">
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
              <Img src={WA_QR_SRC} className="h-full w-full object-contain" />
            </div>
            <p className="mt-1.5 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              Scan · Chat WhatsApp
            </p>
          </div>
        </div>

        <div
          className="-mx-10 -mb-10 mt-6 flex items-center justify-between px-10 py-4 sm:-mx-12 sm:-mb-12 sm:px-12"
          style={{ backgroundColor: NAVY }}
        >
          <span className="text-xs font-semibold tracking-wide" style={{ color: GOLD }}>
            Gampang, Aman &amp; Nyaman
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/60">
            {k.website}
          </span>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  label,
  value,
  wide,
  singleLine,
}: {
  label: string;
  value: string;
  wide?: boolean;
  singleLine?: boolean;
}) {
  return (
    <div
      className={`grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-3 border-b border-gray-100 py-1.5 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span
        className={`min-w-0 font-medium text-[#1B2A4A] ${
          singleLine ? "whitespace-nowrap tabular-nums" : "break-words"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
