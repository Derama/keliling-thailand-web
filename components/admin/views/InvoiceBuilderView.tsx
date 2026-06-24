"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnSecondaryCls } from "@/components/admin/ui";
import { formatTHB, formatIDR, isoLocal } from "@/lib/admin/utils";
import BuiltInvoiceDoc from "@/components/admin/BuiltInvoiceDoc";
import { loadOrderDoc, saveOrderDoc } from "@/lib/admin/orderDocs";
import CatalogPicker from "@/components/admin/invoice/CatalogPicker";
import { useCatalog, type CatalogItem } from "@/components/admin/invoice/useCatalog";
import {
  OPERATOR_MARGIN,
  INVOICE_STATUS_LABELS,
  invoiceTotals,
  lineCustomerTotal,
  lineOperatorTotal,
  type InvoiceMode,
  type InvoiceStatus,
  type InvoiceLine,
} from "@/lib/admin/invoice";

function newId() {
  return crypto.randomUUID();
}

/** Fisher–Yates copy — used to draw varied catalog rows. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** YYYY-MM-DD + n days, local time. */
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}

interface InvoiceDraft {
  mode: InvoiceMode;
  docTitle: string;
  billTo: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  custPIC: string;
  custPhone: string;
  custEmail: string;
  custAddress: string;
  idrRate: number;
}

