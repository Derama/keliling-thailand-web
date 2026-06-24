"use client";

import { formatTHB } from "@/lib/admin/utils";
import { KELILING_THAILAND } from "@/lib/admin/company";
import {
  MAX_CITY_DESTINATIONS,
  type BrochureCity,
  type BrochureMeta,
  type CatalogItem,
  type FleetItem,
} from "@/lib/admin/brochure";

const NAVY = "#1B2A4A";
const GOLD = "#F5C518";
const RUST = "#B95A33";

function pad2(n: number) {
  return String(n).padStart(2, "0");
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

/** Brand accent rule — a short solid gold bar fading into a thin gold hairline.
 *  Used under the header and above the footer on interior pages. */
function BrandRule({ className }: { className?: string }) {
  const adjust = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as const;
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="h-[3px] w-12 rounded-full" style={{ backgroundColor: GOLD, ...adjust }} />
      <span className="h-px flex-1" style={{ backgroundColor: `${GOLD}59`, ...adjust }} />
    </div>
  );
}

export default function BrochureDoc({
  meta,
  cities,
  fleet,
  hotels,
  attractions,
  notes,
}: {
  meta: BrochureMeta;
  cities: BrochureCity[];
  fleet: FleetItem[];
  hotels: CatalogItem[];
  attractions: CatalogItem[];
  notes: string;
}) {
  const activeCities = cities.filter((c) => c.enabled && c.destinations.length > 0);
  const activeFleet = fleet.filter((f) => f.enabled);
  const activeHotels = hotels.filter((h) => h.enabled);
  const activeAttractions = attractions.filter((a) => a.enabled);

  // Page builders, in order — each receives its page number + the total so the
  // footers can show in-document pagination (browser print headers are off).
  const build: { key: string; render: (n: number, t: number) => React.ReactNode }[] = [];
  build.push({ key: "cover", render: (n, t) => <CoverPage meta={meta} cities={activeCities} pageNo={n} totalPages={t} /> });
  build.push({ key: "about", render: (n, t) => <AboutPage pageNo={n} totalPages={t} /> });
  for (const c of activeCities) {
    build.push({ key: c.id, render: (n, t) => <CityPage city={c} pageNo={n} totalPages={t} /> });
  }
  if (activeFleet.length > 0) {
    build.push({ key: "fleet", render: (n, t) => <FleetPage fleet={activeFleet} pageNo={n} totalPages={t} /> });
  }
  if (activeHotels.length > 0 || activeAttractions.length > 0) {
    build.push({
      key: "menu",
      render: (n, t) => <MenuPage hotels={activeHotels} attractions={activeAttractions} pageNo={n} totalPages={t} />,
    });
  }
  build.push({ key: "closing", render: (n, t) => <ClosingPage notes={notes} pageNo={n} totalPages={t} /> });

  const totalPages = build.length;

  return (
    <div>
      <p className="no-print mb-2 text-center text-xs font-medium text-gray-400">
        {totalPages} halaman A4 · katalog brosur
      </p>

      <div className="kt-brochure-sheets space-y-8 rounded-xl bg-gray-200/70 p-4 sm:p-8 print:space-y-0 print:rounded-none print:bg-white print:p-0">
        {build.map((b, i) => (
          <Sheet key={b.key} pageNo={i + 1} totalPages={totalPages}>
            {b.render(i + 1, totalPages)}
          </Sheet>
        ))}
      </div>
    </div>
  );
}

/** Compact page counter, e.g. "03 / 13". */
function pageTag(n: number, t: number) {
  return `${pad2(n)} / ${pad2(t)}`;
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
      {/* Screen: A4-proportioned card (794×1123 ≈ 210×297mm). Print: the
          `kt-brochure-sheet` rule in globals.css turns each into a full,
          margin-free A4 page. */}
      <article className="kt-brochure-sheet mx-auto flex min-h-[1123px] w-full max-w-[794px] flex-col overflow-hidden bg-white text-[#1B2A4A] shadow-lg ring-1 ring-gray-200 print:shadow-none print:ring-0">
        {children}
      </article>
    </div>
  );
}

