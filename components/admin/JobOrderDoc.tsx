"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  LOVE_BANGKOK,
  passengerRowCount,
  type JobOrderData,
} from "@/lib/admin/jobOrder";
import PrintedStamp from "@/components/admin/PrintedStamp";

// Love Bangkok brand colors (royal blue + red), matching their letterhead.
// The builder chrome stays Keliling navy/gold; the printed doc keeps Love
// Bangkok's identity since they are the licensed operator who issues it.
const NAVY = "#1C2E73";
const RED = "#E2231A";

/** Usable content height per packed page, in px. The printed sheet is fixed to
 *  272mm (≈1028px) and clipped (see `.invoice-page` in globals.css). Packing to
 *  the full 1028px left no slack, so when Chrome's "Save as PDF" reserves its
 *  top/bottom sliver (e.g. "Headers and footers" on) a near-full sheet overflows
 *  the printable area and the browser hard-splits it into a trailing blank page.
 *  Match BuiltInvoiceDoc's headroom: A4 (1123) − 2×45 screen padding − 40 buffer
 *  = 993px. The 40px buffer is the documented anti-phantom-page slack; Head/Tail
 *  are ordinary flow blocks so they are already counted in this budget. */
/** Gross usable height per printed sheet, in CSS px. Print sheets are height:auto
 *  (see `.invoice-page` in globals.css) so a sheet is exactly as tall as
 *  header + packed content + footer; that total must fit ONE physical page.
 *  Job Order prints with @page margin:0 (see printJobOrder), so Chrome can't add
 *  its own "Headers and footers" — no need to reserve space for them. The sheet's
 *  own 12mm padding (`.kt-joborder-page`) is the inset, leaving a 273mm content
 *  box (A4 1123px − 2×45px ≈ 1033px). 1015px keeps an ~18px hairline under that.
 *  A lower budget (e.g. the old 930) was reserving room for browser chrome that
 *  can no longer appear, which pushed a short trailing block (Signatures) onto a
 *  near-empty second page. height:auto + break-inside:avoid make phantom pages
 *  structurally impossible, so this headroom is safe. */
const PAGE_CONTENT_H = 1015;
/** True content width of an A4 sheet (794 − 2×45). Measure at this width. */
const CONTENT_W = 704;

/** A packable piece of the doc. `headerOf` blocks are re-emitted at the top of
 *  every page their group's rows continue onto; `group` blocks are those rows. */
type Block = {
  key: string;
  node: React.ReactNode;
  headerOf?: string;
  group?: string;
};

