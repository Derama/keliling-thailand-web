"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatTHB, formatIDR } from "@/lib/admin/utils";
import PrintedStamp from "@/components/admin/PrintedStamp";
import {
  KELILING_THAILAND,
  LOVE_BANGKOK,
  PERSONAL_PAYMENT,
} from "@/lib/admin/company";
import {
  INVOICE_STATUS_LABELS,
  isOperatorMode,
  invoiceTotals,
  grandTotal,
  lineCustomerTotal,
  lineOperatorTotal,
  type InvoiceMode,
  type InvoiceStatus,
  type InvoiceLine,
} from "@/lib/admin/invoice";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Gross usable height per printed sheet, in CSS px. Print sheets are height:auto
 *  (see `.invoice-page` in globals.css) so a sheet is exactly as tall as
 *  header + packed content + footer; that total must fit ONE physical page even
 *  when the browser's "Headers and footers" print option is on, which drops the
 *  A4 printable area from ~273mm to ~257mm (≈971px). 930px ≈ 246mm keeps a full
 *  sheet comfortably inside that, so no sheet ever fragments onto a blank page. */
const PAGE_CONTENT_H = 930;

/** "2026-06-18" -> "18 Jun 2026"; falls back to the raw string. */
function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso || "—";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

type Props = {
  mode: InvoiceMode;
  billTo: string;
  docTitle: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  /** THB → IDR rate; shows customer the IDR transfer amount (customer mode). */
  idrRate?: number;
  /** Customer contact lines for the "Billed to" block (customer mode). */
  custPIC?: string;
  custPhone?: string;
  custEmail?: string;
  custAddress?: string;
};

/** An orderable piece of the invoice. `repeat` blocks (the column header) are
 *  re-emitted at the top of every page that carries rows. */
type Block = { key: string; node: React.ReactNode; repeat?: boolean };