export default function InvoiceBuilderView({
  orderId,
}: {
  /** When set, the invoice loads from / saves to this order. */
  orderId?: string;
} = {}) {
  const { sections, loading } = useCatalog();

  const [mode, setMode] = useState<InvoiceMode>("operator");
  const [docTitle, setDocTitle] = useState("Hotel + Transport");
  const [billTo, setBillTo] = useState("Love Bangkok.Co.Ltd");
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${new Date().getFullYear()}-0001`
  );
  const [date, setDate] = useState(isoLocal());
  const [dueDate, setDueDate] = useState(addDays(isoLocal(), 1));
  const [status, setStatus] = useState<InvoiceStatus>("awaiting");
  const [lines, setLines] = useState<InvoiceLine[]>([]);

  // Customer contact — shown in the "Billed to" block on customer invoices.
  const [custPIC, setCustPIC] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custAddress, setCustAddress] = useState("");

  // Personal generator — type a rough target, get a multi-row invoice built
  // from random catalog items whose total drifts 0–10% up. Personal use only.
  const [aiTarget, setAiTarget] = useState(0);
  const [aiErr, setAiErr] = useState("");

  // THB → IDR rate for the customer converter. Seeded with a sane fallback,
  // refreshed once from a free no-key FX API. Always editable by hand.
  const [idrRate, setIdrRate] = useState(450);
  const [rateNote, setRateNote] = useState("Kurs manual");

  useEffect(() => {
    let on = true;
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d) => {
        const rate = d?.rate;
        if (on && typeof rate === "number" && rate > 0) {
          setIdrRate(Math.round(rate));
          setRateNote("Kurs live");
        }
      })
      .catch(() => on && setRateNote("Kurs manual (API gagal)"));
    return () => {
      on = false;
    };
  }, []);

  const hydrated = useRef(false);

  function applyDraft(d: InvoiceDraft) {
    setMode(d.mode ?? "operator");
    setDocTitle(d.docTitle ?? "");
    setBillTo(d.billTo ?? "");
    setInvoiceNumber(d.invoiceNumber ?? "");
    setDate(d.date ?? isoLocal());
    setDueDate(d.dueDate ?? addDays(isoLocal(), 1));
    setStatus(d.status ?? "awaiting");
    setLines(Array.isArray(d.lines) ? d.lines : []);
    setCustPIC(d.custPIC ?? "");
    setCustPhone(d.custPhone ?? "");
    setCustEmail(d.custEmail ?? "");
    setCustAddress(d.custAddress ?? "");
    if (typeof d.idrRate === "number") setIdrRate(d.idrRate);
  }

  // Per-order: load saved invoice, else seed billing from the order's customer.
  useEffect(() => {
    if (!orderId) {
      hydrated.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      const saved = await loadOrderDoc<InvoiceDraft>(orderId, "invoice");
      if (cancelled) return;
      if (saved) {
        applyDraft(saved);
      } else {
        const { data: o } = await createClient()
          .from("orders")
          .select("*, customers(*)")
          .eq("id", orderId)
          .single();
        if (!cancelled && o) {
          setMode("customer");
          setBillTo(o.customers?.name ?? "");
          setCustPIC(o.customers?.name ?? "");
          setCustPhone(o.customers?.phone ?? "");
          if (o.trip_start) setDate(o.trip_start);
        }
      }
      if (!cancelled) hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const isOperator = mode !== "customer";
  const totals = invoiceTotals(lines);

  const draft: InvoiceDraft = {
    mode,
    docTitle,
    billTo,
    invoiceNumber,
    date,
    dueDate,
    status,
    lines,
    custPIC,
    custPhone,
    custEmail,
    custAddress,
    idrRate,
  };

  // Autosave to the order (debounced) once hydrated.
  useEffect(() => {
    if (!orderId || !hydrated.current) return;
    const t = setTimeout(() => {
      saveOrderDoc(orderId, "invoice", draft);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, JSON.stringify(draft)]);

  function printInvoice() {
    const prev = document.title;
    document.title = `${invoiceNumber} - ${date}`;
    const restore = () => {
      document.title = prev;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  function switchMode(next: InvoiceMode) {
    setMode(next);
    if (next !== "customer" && !billTo.trim()) setBillTo("Love Bangkok.Co.Ltd");
    if (next === "customer" && billTo === "Love Bangkok.Co.Ltd") setBillTo("");
  }

  function addFromCatalog(item: CatalogItem) {
    setLines((arr) => [
      ...arr,
      {
        id: newId(),
        desc: item.label,
        qty: 1,
        capital: item.capital,
        sell: item.sell,
        margin: OPERATOR_MARGIN,
        serviceType: item.serviceType,
        unit: item.unit,
      },
    ]);
  }

  function generatePersonal() {
    if (!aiTarget) return;
    const all = sections.flatMap((s) => s.items).filter((it) => it.sell > 0);
    if (!all.length) {
      setAiErr("Katalog kosong / belum termuat.");
      return;
    }
    setAiErr("");

    const T = aiTarget;
    const hi = Math.round((T * 1.1) / 100) * 100; // land in [T, +10%], upward
    // Skip items pricier than the target so one unit can't blow past it.
    const usePool = all.filter((it) => it.sell <= T);
    const pool = usePool.length ? usePool : all;

    // Few distinct rows (fits ≤ 2 pages); quantity does the work, not row count.
    const rowCount = Math.min(pool.length, 9 + Math.floor(Math.random() * 5)); // 9–13
    const items = shuffle(pool).slice(0, rowCount);

    // Seed each row with a quantity near the per-row share, then nudge to target.
    const avg = T / rowCount;
    const qty = items.map((it) =>
      Math.min(20, Math.max(1, Math.round(avg / it.sell)))
    );
    let sum = items.reduce((s, it, i) => s + it.sell * qty[i], 0);

    let guard = 0;
    while (sum > hi && guard++ < 5000) {
      const cand = items.map((_, i) => i).filter((i) => qty[i] > 1);
      if (!cand.length) break;
      const i = cand[Math.floor(Math.random() * cand.length)];
      qty[i]--;
      sum -= items[i].sell;
    }
    while (sum < T && guard++ < 5000) {
      const fit = items
        .map((_, i) => i)
        .filter((i) => qty[i] < 20 && items[i].sell <= hi - sum);
      if (fit.length) {
        const i = fit[Math.floor(Math.random() * fit.length)];
        qty[i]++;
        sum += items[i].sell;
      } else {
        // Nothing fits cleanly — bump the cheapest row, accept slight overshoot.
        const i = items.reduce(
          (b, it, idx) => (it.sell < items[b].sell ? idx : b),
          0
        );
        qty[i]++;
        sum += items[i].sell;
        break;
      }
    }

    setLines(
      items.map((it, i) => ({
        id: newId(),
        desc: it.label,
        qty: qty[i],
        capital: it.capital,
        sell: it.sell,
        margin: Math.max(0, it.sell - it.capital), // actual catalog margin
        serviceType: it.serviceType || "",
        unit: it.unit,
      }))
    );
  }

  function addBlank() {
    setLines((arr) => [
      ...arr,
      {
        id: newId(),
        desc: "",
        qty: 1,
        capital: 0,
        sell: 0,
        margin: OPERATOR_MARGIN,
        serviceType: "",
      },
    ]);
  }

  function setLine(id: string, patch: Partial<InvoiceLine>) {
    setLines((arr) => arr.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((arr) => arr.filter((l) => l.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    setLines((arr) => {
      const i = arr.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Invoice</h1>
          <p className="text-sm text-gray-500">
            Tambah item dari katalog atau manual, lalu Print / Simpan PDF dari
            preview. Semua THB.
          </p>
        </div>
        <button
          type="button"
          onClick={printInvoice}
          disabled={lines.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#1B2A4A] hover:brightness-95 disabled:opacity-50"
        >
          Print / Simpan PDF
        </button>
      </div>

      <div className="grid items-start gap-6 min-[1280px]:grid-cols-[minmax(380px,1fr)_minmax(0,820px)] print:block">
        {/* ── Editor ── */}
        <div className="no-print space-y-5">
          {/* Mode segmented control */}
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {(
              [
                ["customer", "Customer"],
                ["operator", "Tour Operator"],
                ["personal", "Personal"],
              ] as [InvoiceMode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  mode === m
                    ? "bg-[#F5C518] text-[#1B2A4A] shadow-sm"
                    : "text-gray-500 hover:text-[#1B2A4A]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Detail card */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <SectionTitle>Detail invoice</SectionTitle>
            <div className="grid gap-x-3 gap-y-3 min-[520px]:grid-cols-2 [&>label>span]:min-h-[2.5rem]">
            <Field label="Judul dokumen">
              <input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className={`${inputCls} h-10`}
                placeholder="Hotel + Transport"
              />
            </Field>
            <Field label={isOperator ? "Partner" : "Customer"}>
              <input
                value={billTo}
                onChange={(e) => setBillTo(e.target.value)}
                className={`${inputCls} h-10`}
                placeholder={isOperator ? "Love Bangkok.Co.Ltd" : "Nama customer"}
              />
            </Field>
            {!isOperator && (
              <>
                <Field label="Nama kontak">
                  <input
                    value={custPIC}
                    onChange={(e) => setCustPIC(e.target.value)}
                    className={`${inputCls} h-10`}
                    placeholder="Nama kontak"
                  />
                </Field>
                <Field label="Telepon customer">
                  <input
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className={`${inputCls} h-10`}
                    placeholder="+62…"
                  />
                </Field>
                <Field label="Email customer">
                  <input
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className={`${inputCls} h-10`}
                    placeholder="nama@email.com"
                  />
                </Field>
                <Field label="Alamat customer">
                  <input
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    className={`${inputCls} h-10`}
                    placeholder="Kota / alamat"
                  />
                </Field>
              </>
            )}
            <Field label="No. Invoice">
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={`${inputCls} h-10`}
              />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className={`${inputCls} h-10`}
              >
                {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {INVOICE_STATUS_LABELS[s]}
                    </option>
                  )
                )}
              </select>
            </Field>
            <Field label="Tanggal">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} h-10`}
              />
            </Field>
            <Field label="Jatuh tempo">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`${inputCls} h-10`}
              />
            </Field>
            </div>
          </section>

          {/* Generator — personal only */}
          {mode === "personal" && (
            <section className="space-y-3 rounded-xl border border-[#F5C518]/60 bg-[#FDF8E6] p-5">
              <SectionTitle>Generate invoice (personal)</SectionTitle>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Target nominal (THB)">
                  <input
                    type="number"
                    min={0}
                    value={aiTarget || ""}
                    onChange={(e) => setAiTarget(Number(e.target.value) || 0)}
                    className={`${inputCls} h-10 w-48`}
                    placeholder="500000"
                  />
                </Field>
                <button
                  type="button"
                  onClick={generatePersonal}
                  disabled={!aiTarget || loading}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1B2A4A] px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? "Memuat katalog…" : "Generate"}
                </button>
              </div>
              {aiErr && <p className="text-xs text-red-600">{aiErr}</p>}
              <p className="text-xs text-gray-500">
                Ambil ±9–13 item acak dari katalog (modal & margin asli), lalu atur
                quantity sampai total naik 0–10% dari target (cth 500.000 →
                510.000–550.000). Maks 2 halaman. Tekan ulang untuk acak baru.
              </p>
            </section>
          )}

          {/* Currency converter — customer only */}
          {!isOperator && (
            <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
              <SectionTitle>Konversi ke IDR</SectionTitle>
              <div className="grid gap-3 min-[520px]:grid-cols-2">
                <Field label="Kurs 1 THB = … IDR">
                  <input
                    type="number"
                    min={0}
                    value={idrRate || ""}
                    onChange={(e) => setIdrRate(Number(e.target.value) || 0)}
                    className={`${inputCls} h-10`}
                  />
                </Field>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <span className="block text-[11px] font-medium text-gray-500">
                    Customer transfer
                  </span>
                  <span className="text-lg font-bold tabular-nums text-[#1B2A4A]">
                    {formatIDR(totals.customerTotal * idrRate)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {rateNote}. {formatTHB(totals.customerTotal)} × {idrRate} kurs.
                Kurs bisa diubah manual.
              </p>
            </section>
          )}

          {/* Items card */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>
                Item{lines.length > 0 ? ` (${lines.length})` : ""}
              </SectionTitle>
              <div className="flex items-center gap-2">
                <CatalogPicker
                  sections={sections}
                  loading={loading}
                  mode={mode}
                  onPick={addFromCatalog}
                />
                <button
                  type="button"
                  onClick={addBlank}
                  className={`${btnSecondaryCls} whitespace-nowrap`}
                >
                  + Manual
                </button>
              </div>
            </div>

          {/* Line editor */}
          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm font-medium text-gray-500">Belum ada item</p>
              <p className="mt-1 text-xs text-gray-400">
                Tambah dari katalog harga, atau buat baris manual.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((l, i) => {
                const lineTotal = isOperator
                  ? lineOperatorTotal(l)
                  : lineCustomerTotal(l);
                return (
                  <div
                    key={l.id}
                    className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-3"
                  >
                    {/* Row: index · description · controls */}
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1B2A4A]/5 text-xs font-bold text-[#1B2A4A]">
                        {i + 1}
                      </span>
                      <input
                        value={l.desc}
                        onChange={(e) => setLine(l.id, { desc: e.target.value })}
                        className={`${inputCls} h-10 min-w-0 flex-1`}
                        placeholder="Deskripsi item"
                      />
                      <button
                        type="button"
                        onClick={() => move(l.id, -1)}
                        disabled={i === 0}
                        className="shrink-0 px-0.5 text-gray-400 hover:text-[#1B2A4A] disabled:opacity-25"
                        aria-label="Naikkan"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => move(l.id, 1)}
                        disabled={i === lines.length - 1}
                        className="shrink-0 px-0.5 text-gray-400 hover:text-[#1B2A4A] disabled:opacity-25"
                        aria-label="Turunkan"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(l.id)}
                        className="shrink-0 px-0.5 text-red-400 hover:text-red-600"
                        aria-label="Hapus baris"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Numeric fields */}
                    <div
                      className={`grid gap-2 ${
                        isOperator ? "grid-cols-3" : "grid-cols-2"
                      }`}
                    >
                      <NumField
                        label={`Qty${l.unit ? ` · ${l.unit}` : ""}`}
                        value={l.qty}
                        min={1}
                        onChange={(n) => setLine(l.id, { qty: Math.max(1, n) })}
                      />
                      {isOperator ? (
                        <>
                          <NumField
                            label="Modal"
                            value={l.capital}
                            onChange={(n) => setLine(l.id, { capital: n })}
                          />
                          <NumField
                            label="Margin"
                            value={l.margin}
                            onChange={(n) => setLine(l.id, { margin: n })}
                          />
                        </>
                      ) : (
                        <NumField
                          label="Harga"
                          value={l.sell}
                          onChange={(n) => setLine(l.id, { sell: n })}
                        />
                      )}
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                      <span className="text-xs text-gray-400">
                        Type:{" "}
                        <input
                          value={l.serviceType ?? ""}
                          onChange={(e) =>
                            setLine(l.id, { serviceType: e.target.value })
                          }
                          className="w-20 rounded border border-transparent bg-gray-50 px-1.5 py-0.5 text-xs text-[#1B2A4A] focus:border-gray-300 focus:outline-none"
                          placeholder="—"
                        />
                      </span>
                      <span className="text-right">
                        <span className="mr-2 text-xs text-gray-400">Total</span>
                        <span className="font-semibold tabular-nums text-[#1B2A4A]">
                          {formatTHB(lineTotal)}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Summary card */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                {isOperator ? (
                  <>
                    <Row label="Modal" value={formatTHB(totals.capitalTotal)} />
                    <Row
                      label="Margin (profit)"
                      value={formatTHB(totals.marginTotal)}
                      profit
                    />
                    <Row
                      label="Grand total"
                      value={formatTHB(totals.operatorTotal)}
                      strong
                    />
                  </>
                ) : (
                  <>
                    <Row
                      label="Total"
                      value={formatTHB(totals.customerTotal)}
                      strong
                    />
                    <div className="mt-2 border-t border-gray-200 pt-2">
                      <Row
                        label="Profit (internal)"
                        value={formatTHB(totals.customerProfit)}
                        profit
                      />
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {isOperator
                  ? "Operator: total = (modal + margin) × qty. Margin bisa diubah per baris."
                  : "Customer: baris pakai harga jual. Modal & profit tidak tercetak."}
              </p>
            </div>
          )}
          </section>
        </div>

        {/* ── Live preview ── */}
        <div className="min-[1500px]:sticky min-[1500px]:top-6 min-[1500px]:self-start">
          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 no-print">
              Preview invoice muncul di sini.
            </div>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <BuiltInvoiceDoc
                mode={mode}
                billTo={billTo}
                docTitle={docTitle}
                invoiceNumber={invoiceNumber}
                date={date}
                dueDate={dueDate}
                status={status}
                lines={lines}
                idrRate={idrRate}
                custPIC={custPIC}
                custPhone={custPhone}
                custEmail={custEmail}
                custAddress={custAddress}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">
      {children}
    </h2>
  );
}

function NumField({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block truncate text-[11px] font-medium text-gray-500">
        {label}
      </span>
      <input
        type="number"
        min={min}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={`${inputCls} h-10 px-2`}
      />
    </label>
  );
}

function Row({
  label,
  value,
  strong,
  profit,
}: {
  label: string;
  value: string;
  strong?: boolean;
  profit?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={profit ? "text-gray-500" : "text-gray-600"}>{label}</span>
      <span
        className={`tabular-nums ${
          strong
            ? "text-base font-bold text-[#1B2A4A]"
            : profit
              ? "font-semibold text-green-700"
              : "text-gray-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