/** Slim running header reused on interior pages. */
function RunningHead({ section }: { section: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5C518]">
            <Img src="/Logo.png" width={18} height={14} />
          </span>
          <span
            className="text-[11px] font-extrabold tracking-tight"
            style={{ color: NAVY }}
          >
            KELILING THAILAND
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-gray-400">
          {section}
        </span>
      </div>
      <BrandRule />
    </div>
  );
}

function PageFooter({ label, page }: { label: string; page?: string }) {
  return (
    <footer className="mt-auto">
      <BrandRule className="mb-2.5" />
      <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500">
        <span style={{ color: NAVY }}>Keliling Thailand</span>
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <span>{KELILING_THAILAND.website}</span>
          {page && (
            <span
              className="rounded px-1.5 py-0.5 text-[8px]"
              style={{ backgroundColor: NAVY, color: GOLD }}
            >
              {page}
            </span>
          )}
        </span>
      </div>
    </footer>
  );
}

// ── Cover ─────────────────────────────────────────────────────

function CoverPage({
  meta,
  cities,
}: {
  meta: BrochureMeta;
  cities: BrochureCity[];
  pageNo: number;
  totalPages: number;
}) {
  const cityNames = cities.map((c) => c.city.toUpperCase());
  // Always show a cover photo — fall back to the bundled default so older
  // drafts (saved before the default existed) still render a hero image.
  const cover = meta.coverImage || "/brochure/cover.jpg";
  return (
    // Grid stacking (every layer in cell 1/1) instead of absolute positioning:
    // a real, in-flow <img> always prints, whereas an absolutely-positioned one
    // can drop out of the PDF. Explicit single 1fr track gives the cell a
    // definite size so the photo's height:100% resolves in print (an indefinite
    // track collapses it to 0 → blank photo).
    <div
      className="flex-1"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: "minmax(0, 1fr)",
        backgroundColor: NAVY,
      }}
    >
      <Img
        src={cover}
        className="object-cover"
        style={{
          gridArea: "1 / 1",
          width: "100%",
          height: "100%",
          minHeight: 0,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      />
      {/* No gradient overlay element — a separate semi-transparent layer over
          the photo gets dropped (taking the photo with it) in Chrome's print
          compositing. Legibility comes from a text-shadow on the copy instead. */}
      <div
        className="flex flex-col"
        style={{
          gridArea: "1 / 1",
          textShadow: "0 1px 3px rgba(0,0,0,0.55), 0 2px 18px rgba(0,0,0,0.65)",
        }}
      >
      <div className="relative flex items-center justify-between p-10 sm:p-12">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5C518] shadow">
            <Img src="/Logo.png" width={38} height={29} />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            KELILING THAILAND
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/70">
          {meta.edition}
        </span>
      </div>

      <div className="relative mt-auto p-10 sm:p-12">
        <Eyebrow light>Tour &amp; Travel · Sewa Mobil + Supir</Eyebrow>
        <h1 className="mt-3 max-w-2xl font-serif text-6xl leading-[1.0] text-white">
          {meta.title || "Katalog Tur & Perjalanan"}
        </h1>
        <div className="mt-4 h-1 w-24 rounded-full" style={{ backgroundColor: GOLD }} />
        {meta.subtitle && (
          <p className="mt-5 max-w-xl font-serif text-lg italic leading-snug text-white/85">
            {meta.subtitle}
          </p>
        )}
        {cityNames.length > 0 && (
          <p className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
            {cityNames.map((c, i) => (
              <span key={c} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: GOLD }}>•</span>}
                {c}
              </span>
            ))}
          </p>
        )}
      </div>
      </div>
    </div>
  );
}

// ── About / why us ────────────────────────────────────────────