/** Plain <img> that falls back to a neutral bordered box if the file is missing. */
function AssetImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`grid place-items-center rounded border border-dashed border-white/50 text-[9px] text-white/70 ${className ?? ""}`}
      >
        {alt}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user-supplied asset with onError fallback
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function JobOrderDoc(data: JobOrderData) {
  const paxRows = passengerRowCount(data.totalPax);

  // Flowing blocks: meta + info grid (page 1), itinerary, passengers, then the
  // signatures. The brand banner (top) and contact footer (bottom) are running
  // chrome — they render on EVERY page and are NOT part of this flow.
  const blocks: Block[] = [
    { key: "meta", node: <Meta data={data} /> },
    { key: "info", node: <InfoGrid data={data} /> },
    { key: "itin-h", headerOf: "itin", node: <ItinHeader /> },
    ...data.days.map((d, i) => ({
      key: `itin-${d.id}`,
      group: "itin",
      node: <ItinRow d={d} alt={i % 2 === 1} />,
    })),
    ...(data.showPassengers
      ? [
          { key: "pax-h", headerOf: "pax", node: <PaxHeader /> },
          ...Array.from({ length: paxRows }, (_, i) => ({
            key: `pax-${i}`,
            group: "pax",
            node: <PaxRow n={i + 1} alt={i % 2 === 1} />,
          })),
        ]
      : []),
    { key: "sign", node: <Signatures /> },
  ];

  // Measure every block, then greedily pack into A4 pages.
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Block[][]>([blocks]);
  const daysKey = JSON.stringify(data.days);
  const hotelsKey = JSON.stringify(data.hotels);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const heights = new Map<string, number>();
    root.querySelectorAll<HTMLElement>("[data-block]").forEach((el) => {
      heights.set(el.dataset.block!, el.getBoundingClientRect().height);
    });

    // Running banner + footer eat into the usable height of every page, so the
    // flowing content has to fit in what's left.
    const headerH = heights.get("rhead") ?? 0;
    const footerH = heights.get("rfoot") ?? 0;
    const avail = PAGE_CONTENT_H - headerH - footerH;

    const headers: Record<string, Block> = {};
    for (const b of blocks) if (b.headerOf) headers[b.headerOf] = b;

    const out: Block[][] = [];
    let cur: Block[] = [];
    let h = 0;
    let active: string | null = null; // group whose header is live on this page

    const flush = () => {
      if (cur.length) out.push(cur);
      cur = [];
      h = 0;
      active = null;
    };

    for (const b of blocks) {
      if (b.headerOf) continue; // headers are injected on demand, not packed
      const bh = heights.get(b.key) ?? 0;

      if (b.group) {
        const hdr = headers[b.group];
        const hdrH = heights.get(hdr.key) ?? 0;
        const headerCost = active !== b.group ? hdrH : 0;
        if (h > 0 && h + headerCost + bh > avail) flush();
        if (active !== b.group) {
          cur.push({ ...hdr, key: `${hdr.key}-p${out.length}` });
          h += hdrH;
          active = b.group;
        }
        cur.push(b);
        h += bh;
      } else {
        if (h > 0 && h + bh > avail) flush();
        cur.push(b);
        h += bh;
        active = null;
      }
    }
    flush();
    setPages(out.length ? out : [blocks]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    daysKey,
    data.totalPax,
    data.showPassengers,
    data.jobOrderNo,
    data.date,
    data.travelAgent,
    data.guideName,
    data.idCard,
    data.carRegister,
    data.phone,
    data.emergencyContact,
    data.licenseNo,
    data.urgentCall,
    data.arrival,
    data.departure,
    data.bedType,
    hotelsKey,
  ]);

  return (
    <>
      {/* Hidden measuring layer at the true content width (704px = 186mm). */}
      <div ref={measureRef} className="invoice-measure" style={{ width: CONTENT_W }}>
        <div data-block="rhead">
          <BrandHeader />
        </div>
        <div data-block="rfoot">
          <ContactFooter />
        </div>
        {blocks.map((b) => (
          <div key={b.key} data-block={b.key}>
            {b.node}
          </div>
        ))}
      </div>

      {/* Visible Canva-style A4 sheets — banner + footer repeat on every sheet. */}
      <div className="invoice-pages flex flex-col items-center gap-6 bg-gray-200/60 p-6 print:p-0">
        {pages.map((page, pi) => (
          <div
            key={pi}
            className="invoice-page kt-joborder-page print-doc relative shadow-md ring-1 ring-gray-200"
          >
            <div className="flex h-full flex-col text-[#1C2E73]">
              <BrandHeader />
              {page.map((b) => (
                <div key={b.key}>{b.node}</div>
              ))}
              <ContactFooter />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── BrandHeader: running banner, repeats at the top of every page ───────── */

function BrandHeader() {
  return (
    <header
      className="flex items-center justify-between gap-4 rounded-xl px-5 py-4 text-white shadow-sm"
      style={{
        background: `linear-gradient(100deg, ${NAVY} 0%, ${NAVY} 55%, ${RED} 100%)`,
      }}
    >
      <div className="flex items-center gap-3">
        <AssetImg
          src={LOVE_BANGKOK.logo}
          alt="Love Bangkok"
          className="h-14 w-14 shrink-0 rounded-full bg-white object-contain p-1"
        />
        <div className="leading-tight">
          <p className="text-base font-extrabold tracking-wide">{LOVE_BANGKOK.name}</p>
          <p className="text-[11px] text-white/85">{LOVE_BANGKOK.email}</p>
        </div>
      </div>
      <div className="text-right">
        <h1 className="text-xl font-extrabold leading-tight tracking-wide sm:text-2xl">
          ใบสั่งงานมัคคุเทศก์
        </h1>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/80">
          Guide Job Order
        </p>
      </div>
    </header>
  );
}

/* ── Meta: job-order no + date + rule — page 1 only (flows) ──────────────── */

function Meta({ data }: { data: JobOrderData }) {
  return (
    <div className="pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 text-sm">
        <div>
          <span className="text-[11px] uppercase tracking-wide text-gray-500">
            Job Order No. / เลขที่
          </span>
          <span className="ml-2 font-bold text-[#1C2E73]">
            {data.jobOrderNo || "—"}
          </span>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wide text-gray-500">
            Date / วันที่
          </span>
          <span className="ml-2 font-bold text-[#1C2E73]">{data.date || "—"}</span>
        </div>
      </div>
      <div
        className="mt-2 h-[2px] rounded-full"
        style={{ background: `linear-gradient(90deg, ${NAVY}, ${RED} 70%, transparent)` }}
      />
    </div>
  );
}

/* ── InfoGrid: bilingual info grid — page 1 only (flows) ─────────────────── */

function InfoGrid({ data }: { data: JobOrderData }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-gray-200 ring-1 ring-gray-200">
      <InfoCell thai="ชื่อบริษัทนำเที่ยว" en="Travel Agent" value={data.travelAgent} />
      <InfoCell thai="ผู้ติดต่อฉุกเฉิน" en="Emergency Contact" value={data.emergencyContact} />
      <InfoCell thai="ชื่อมัคคุเทศก์" en="Guide Name" value={data.guideName} />
      <InfoCell thai="ใบอนุญาตเลขที่" en="License No." value={data.licenseNo} />
      <InfoCell thai="หมายเลขบัตรประชาชน" en="ID Card Number" value={data.idCard} />
      <InfoCell thai="โทรศัพท์" en="Phone Number" value={data.phone} />
      <InfoCell thai="ป้ายรถทะเบียน" en="Car Register" value={data.carRegister} />
      <InfoCell thai="หมายเลขโทรศัพท์ด่วน" en="Urgent Call" value={data.urgentCall} />
      <InfoCell thai="เวลาเดินทางถึงประเทศไทย" en="Waktu Kedatangan" value={data.arrival} />
      <InfoCell thai="เวลาเดินทางกลับจากประเทศไทย" en="Waktu Kepulangan" value={data.departure} />
      <InfoCell thai="จำนวนผู้เข้าพัก" en="Total Pax" value={data.totalPax} />
      <InfoCell thai="ประเภทเตียง" en="Bed Type" value={data.bedType} />
      {data.hotels.map((h) => (
        <InfoCell
          key={h.id}
          thai="โรงแรม / Hotel"
          en={h.city || "—"}
          value={h.name}
        />
      ))}
      {data.hotels.length % 2 === 1 && <div className="bg-white" />}
    </div>
  );
}

/** One labelled cell in the info grid: Thai label, English/ID label, value. */
function InfoCell({
  thai,
  en,
  value,
}: {
  thai: string;
  en: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0 bg-white px-3 py-1.5">
      <span className="text-[10px] leading-tight text-gray-400">{thai}</span>
      <span className="text-[11px] font-semibold leading-tight text-[#1C2E73]">
        {en}
      </span>
      <span className="min-h-[0.9rem] text-[12px] font-bold leading-tight text-gray-900">
        {value || " "}
      </span>
    </div>
  );
}

/* ── Itinerary table (grid rows) ─────────────────────────────────────────── */

const ITIN_GRID = "grid grid-cols-[70px_1fr_58px_58px_58px]";

function SectionLabel({ thai, en }: { thai: string; en: string }) {
  return (
    <div className="mb-1.5 flex items-baseline gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1C2E73]">
        {en}
      </span>
      <span className="text-[10px] text-gray-400">{thai}</span>
    </div>
  );
}

function ItinHeader() {
  return (
    <div className="pt-3">
      <SectionLabel en="Itinerary" thai="รายการนำเที่ยว" />
      <div
        className={`${ITIN_GRID} border-t border-l border-gray-200 text-[10px] font-semibold uppercase tracking-wide text-[#1C2E73]`}
        style={{ backgroundColor: "#EEF2FA" }}
      >
        <HCell>Date</HCell>
        <HCell className="text-left">Itinerary</HCell>
        <HCell>Lunch</HCell>
        <HCell>Dinner</HCell>
        <HCell>Hotel</HCell>
      </div>
    </div>
  );
}

function ItinRow({ d, alt }: { d: JobOrderData["days"][number]; alt: boolean }) {
  return (
    <div className={`${ITIN_GRID} border-l border-gray-200 text-[12px] ${alt ? "bg-gray-50/60" : "bg-white"}`}>
      <Cell className="text-center font-semibold text-[#1C2E73]">{d.date || " "}</Cell>
      <Cell className="text-left">{d.itinerary || " "}</Cell>
      <Cell className="text-center">{d.lunch || " "}</Cell>
      <Cell className="text-center">{d.dinner || " "}</Cell>
      <Cell className="text-center">{d.hotel || " "}</Cell>
    </div>
  );
}

/* ── Passenger table (grid rows, blank for handwriting) ──────────────────── */

const PAX_GRID = "grid grid-cols-[44px_1.4fr_1fr_92px_1fr]";

function PaxHeader() {
  return (
    <div className="pt-3">
      <SectionLabel en="Passengers" thai="ผู้โดยสาร" />
      <div
        className={`${PAX_GRID} border-t border-l border-gray-200 text-[10px] font-semibold uppercase tracking-wide text-[#1C2E73]`}
        style={{ backgroundColor: "#EEF2FA" }}
      >
        <HCell>No.</HCell>
        <HCell className="text-left">Name</HCell>
        <HCell className="text-left">Passport</HCell>
        <HCell>Nationality</HCell>
        <HCell className="text-left">Remark</HCell>
      </div>
    </div>
  );
}

function PaxRow({ n, alt }: { n: number; alt: boolean }) {
  return (
    <div className={`${PAX_GRID} min-h-[1.6rem] border-l border-gray-200 text-[12px] ${alt ? "bg-gray-50/60" : "bg-white"}`}>
      <Cell className="text-center font-semibold text-gray-400">{n}</Cell>
      <Cell>{" "}</Cell>
      <Cell>{" "}</Cell>
      <Cell>{" "}</Cell>
      <Cell>{" "}</Cell>
    </div>
  );
}

function HCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`border-b border-r border-gray-200 px-2 py-1.5 text-center ${className}`}>
      {children}
    </span>
  );
}