export default function BuiltInvoiceDoc(props: Props) {
  const { mode, lines } = props;
  const isOperator = isOperatorMode(mode);
  const totals = invoiceTotals(lines);
  const total = grandTotal(totals, mode);

  // Flowing blocks: parties (page 1), column header (repeats), rows, totals
  // (last page). The brand header + contact footer are running chrome — they
  // render on every page and are NOT part of this flow.
  const blocks: Block[] = [
    { key: "parties", node: <Parties {...props} isOperator={isOperator} /> },
    { key: "cols", node: <ColumnHeader isOperator={isOperator} />, repeat: true },
    ...lines.map((l) => ({
      key: `row-${l.id}`,
      node: <ItemRow line={l} isOperator={isOperator} />,
    })),
    {
      key: "totals",
      node: (
        <Totals
          {...props}
          isOperator={isOperator}
          totals={totals}
          total={total}
        />
      ),
    },
  ];

  // Measure each block, then greedily pack into A4 pages.
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Block[][]>([blocks]);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const heights = new Map<string, number>();
    root.querySelectorAll<HTMLElement>("[data-block]").forEach((el) => {
      heights.set(el.dataset.block!, el.getBoundingClientRect().height);
    });

    // Running header + footer eat into the usable height of every page.
    const headerH = heights.get("rhead") ?? 0;
    const footerH = heights.get("rfoot") ?? 0;
    const avail = PAGE_CONTENT_H - headerH - footerH;

    const colBlock = blocks.find((b) => b.repeat);
    const colH = (colBlock && heights.get(colBlock.key)) || 0;

    const out: Block[][] = [];
    let cur: Block[] = [];
    let h = 0;
    let rowsOnPage = false;

    const flush = () => {
      if (cur.length) out.push(cur);
      cur = [];
      h = 0;
      rowsOnPage = false;
    };

    for (const b of blocks) {
      const bh = heights.get(b.key) ?? 0;
      if (b.repeat) continue; // column header is injected per page, not packed

      const isRow = b.key.startsWith("row-");
      // A row needs the column header above it once per page.
      const headerCost = isRow && !rowsOnPage ? colH : 0;

      if (h > 0 && h + headerCost + bh > avail) flush();

      if (isRow && !rowsOnPage && colBlock) {
        cur.push({ ...colBlock, key: `cols-p${out.length}` });
        h += colH;
        rowsOnPage = true;
      }
      cur.push(b);
      h += bh;
    }
    flush();
    setPages(out.length ? out : [blocks]);
    // Re-measure whenever anything that affects layout changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines), mode, props.billTo, props.docTitle, props.invoiceNumber, props.date, props.dueDate, props.status, props.custPIC, props.custPhone, props.custEmail, props.custAddress]);

  return (
    <>
      {/* Hidden measuring layer at the true content width (704px = 186mm). */}
      <div ref={measureRef} className="invoice-measure" style={{ width: 704 }}>
        <div data-block="rhead">
          <RunningHeader {...props} />
        </div>
        <div data-block="rfoot">
          <RunningFooter page={1} total={1} />
        </div>
        {blocks.map((b) => (
          <div key={b.key} data-block={b.key}>
            {b.node}
          </div>
        ))}
      </div>

      {/* Visible Canva-style sheets. */}
      <div className="invoice-pages flex flex-col items-center gap-6 bg-gray-200/60 p-6 print:p-0">
        {pages.map((page, pi) => (
          <div
            key={pi}
            className="invoice-page kt-invoice-page print-doc relative shadow-md ring-1 ring-gray-200"
          >
            <div className="flex h-full flex-col text-[#1B2A4A]">
              <RunningHeader {...props} />
              {page.map((b) => (
                <div key={b.key}>{b.node}</div>
              ))}
              <RunningFooter page={pi + 1} total={pages.length} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Blocks ─────────────────────────────────────────────────────────────── */

/** Brand header — running chrome, repeats at the top of every page. */
function RunningHeader({ invoiceNumber, status }: Props) {
  const paid = status === "paid";
  return (
    <header className="flex items-start justify-between gap-6 border-b-2 border-[#F5C518] pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5C518] shadow-sm">
          <Image src="/Logo.png" alt="" width={32} height={24} priority />
        </span>
        <div className="leading-tight">
          <p className="text-base font-extrabold tracking-tight">
            KELILING THAILAND
          </p>
          <p className="text-[10px] tracking-[0.2em] text-gray-600">
            {KELILING_THAILAND.website}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xl font-light tracking-[0.35em] text-gray-300">
          INVOICE
        </p>
        <p className="mt-0.5 font-mono text-xs text-[#1B2A4A]">
          {invoiceNumber || "—"}
        </p>
        <span
          className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            paid
              ? "bg-green-100 text-green-700"
              : "bg-[#FDF3D0] text-[#9a7b00]"
          }`}
        >
          {INVOICE_STATUS_LABELS[status]}
        </span>
      </div>
    </header>
  );
}

/** Doc title, dates, and the Billed-to / From parties — page 1 only. */
function Parties({
  isOperator,
  billTo,
  docTitle,
  date,
  dueDate,
  custPIC,
  custPhone,
  custEmail,
  custAddress,
}: Props & { isOperator: boolean }) {
  return (
    <div>
      {/* meta caption + gold rule */}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
        {docTitle ? (
          <span className="font-semibold text-[#1B2A4A]">{docTitle}</span>
        ) : (
          <span />
        )}
        <span className="text-gray-700">
          Issued{" "}
          <span className="font-bold text-[#1B2A4A]">{longDate(date)}</span>
          <span className="mx-2 text-gray-300">|</span>
          Due{" "}
          <span className="font-bold text-[#1B2A4A]">{longDate(dueDate)}</span>
        </span>
      </div>
      <div className="mt-2 h-[2px] bg-gradient-to-r from-[#F5C518] via-[#F5C518]/60 to-transparent" />

      {/* Parties */}
      <div className="grid gap-x-8 gap-y-6 pt-7 text-xs leading-relaxed sm:grid-cols-2">
        <div>
          <Label>Billed to</Label>
          {isOperator ? (
            <LoveBangkokBlock name={billTo} />
          ) : (
            <CustomerBlock
              name={billTo}
              pic={custPIC}
              phone={custPhone}
              email={custEmail}
              address={custAddress}
            />
          )}
        </div>
        <div>
          <Label>From</Label>
          <KelilingBlock />
        </div>
      </div>

      <div className="pt-7" />
    </div>
  );
}

/** Column header — a 6/5-col grid that ItemRow mirrors exactly. */
function ColumnHeader({ isOperator }: { isOperator: boolean }) {
  return (
    <div
      className={`grid ${rowGrid(isOperator)} border-b-2 border-[#1B2A4A] py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-700`}
    >
      <span>Service Requested</span>
      <span className="text-center">Type</span>
      {isOperator ? (
        <>
          <span className="text-right">Base</span>
          <span className="text-right">Margin</span>
        </>
      ) : (
        <span className="text-right">Price</span>
      )}
      <span className="text-center">Qty</span>
      <span className="text-right">Total</span>
    </div>
  );
}

function ItemRow({
  line: l,
  isOperator,
}: {
  line: InvoiceLine;
  isOperator: boolean;
}) {
  return (
    <div
      className={`grid ${rowGrid(isOperator)} items-start border-b border-gray-100 py-3 text-sm tabular-nums`}
    >
      <span className="pr-2 font-medium">{l.desc || "—"}</span>
      <span className="text-center text-xs text-gray-700">
        {l.serviceType || "—"}
      </span>
      {isOperator ? (
        <>
          <span className="text-right text-gray-900">{formatTHB(l.capital)}</span>
          <span className="text-right text-gray-900">{formatTHB(l.margin)}</span>
        </>
      ) : (
        <span className="text-right text-gray-900">{formatTHB(l.sell)}</span>
      )}
      <span className="text-center text-gray-900">{l.qty}</span>
      <span className="text-right font-semibold">
        {formatTHB(isOperator ? lineOperatorTotal(l) : lineCustomerTotal(l))}
      </span>
    </div>
  );
}

function rowGrid(isOperator: boolean) {
  return isOperator
    ? "grid-cols-[1fr_56px_72px_72px_40px_84px] gap-x-2"
    : "grid-cols-[1fr_56px_84px_40px_84px] gap-x-2";
}

/** Totals + payment block — last page only (flows after the final row). */
function Totals({
  mode,
  isOperator,
  totals,
  total,
  idrRate,
}: Props & {
  isOperator: boolean;
  totals: ReturnType<typeof invoiceTotals>;
  total: number;
}) {
  const showIdr = mode === "customer" && !!idrRate && idrRate > 0;
  return (
    <div>
      {/* Totals */}
      <div className="flex justify-end pt-4">
        <div className="w-56 space-y-1 text-sm">
          {isOperator && (
            <>
              <TotalRow label="Modal" value={formatTHB(totals.capitalTotal)} />
              <TotalRow label="Margin" value={formatTHB(totals.marginTotal)} />
            </>
          )}
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg bg-[#1B2A4A] px-3.5 py-2 text-white">
            <span className="text-xs font-medium">Grand Total</span>
            <span className="text-sm font-extrabold text-[#F5C518]">
              {formatTHB(total)}
              <span className="ml-0.5 text-[10px] font-semibold text-[#F5C518]/70">
                THB
              </span>
            </span>
          </div>
          {showIdr && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#F5C518]/60 bg-[#FDF8E6] px-3.5 py-2">
              <span className="text-[11px] font-medium text-gray-600">
                Transfer (IDR)
              </span>
              <span className="text-sm font-extrabold tabular-nums text-[#1B2A4A]">
                {formatIDR(total * idrRate!)}
              </span>
            </div>
          )}
          {showIdr && (
            <p className="px-1 text-right text-[9px] text-gray-400">
              Kurs 1 THB = {formatIDR(idrRate!)}
            </p>
          )}
        </div>
      </div>

      {/* Payment + note */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="rounded-lg bg-gray-50 px-4 py-2.5 text-xs">
          <Label>Payment transfer to</Label>
          {mode === "operator" ? (
            <p className="text-gray-900">
              <span className="font-semibold">{LOVE_BANGKOK.bank.bank}</span> ·{" "}
              {LOVE_BANGKOK.bank.account} — {LOVE_BANGKOK.bank.holder}
            </p>
          ) : mode === "personal" ? (
            <p className="text-gray-900">
              <span className="font-semibold">{PERSONAL_PAYMENT.bank}</span> ·{" "}
              {PERSONAL_PAYMENT.account} — {PERSONAL_PAYMENT.holder}
            </p>
          ) : (
            <p className="text-gray-900">
              <span className="font-semibold">Bank Central Asia (BCA)</span> ·
              1250836216 — Deva Adithya Rama
            </p>
          )}
        </div>
        <p className="text-xs italic text-gray-700">
          Thank you for choosing Keliling Thailand.
          <br />
          We look forward to serving you again!
        </p>
      </div>
    </div>
  );
}

/** Contact strip + page number — running chrome, pinned to the bottom of
 *  every page via mt-auto. */
function RunningFooter({ page, total }: { page: number; total: number }) {
  return (
    <footer className="mt-auto border-t-2 border-[#F5C518] pt-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Contact icon={<WhatsAppIcon />} value={KELILING_THAILAND.whatsapp} />
        <Contact icon={<MailIcon />} value={KELILING_THAILAND.email} />
        <Contact icon={<InstagramIcon />} value={KELILING_THAILAND.instagram} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
        <PrintedStamp />
        {total > 1 ? <span>Page {page} of {total}</span> : <span />}
      </div>
    </footer>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-700">
      {children}
    </p>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-1 text-gray-700">
      <span>{label}</span>
      <span className="tabular-nums text-gray-700">{value}</span>
    </div>
  );
}

function LoveBangkokBlock({ name }: { name?: string }) {
  const b = LOVE_BANGKOK;
  return (
    <div className="space-y-0.5 text-gray-900">
      <p className="text-sm font-bold text-[#1B2A4A]">{name?.trim() || b.name}</p>
      <p>{b.role}</p>
      <p>{b.address}</p>
      <p>
        WA {b.whatsapp} ({b.whatsappName})
      </p>
    </div>
  );
}

function CustomerBlock({
  name,
  pic,
  phone,
  email,
  address,
}: {
  name: string;
  pic?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  return (
    <div className="space-y-0.5 text-gray-900">
      <p className="text-sm font-bold text-[#1B2A4A]">{name || "—"}</p>
      <p>Customer</p>
      {pic?.trim() && <p>{pic}</p>}
      {address?.trim() && <p>{address}</p>}
      {phone?.trim() && <p>WA {phone}</p>}
      {email?.trim() && <p>{email}</p>}
    </div>
  );
}

function KelilingBlock() {
  const k = KELILING_THAILAND;
  return (
    <div className="space-y-0.5 text-gray-900">
      <p className="text-sm font-bold text-[#1B2A4A]">{k.name}</p>
      <p>{k.role}</p>
      <p>{k.location}</p>
      <p>{k.email}</p>
      {k.contacts.map((c) => (
        <p key={c.name}>
          {c.phone} ({c.name})
        </p>
      ))}
    </div>
  );
}

function Contact({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-900">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B2A4A] text-[#F5C518]">
        {icon}
      </span>
      <span>{value}</span>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1-1.4-1-2.6 0-1.3.6-1.9.9-2.1.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.5c-.1.2-.3.3-.1.6.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4 0 .5-.1l.7-.8c.2-.2.4-.2.6-.1l1.7.8c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