const WHY_US = [
  {
    title: "Tour Guide Berbahasa Indonesia",
    body: "Pemandu kami fasih bahasa Indonesia — jelaskan tiap destinasi dengan ramah sepanjang perjalanan.",
  },
  {
    title: "Itinerary Disediakan",
    body: "Setiap trip dilengkapi itinerary harian yang rapi, jadi Anda tahu rencana dari hari ke hari.",
  },
  {
    title: "Respon Cepat",
    body: "Tim kami balas cepat via WhatsApp — pertanyaan dan booking ditangani tanpa lama menunggu.",
  },
  {
    title: "Armada Lengkap & Terawat",
    body: "Dari sedan hingga bus, semua ber-AC, bersih, dan siap untuk keluarga maupun grup besar.",
  },
  {
    title: "Harga Termasuk Semua",
    body: "Supir, bensin, tol, dan parkir sudah termasuk. Tidak ada biaya tersembunyi di tengah jalan.",
  },
  {
    title: "Bisa Diatur Sesuai Mau",
    body: "City tour, antar-jemput bandara, hotel, sampai tiket atraksi — kami paketkan sesuai kebutuhan Anda.",
  },
];

const ABOUT_GALLERY = [
  { src: "/brochure/about-skyline.jpg", label: "Budaya & Kuil" },
  { src: "/brochure/about-boats.jpg", label: "Pantai & Pulau" },
];

// Closing-page imagery — a parting "see you in Thailand" band.
const CLOSING_PHOTOS = [
  { src: "/brochure/about-temple.jpg", label: "Kuil & Budaya" },
  { src: "/brochure/about-boats.jpg", label: "Pantai & Pulau" },
];

// Two short, strong reviews to close on social proof (Bahasa, matches brochure).
const TESTIMONIALS = [
  {
    name: "Budi & Keluarga",
    city: "Surabaya",
    text: "Sekeluarga 6 orang, 10 hari di Thailand — semua pakai Keliling Thailand dari hari pertama sampai terakhir. Tidak sekali pun ada masalah. Recommended 1000%!",
  },
  {
    name: "Dewi A.",
    city: "Bandung",
    text: "Penerbangan delay 3 jam, driver sabar menunggu dan terus update via WhatsApp. Keluar bandara langsung ada papan nama kami. Ini profesional!",
  },
];