function Cell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`flex items-center border-b border-r border-gray-200 px-2 py-1.5 ${className}`}>
      {children}
    </span>
  );
}

/* ── Signatures: three sign/seal columns — last page only (flows) ────────── */

function Signatures() {
  return (
    <div className="grid grid-cols-3 gap-6 pt-8">
      <SignBox thai="มัคคุเทศก์ลงนาม" en="Guide's Signature" />
      <SignBox thai="ผู้มีอำนาจลงนาม" en="Authorized Signature" />
      <SignBox
        thai="ประทับตราบริษัท"
        en="Company's Seal"
        seal={LOVE_BANGKOK.seal}
      />
    </div>
  );
}

/* ── ContactFooter: running banner + printed stamp, pinned to the bottom of
 *  every page via mt-auto. Repeats on every sheet. ───────────────────────── */

function ContactFooter() {
  return (
    <div className="mt-auto pt-4">
      <footer
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-xl px-5 py-3 text-[12px] text-white shadow-sm"
        style={{
          background: `linear-gradient(100deg, ${RED} 0%, ${NAVY} 45%, ${NAVY} 100%)`,
        }}
      >
        <span className="font-bold tracking-wide">{LOVE_BANGKOK.footerPhone}</span>
        <span className="text-white/90">{LOVE_BANGKOK.email}</span>
        <span className="text-white/80">{LOVE_BANGKOK.address}</span>
      </footer>
      <PrintedStamp className="mt-1.5 block text-right text-[10px] text-gray-400" />
    </div>
  );
}

function SignBox({
  thai,
  en,
  seal,
}: {
  thai: string;
  en: string;
  seal?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Sign / seal space — uniform height so all three columns line up. */}
      <div className="flex h-24 w-full items-end justify-center">
        {seal && (
          <AssetImg
            src={seal}
            alt="Company Seal"
            className="max-h-24 max-w-[88px] object-contain"
          />
        )}
      </div>
      <div className="w-full border-t border-dotted border-gray-400 pt-1.5">
        <p className="text-[12px] font-semibold text-[#1C2E73]">{en}</p>
        <p className="text-[10px] text-gray-400">{thai}</p>
      </div>
    </div>
  );
}