function AboutPage({ pageNo, totalPages }: { pageNo: number; totalPages: number }) {
  const k = KELILING_THAILAND;
  return (
    <div className="flex flex-1 flex-col p-10 sm:p-12">
      <RunningHead section="Tentang Kami" />

      {/* Hero: text left, photo right */}
      <div className="grid grid-cols-[1.05fr_0.95fr] items-stretch gap-6">
        <div className="flex flex-col justify-center">
          <Eyebrow>Tentang Keliling Thailand</Eyebrow>
          <h2 className="mt-2 font-serif text-[2.6rem] leading-[1.05] text-[#1B2A4A]">
            Partner perjalanan Anda di{" "}
            <span style={{ color: RUST }}>Negeri Gajah Putih.</span>
          </h2>
          <p className="mt-4 text-[12.5px] leading-relaxed text-gray-600">
            Kami melayani wisatawan Indonesia, agen tur &amp; travel, serta
            perusahaan yang ingin mengadakan company outing dan gathering di
            Thailand — sewa mobil plus supir, city tour, hotel, dan tiket
            atraksi. Gampang, aman, dan nyaman.
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
          <Img src="/brochure/about-temple.jpg" className="h-full min-h-56 w-full object-cover" />
          <span
            className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            Bangkok · Thailand
          </span>
        </div>
      </div>

      {/* Why us — 6 cards */}
      <div className="mt-6">
        <Eyebrow>Kenapa Keliling Thailand</Eyebrow>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {WHY_US.map((w, i) => (
            <div
              key={w.title}
              className="rounded-xl border border-gray-200 p-3"
              style={{ borderTopColor: GOLD, borderTopWidth: 3 }}
            >
              <span
                className="font-serif text-xl leading-none"
                style={{ color: `${RUST}B3` }}
              >
                {pad2(i + 1)}
              </span>
              <h3 className="mt-1 text-[12px] font-bold leading-tight" style={{ color: NAVY }}>
                {w.title}
              </h3>
              <p className="mt-1 text-[10px] leading-snug text-gray-600">{w.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Photo band — grid stacking (no absolute layers) so the photos print. */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {ABOUT_GALLERY.map((g) => (
          <div
            key={g.src}
            className="h-44 overflow-hidden rounded-xl bg-gray-100"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gridTemplateRows: "minmax(0, 1fr)",
            }}
          >
            <Img
              src={g.src}
              className="object-cover"
              style={{
                gridArea: "1 / 1",
                width: "100%",
                height: "100%",
                minHeight: 0,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            />
            {/* Solid gold chip (not a gradient scrim, which drops the photo in
                print) keeps the label readable on any photo, screen + PDF. */}
            <span
              className="m-2.5 self-end justify-self-start rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm"
              style={{
                gridArea: "1 / 1",
                backgroundColor: GOLD,
                color: NAVY,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              {g.label}
            </span>
          </div>
        ))}
      </div>

      <div
        className="mt-auto flex items-center justify-between rounded-xl px-6 py-4"
        style={{ backgroundColor: NAVY }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: GOLD }}>
            Siap merencanakan perjalanan?
          </p>
          <div className="mt-1 flex gap-6">
            {k.contacts.map((c) => (
              <div key={c.phone}>
                <p className="font-serif text-lg leading-tight text-white">{c.phone}</p>
                <p className="text-[10px] tracking-wide text-white/60">{c.name}</p>
              </div>
            ))}
          </div>
        </div>
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/60">
          {k.website}
        </span>
      </div>
      <PageFooter label="Tentang Kami" page={pageTag(pageNo, totalPages)} />
    </div>
  );
}

// ── City page ─────────────────────────────────────────────────

// Short, intriguing fun facts in Bahasa Indonesia, keyed by a substring of the
// city name (case-insensitive). First match wins; generic fallback otherwise.
const FUN_FACTS: { match: string; fact: string }[] = [
  { match: "bangkok", fact: "Nama resmi Bangkok punya 168 huruf dan tercatat sebagai nama kota terpanjang di dunia. Warga lokal cukup menyebutnya 'Krung Thep' — Kota Para Dewa." },
  { match: "pattaya", fact: "Pattaya dulu hanya desa nelayan kecil yang sepi. Kini ia menjelma jadi salah satu kota pantai paling hidup di Thailand, dengan pasir, pulau, dan kehidupan malam yang tak pernah tidur." },
  { match: "hua hin", fact: "Hua Hin adalah resor pantai pertama di Thailand dan jadi favorit keluarga kerajaan sejak 1920-an. Suasananya tetap tenang dan ramah keluarga sampai hari ini." },
  { match: "ayutthaya", fact: "Pada tahun 1700, Ayutthaya adalah salah satu kota terbesar dunia dengan hampir 1 juta penduduk. Reruntuhan kuil dan istananya kini jadi situs Warisan Dunia UNESCO." },
  { match: "chiang mai", fact: "Chiang Mai punya lebih dari 300 kuil dan dijuluki 'Mawar Utara' Thailand. Kota tua berbentuk persegi ini masih dikelilingi parit dan tembok berusia 700 tahun." },
  { match: "chiang rai", fact: "Wat Rong Khun (Kuil Putih) di Chiang Rai dirancang seorang seniman, bukan biksu, dan masih dibangun hingga sekarang. Warnanya serba putih berkilau sebagai lambang kesucian." },
  { match: "kanchanaburi", fact: "Jembatan terkenal di Kanchanaburi adalah bagian dari 'Death Railway' Perang Dunia II. Di sekitarnya tersembunyi air terjun bertingkat dan hutan yang memesona." },
  { match: "khao yai", fact: "Khao Yai adalah taman nasional tertua kedua di Thailand sekaligus situs Warisan Dunia UNESCO. Rumah bagi gajah liar, air terjun, dan deretan kafe & kebun anggur yang sedang naik daun." },
  { match: "krabi", fact: "Pantai Railay di Krabi hanya bisa dicapai dengan perahu karena terpisah oleh tebing kapur raksasa. Tebing-tebing inilah yang menjadikannya surga bagi pecinta panjat tebing dunia." },
  { match: "phuket", fact: "Phuket adalah pulau terbesar Thailand dan dulu makmur dari tambang timah, jauh sebelum era turisme. Jejaknya masih terlihat di rumah-rumah Sino-Portugis di kota tua." },
];

function funFact(city: string): string {
  const c = city.trim().toLowerCase();
  const hit = FUN_FACTS.find((f) => c.includes(f.match));
  return (
    hit?.fact ??
    `Setiap sudut ${city} menyimpan cerita — biar kami bantu Anda menemukannya.`
  );
}

function CityPage({
  city,
  pageNo,
  totalPages,
}: {
  city: BrochureCity;
  pageNo: number;
  totalPages: number;
}) {
  const dest = city.destinations.slice(0, MAX_CITY_DESTINATIONS);
  // Admin-chosen cover wins — it can be ANY of the city's photos, even one not
  // shown in the destinations grid. Fall back to the first shown photo.
  const hero = city.cover || dest.find((d) => d.image)?.image || "";
  return (
    <div className="flex flex-1 flex-col p-10 sm:p-12">
      <RunningHead section="Destinasi" />

      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>Kota Tujuan</Eyebrow>
          <h2 className="mt-1 font-serif text-5xl leading-none" style={{ color: NAVY }}>
            {city.city}
          </h2>
        </div>
        <span
          className="rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ backgroundColor: GOLD, color: NAVY }}
        >
          {dest.length} Destinasi
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="h-[3px] w-20 rounded-full" style={{ backgroundColor: NAVY }} />
        <span className="h-px flex-1" style={{ backgroundColor: `${NAVY}26` }} />
      </div>

      {city.intro && (
        <p className="mt-4 max-w-2xl font-serif text-[13px] italic leading-relaxed text-gray-600">
          {city.intro}
        </p>
      )}

      {hero && (
        <div className="mt-5 h-56 overflow-hidden rounded-xl bg-gray-100">
          <Img src={hero} className="h-full w-full object-cover" />
        </div>
      )}

      <section className="mt-6">
        <Eyebrow>Destinasi Unggulan</Eyebrow>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {dest.map((d, i) => (
            <figure key={d.id} className="overflow-hidden rounded-lg border border-gray-100">
              <div className="h-24 bg-gray-100">
                {d.image ? (
                  <Img src={d.image} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">
                    {d.name}
                  </span>
                )}
              </div>
              <figcaption className="p-2">
                <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                  {pad2(i + 1)} · {d.name}
                </p>
                {d.desc && (
                  <p className="mt-0.5 line-clamp-3 text-[9.5px] leading-snug text-gray-500">
                    {d.desc}
                  </p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Fun fact — slim one-liner to intrigue, unique per city */}
      <div
        className="mt-auto flex items-start gap-3 rounded-lg border-l-[3px] px-4 py-3"
        style={{ borderColor: GOLD, backgroundColor: "#FBFAF5" }}
      >
        <span
          className="mt-0.5 shrink-0 text-[9px] font-bold uppercase tracking-[0.2em]"
          style={{ color: RUST }}
        >
          Tahukah Anda?
        </span>
        <p className="text-[11px] leading-relaxed text-gray-600">{funFact(city.city)}</p>
      </div>

      <PageFooter label={city.city} page={pageTag(pageNo, totalPages)} />
    </div>
  );
}

// ── Fleet page ────────────────────────────────────────────────

function FleetPage({
  fleet,
  pageNo,
  totalPages,
}: {
  fleet: FleetItem[];
  pageNo: number;
  totalPages: number;
}) {
  return (
    <div className="flex flex-1 flex-col p-10 sm:p-12">
      <RunningHead section="Armada" />
      <Eyebrow>Pilihan Kendaraan</Eyebrow>
      <h2 className="mt-1 font-serif text-5xl leading-none" style={{ color: NAVY }}>
        Armada Kami
      </h2>
      <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-gray-600">
        Semua kendaraan ber-AC, bersih, dan datang lengkap dengan supir. Harga
        sudah termasuk bensin, tol, dan parkir.
      </p>

      <div className="mt-4 space-y-2.5">
        {fleet.map((f, i) => (
          <div
            key={f.id}
            className="flex items-stretch overflow-hidden rounded-xl border border-gray-200"
          >
            <div className="h-24 w-40 shrink-0 bg-gray-50">
              {f.image ? (
                <Img src={f.image} className="h-full w-full object-contain p-1.5" />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center font-serif text-3xl"
                  style={{ color: `${NAVY}22` }}
                >
                  {pad2(i + 1)}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-xl leading-tight" style={{ color: NAVY }}>
                  {f.name}
                </h3>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ backgroundColor: GOLD, color: NAVY }}
                >
                  {f.capacity}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-gray-600">{f.blurb}</p>
            </div>
          </div>
        ))}
      </div>

      <PageFooter label="Armada" page={pageTag(pageNo, totalPages)} />
    </div>
  );
}

// ── Hotels & tickets menu ─────────────────────────────────────

function groupByCity(items: CatalogItem[]): { city: string; items: CatalogItem[] }[] {
  const out: { city: string; items: CatalogItem[] }[] = [];
  const map = new Map<string, { city: string; items: CatalogItem[] }>();
  for (const it of items) {
    let g = map.get(it.city);
    if (!g) {
      g = { city: it.city, items: [] };
      map.set(it.city, g);
      out.push(g);
    }
    g.items.push(it);
  }
  return out;
}

function MenuColumn({
  title,
  groups,
}: {
  title: string;
  groups: { city: string; items: CatalogItem[] }[];
}) {
  return (
    <div className="flex-1">
      <h3
        className="border-b-2 pb-2 font-serif text-2xl"
        style={{ color: NAVY, borderColor: GOLD }}
      >
        {title}
      </h3>
      <div className="mt-3 space-y-4">
        {groups.map((g) => (
          <div key={g.city}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
              {g.city}
            </p>
            <ul className="mt-1.5 space-y-1">
              {g.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-baseline gap-2 border-b border-dotted border-gray-200 py-0.5 text-[11.5px]"
                >
                  <span className="font-medium" style={{ color: NAVY }}>
                    {it.name}
                  </span>
                  <span className="flex-1" />
                  <span
                    className={`shrink-0 font-semibold ${it.price ? "tabular-nums" : "text-[10px] italic"}`}
                    style={{ color: RUST }}
                  >
                    {it.price ? formatTHB(it.price) : "Hubungi kami"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuPage({
  hotels,
  attractions,
  pageNo,
  totalPages,
}: {
  hotels: CatalogItem[];
  attractions: CatalogItem[];
  pageNo: number;
  totalPages: number;
}) {
  return (
    <div className="flex flex-1 flex-col p-10 sm:p-12">
      <RunningHead section="Hotel & Tiket" />
      <Eyebrow>Bisa Kami Paketkan</Eyebrow>
      <h2 className="mt-1 font-serif text-5xl leading-none" style={{ color: NAVY }}>
        Hotel &amp; Tiket Atraksi
      </h2>
      <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-gray-600">
        Tambahkan hotel dan tiket masuk ke paket Anda. Harga indikatif per
        malam / per orang dan dapat berubah mengikuti musim.
      </p>

      <div className="mt-6 flex gap-8">
        {hotels.length > 0 && (
          <MenuColumn title="Hotel Partner" groups={groupByCity(hotels)} />
        )}
        {attractions.length > 0 && (
          <MenuColumn title="Tiket Atraksi" groups={groupByCity(attractions)} />
        )}
      </div>

      <PageFooter label="Hotel & Tiket" page={pageTag(pageNo, totalPages)} />
    </div>
  );
}

// ── Closing ───────────────────────────────────────────────────

function ClosingPage({
  notes,
  pageNo,
  totalPages,
}: {
  notes: string;
  pageNo: number;
  totalPages: number;
}) {
  const k = KELILING_THAILAND;
  return (
    <div className="flex flex-1 flex-col p-10 sm:p-12">
      <div className="flex items-center gap-2.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5C518] shadow-sm">
          <Img src="/Logo.png" width={30} height={23} />
        </span>
        <div className="leading-tight">
          <p className="text-base font-extrabold tracking-tight">KELILING THAILAND</p>
          <p className="text-[11px] text-gray-600">{k.tagline}</p>
        </div>
      </div>

      <div className="mt-5">
        <Eyebrow>Mari Mulai</Eyebrow>
        <h2 className="mt-2 max-w-xl font-serif text-4xl leading-tight text-[#1B2A4A]">
          Rencanakan perjalanan atau company outing Anda bersama kami.
        </h2>
        <p className="mt-3 max-w-lg text-[12.5px] leading-relaxed text-gray-600">
          Satu pesan WhatsApp, sisanya kami yang urus — mobil, supir, rute, dan
          tiket. Sampai jumpa di Thailand!
        </p>
      </div>

      {/* Parting photo band — grid-stacked so it prints reliably. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {CLOSING_PHOTOS.map((g) => (
          <div
            key={g.src}
            className="h-24 overflow-hidden rounded-xl bg-gray-100"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gridTemplateRows: "minmax(0, 1fr)",
            }}
          >
            <Img
              src={g.src}
              className="object-cover"
              style={{
                gridArea: "1 / 1",
                width: "100%",
                height: "100%",
                minHeight: 0,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            />
            <span
              className="m-2.5 self-end justify-self-start rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm"
              style={{
                gridArea: "1 / 1",
                backgroundColor: GOLD,
                color: NAVY,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              {g.label}
            </span>
          </div>
        ))}
      </div>

      {/* Social proof — close on real reviews. */}
      <div className="mt-4">
        <Eyebrow>Kata Mereka</Eyebrow>
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          {TESTIMONIALS.map((tm) => (
            <figure
              key={tm.name}
              className="rounded-xl border border-gray-200 bg-gray-50/60 p-4"
              style={{ borderTopColor: GOLD, borderTopWidth: 3 }}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-2xl leading-none" style={{ color: `${RUST}B3` }}>
                  &ldquo;
                </span>
                <span className="text-[11px] tracking-[0.15em]" style={{ color: GOLD }}>
                  &#9733;&#9733;&#9733;&#9733;&#9733;
                </span>
              </div>
              <blockquote className="mt-1 text-[11px] leading-snug text-gray-700">
                {tm.text}
              </blockquote>
              <figcaption className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: NAVY }}>
                {tm.name} <span className="font-medium text-gray-400">· {tm.city}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {notes && (
        <div className="mt-4">
          <Eyebrow>Catatan &amp; Ketentuan</Eyebrow>
          <div className="mt-2 rounded-lg border-l-4 border-[#F5C518] bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-700">
            <p className="line-clamp-3 whitespace-pre-line">{notes}</p>
          </div>
        </div>
      )}

      <div className="mt-auto">
        <Eyebrow>Hubungi Tim Kami</Eyebrow>
        <div className="mt-2 grid grid-cols-[1fr_auto] items-start gap-10">
          <div className="grid min-w-0 grid-cols-1 text-xs">
            <ContactRow label="WhatsApp" value={k.whatsapp} />
            <ContactRow label="Email" value={k.email} />
            <ContactRow label="Instagram" value={k.instagram} />
            <ContactRow label="Website" value={k.website} />
            {k.contacts.map((c) => (
              <ContactRow key={c.name} label={c.name} value={c.phone} />
            ))}
          </div>
          {/* Scan-to-chat QR — straight to WhatsApp from the printed page. */}
          <div className="flex shrink-0 flex-col items-center">
            <div className="rounded-xl border border-gray-200 p-1.5">
              <Img
                src="/brochure/wa-qr.png"
                width={104}
                height={104}
                className="rounded-lg"
                style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
              />
            </div>
            <span className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: NAVY }}>
              Scan · Chat WhatsApp
            </span>
          </div>
        </div>

        {/* Brand bar — website + page tag. min-w-0 + flex-wrap so the domain
            never gets clipped/overlapped by the page tag. */}
        <div
          className="-mx-10 -mb-10 mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-10 py-4 sm:-mx-12 sm:-mb-12 sm:px-12"
          style={{ backgroundColor: NAVY }}
        >
          <span className="text-xs font-semibold tracking-wide" style={{ color: GOLD }}>
            Gampang, Aman &amp; Nyaman
          </span>
          <span className="flex shrink-0 items-center gap-3 font-mono text-[10px] tracking-[0.2em] text-white/60">
            {k.website}
            <span style={{ color: GOLD }}>{pageTag(pageNo, totalPages)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-gray-100 py-1.5">
      <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span className="font-medium text-[#1B2A4A]">{value}</span>
    </div>
  );
}
