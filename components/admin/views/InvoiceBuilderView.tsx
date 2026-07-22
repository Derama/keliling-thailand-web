"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnSecondaryCls } from "@/components/admin/ui";
import { formatTHB, formatIDR, isoLocal } from "@/lib/admin/utils";
import BuiltInvoiceDoc from "@/components/admin/BuiltInvoiceDoc";
import { loadOrderDoc, saveOrderDoc } from "@/lib/admin/orderDocs";
import { syncOrderPrice } from "@/lib/admin/orderPrice";
import {
  downloadSheetsAsPdf,
  isCoarsePointer,
} from "@/lib/admin/pdfDownload";
import CatalogPicker from "@/components/admin/invoice/CatalogPicker";
import Select from "@/components/admin/Select";
import { useCatalog, type CatalogItem } from "@/components/admin/invoice/useCatalog";
import TemplatePickerModal from "@/components/admin/TemplatePickerModal";
import { pickerRow, type PickerRowData } from "@/lib/admin/docLibrary.labels";
import {
  listTemplates,
  loadTemplate,
  createTemplate,
  saveTemplate,
} from "@/lib/admin/docLibrary";
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

/** Short labels for the status dropdown (full labels stamp the PDF). */
const INVOICE_STATUS_FORM_LABELS: Record<InvoiceStatus, string> = {
  awaiting: "Belum bayar",
  paid: "Lunas",
};

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

// Customer / operator invoices get a real sequential number (INV-YYYY-NNNN)
// allocated by the server when first saved to the order. Until then there is no
// number; personal invoices may type their own.
function defaultInvoiceNumber(): string {
  return "";
}

// Personal invoices are not part of the order's INV-YYYY-NNNN sequence — they
// get their own standalone, unique number. Timestamp (to the second) + a short
// random suffix guarantees a different value on every generation.
function personalInvoiceNumber(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `INV-${stamp}-${rand}`;
}

export interface InvoiceDraft {
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
  /** Payable accounting invoice (invoices table) created from this maker. */
  savedInvoiceId?: string | null;
  /** Library mirror row this order's invoice is synced to (document_templates). */
  libraryId?: string | null;
}

export default function InvoiceBuilderView({
  orderId,
  onInvoiceSaved,
  templateId,
  newTemplate,
  onExit,
}: {
  /** When set, the invoice loads from / saves to this order. */
  orderId?: string;
  /** Called after the payable invoice is saved so the order list can refresh. */
  onInvoiceSaved?: () => void;
  /** Standalone saved-template row edited outside an order. */
  templateId?: string;
  /** Fresh standalone invoice — no DB row yet; one is created on first save. */
  newTemplate?: boolean;
  /** Return to the saved Invoice list. */
  onExit?: () => void;
} = {}) {
  const { sections, loading } = useCatalog();

  const [mode, setMode] = useState<InvoiceMode>("operator");
  const [docTitle, setDocTitle] = useState("Hotel + Transport");
  const [billTo, setBillTo] = useState("Love Bangkok.Co.Ltd");
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber());
  const [date, setDate] = useState(isoLocal());
  const [dueDate, setDueDate] = useState(addDays(isoLocal(), 1));
  const [status, setStatus] = useState<InvoiceStatus>("awaiting");
  const [lines, setLines] = useState<InvoiceLine[]>([]);

  // Personal invoices always carry a real, unique number (not just a
  // placeholder). Fill it the moment we are in personal mode and it's empty.
  useEffect(() => {
    if (mode === "personal" && !invoiceNumber.trim()) {
      setInvoiceNumber(personalInvoiceNumber());
    }
  }, [mode, invoiceNumber]);

  // Payable invoice linked to the order. Stored in the draft so re-saving
  // updates the same `invoices` row instead of creating duplicates.
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  // Ref twin read by the async sync — never stale mid-flight like state.
  const savedInvoiceIdRef = useRef<string | null>(null);
  const setSavedInvoice = useCallback((id: string | null) => {
    savedInvoiceIdRef.current = id;
    setSavedInvoiceId(id);
  }, []);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Library mirror: one document_templates row per order, autosaved in sync.
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  // Standalone (library) flow: "+ Invoice baru" opens the builder with no DB
  // row at all — one is created lazily on the first non-personal save, so a
  // personal invoice never touches the database no matter how the user leaves.
  const isLibrary = Boolean(templateId || newTemplate);
  // Ref (not state — nothing renders it) so an in-flight save never
  // double-creates the row.
  const tplIdRef = useRef<string | null>(templateId ?? null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  // Shrink the A4 preview to fit narrow (phone) screens via a screen-only CSS
  // transform (never `zoom`, which mobile print engines mangle into the PDF).
  // The clip host reserves the scaled height so the layout doesn't collapse.
  const [previewScale, setPreviewScale] = useState(1);
  const [docNaturalH, setDocNaturalH] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");
  const previewHostRef = useRef<HTMLDivElement>(null);
  const docInnerRef = useRef<HTMLDivElement>(null);
  const [pickerRows, setPickerRows] = useState<PickerRowData[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Customer contact — shown in the "Billed to" block on customer invoices.
  const [custPIC, setCustPIC] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custAddress, setCustAddress] = useState("");

  // Personal generator — type a rough target, get a multi-row invoice built
  // from random catalog items whose total lands just above the target with the
  // leading digits intact (920.000 → 92x.xxx). Personal use only.
  const [aiTarget, setAiTarget] = useState(0);
  const [aiErr, setAiErr] = useState("");

  // THB → IDR rate for the customer converter. Seeded with a sane fallback,
  // refreshed once from a free no-key FX API. Always editable by hand.
  const [idrRate, setIdrRate] = useState(450);
  const [rateNote, setRateNote] = useState("Kurs manual");
  // True once a saved draft has set the rate — prevents the live FX fetch
  // from overwriting a rate the user already locked in for bookkeeping.
  const rateFromDraftRef = useRef(false);

  useEffect(() => {
    let on = true;
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d) => {
        const rate = d?.rate;
        if (!on) return;
        if (rateFromDraftRef.current) {
          setRateNote("Kurs tersimpan (terkunci)");
        } else if (typeof rate === "number" && rate > 0) {
          setIdrRate(Math.round(rate));
          setRateNote("Kurs live");
        }
      })
      .catch(() => on && !rateFromDraftRef.current && setRateNote("Kurs manual (API gagal)"));
    return () => {
      on = false;
    };
  }, []);

  const hydrated = useRef(false);

  function applyDraft(d: InvoiceDraft) {
    const dMode = d.mode ?? "operator";
    setMode(dMode);
    setDocTitle(d.docTitle ?? "Hotel + Transport");
    setBillTo(d.billTo ?? "Love Bangkok.Co.Ltd");
    setInvoiceNumber(
      d.invoiceNumber ||
        (dMode === "personal" ? personalInvoiceNumber() : defaultInvoiceNumber())
    );
    setDate(d.date ?? isoLocal());
    setDueDate(d.dueDate ?? addDays(isoLocal(), 1));
    setStatus(d.status ?? "awaiting");
    setLines(Array.isArray(d.lines) ? d.lines : []);
    setCustPIC(d.custPIC ?? "");
    setCustPhone(d.custPhone ?? "");
    setCustEmail(d.custEmail ?? "");
    setCustAddress(d.custAddress ?? "");
    if (typeof d.idrRate === "number") {
      setIdrRate(d.idrRate);
      rateFromDraftRef.current = true;
    }
    setSavedInvoice(d.savedInvoiceId ?? null);
    setLibraryId(d.libraryId ?? null);
  }

  // Per-order: load saved invoice, else seed billing from the order's customer.
  useEffect(() => {
    if (!orderId && !templateId) {
      hydrated.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      if (templateId && !orderId) {
        const picked = await loadTemplate<InvoiceDraft>(templateId);
        if (cancelled) return;
        if (!picked) {
          setSaveErr("Invoice tersimpan tidak ditemukan.");
        } else {
          setTemplateTitle(picked.title);
          applyDraft({
            ...picked.data,
            libraryId: null,
            savedInvoiceId: null,
          });
        }
        hydrated.current = true;
        return;
      }

      if (!orderId) return;

      const saved = await loadOrderDoc<InvoiceDraft>(orderId, "invoice");
      if (cancelled) return;
      if (saved) {
        applyDraft(saved);
        // Order number isn't in the saved draft — fetch it to tag mirrors.
        const { data: o } = await createClient()
          .from("orders")
          .select("order_number")
          .eq("id", orderId)
          .single();
        if (!cancelled && o) setOrderNumber(o.order_number ?? null);
      } else {
        const { data: o } = await createClient()
          .from("orders")
          .select("*, customers(*)")
          .eq("id", orderId)
          .single();
        if (!cancelled && o) {
          setOrderNumber(o.order_number ?? null);
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
    // applyDraft only writes state; re-running on its identity would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, templateId]);

  const isOperator = mode !== "customer";
  const totals = invoiceTotals(lines);

  // Fit the 842px-wide invoice doc into the preview column on small screens.
  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;
    const update = () => setPreviewScale(Math.min(1, host.clientWidth / 842));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [lines.length]);

  // Track the doc's natural (unscaled) height so the clip host can reserve the
  // scaled height. offsetHeight ignores the CSS transform, so it's the true size.
  useEffect(() => {
    const inner = docInnerRef.current;
    if (!inner) return;
    const update = () => setDocNaturalH(inner.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [lines.length]);

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
    savedInvoiceId,
    libraryId,
  };

  // Latest draft in a ref so the unmount flush sees current values.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Flush on unmount — the debounced autosave below is cancelled when the builder
  // unmounts (modal close / wizard step change), which would drop a pending edit
  // so the order reopens stale. Persist the latest draft once on teardown.
  useEffect(
    () => () => {
      if (orderId && hydrated.current) saveOrderDoc(orderId, "invoice", draftRef.current);
    },
    [orderId]
  );

  // Autosave to the order (debounced) once hydrated; mirror to the library and
  // keep the payable accounting invoice in sync so Pembayaran/Dashboard always
  // reflect the latest lines without an extra tap.
  useEffect(() => {
    if (!orderId || !hydrated.current) return;
    const t = setTimeout(async () => {
      await saveOrderDoc(orderId, "invoice", draft);
      try {
        const title = invoiceNumber || "Invoice";
        if (!libraryId) {
          const id = await createTemplate(
            "invoice",
            title,
            { ...draft, libraryId: null },
            orderNumber
          );
          if (id) setLibraryId(id);
        } else {
          await saveTemplate(libraryId, title, { ...draft, libraryId });
        }
      } catch {
        /* mirror is best-effort */
      }
      void queuePayableSync(false);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, JSON.stringify(draft)]);

  // Serialized so an autosave tick and an explicit "Simpan" can never race a
  // lazy row creation into duplicates.
  const templateSaveChain = useRef<Promise<void>>(Promise.resolve());
  function saveTemplateDraft(): Promise<void> {
    templateSaveChain.current = templateSaveChain.current
      .catch(() => {})
      .then(doSaveTemplateDraft);
    return templateSaveChain.current;
  }

  async function doSaveTemplateDraft() {
    if (!isLibrary) return;
    const d = draftRef.current;
    // Personal invoices are download-only — never persisted to the library.
    if (d.mode === "personal") return;
    // Nothing worth a row yet — don't litter the list with empty invoices.
    if (!tplIdRef.current && d.lines.length === 0 && !templateTitle.trim())
      return;
    setSaveState("saving");
    setSaveErr(null);
    const title = templateTitle.trim() || d.invoiceNumber || "Invoice";
    const payload = { ...d, libraryId: null, savedInvoiceId: null };
    try {
      if (tplIdRef.current) {
        await saveTemplate(tplIdRef.current, title, payload);
      } else {
        tplIdRef.current = await createTemplate("invoice", title, payload, null);
      }
      setSaveState("saved");
    } catch (cause) {
      setSaveErr(cause instanceof Error ? cause.message : "Gagal menyimpan invoice.");
      setSaveState("idle");
    }
  }

  useEffect(() => {
    if (!isLibrary || !hydrated.current) return;
    const t = setTimeout(() => {
      void saveTemplateDraft();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLibrary, templateTitle, JSON.stringify(draft)]);

  async function exitTemplate() {
    // Personal drafts leave nothing behind — no row was ever created for them.
    if (isLibrary && draftRef.current.mode !== "personal") {
      await saveTemplateDraft();
    }
    onExit?.();
  }

  async function printInvoice() {
    // Phones/tablets: assemble a real PDF from the pre-paginated sheets — the
    // mobile print engine re-lays the doc out and rarely matches the preview.
    if (isCoarsePointer()) {
      if (downloading) return;
      setDownloading(true);
      try {
        const sheets = Array.from(
          docInnerRef.current?.querySelectorAll<HTMLElement>(
            ".invoice-page.kt-invoice-page"
          ) ?? []
        );
        // No. Invoice is only allocated on save — fall back to the doc title so
        // an unsaved invoice never downloads as " - 2026-07-03.pdf".
        const stem = invoiceNumber.trim() || docTitle.trim() || "Invoice";
        await downloadSheetsAsPdf(sheets, `${stem} - ${date}`, (page, total) =>
          setPdfProgress(`${page}/${total}`)
        );
      } catch (err) {
        alert(err instanceof Error ? err.message : "Gagal membuat PDF.");
      } finally {
        setDownloading(false);
        setPdfProgress("");
      }
      return;
    }

    const prev = document.title;
    if (mode === "personal") {
      const now = new Date();
      const day = now.toLocaleDateString("id-ID", { weekday: "long" });
      const time = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      document.title = `${invoiceNumber} - ${date} - ${day} - ${time}`;
    } else {
      document.title = `${invoiceNumber} - ${date}`;
    }
    const style = document.createElement("style");
    style.dataset.ktInvoicePrint = "true";
    style.textContent =
      "@media print { @page { size: A4 !important; margin: 0 !important; } .kt-invoice-fit { width: auto !important; zoom: 1 !important; } }";
    document.head.appendChild(style);
    const restore = () => {
      document.title = prev;
      style.remove();
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  // Once saved to the order, any further edit re-arms the button to "update".
  useEffect(() => {
    setSaveState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines), idrRate]);

  // Create/update the payable accounting invoice (invoices table) for this
  // order from the customer-facing total, so payment can be requested off it.
  // Runs both explicitly (button) and silently after every autosave — the
  // Pembayaran tab and the Dashboard read `orders.price_idr`, which only moves
  // when this row exists, so an invoice that is merely drafted stays invisible
  // to finance. All calls are serialized through `payableChain` so overlapping
  // autosave ticks can never double-allocate an invoice number.
  const payableChain = useRef<Promise<void>>(Promise.resolve());
  function queuePayableSync(explicit: boolean): Promise<void> {
    payableChain.current = payableChain.current
      .catch(() => {})
      .then(() => syncPayableInvoice(explicit));
    return payableChain.current;
  }

  async function syncPayableInvoice(explicit: boolean): Promise<void> {
    if (!orderId) return;
    const d = draftRef.current;
    const t = invoiceTotals(d.lines);
    const amountIdr = Math.round(t.customerTotal * d.idrRate);
    const existingId = savedInvoiceIdRef.current;
    if (amountIdr <= 0) {
      if (explicit) setSaveErr("Total customer masih 0 — isi item dulu.");
      return;
    }
    // Personal invoices are throwaway — they only hit accounting when the user
    // explicitly asks; customer/operator invoices sync automatically.
    if (!explicit && !existingId && d.mode === "personal") return;

    if (explicit) {
      setSaveState("saving");
      setSaveErr(null);
    }
    const fail = (msg: string) => {
      if (explicit) {
        setSaveErr(msg);
        setSaveState("idle");
      }
    };
    const supabase = createClient();
    const lineItems = d.lines.map((l) => ({
      description: l.desc || "Item",
      amount_idr: Math.round(lineCustomerTotal(l) * d.idrRate),
    }));

    // Allocate a unique, sequential document number the first time a customer /
    // operator invoice is saved. Personal invoices keep their typed number and
    // never draw from the shared counter.
    let docNumber = d.invoiceNumber;
    if (!existingId && d.mode !== "personal") {
      const { data, error } = await supabase.rpc("next_invoice_number");
      if (error || typeof data !== "string") {
        fail(`Gagal membuat nomor invoice: ${error?.message ?? "tak terduga"}`);
        return;
      }
      docNumber = data;
    }

    let invoiceRowId = existingId;
    if (existingId) {
      const { error } = await supabase
        .from("invoices")
        .update({ amount_idr: amountIdr, line_items: lineItems })
        .eq("id", existingId);
      if (error) {
        fail(`Gagal menyimpan: ${error.message}`);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          order_id: orderId,
          type: "full",
          amount_idr: amountIdr,
          line_items: lineItems,
          // Personal: omit so the BEFORE INSERT trigger assigns a fallback id.
          ...(d.mode !== "personal" ? { invoice_number: docNumber } : {}),
        })
        .select("id")
        .single();
      if (error) {
        fail(`Gagal menyimpan: ${error.message}`);
        return;
      }
      invoiceRowId = data.id;
      setSavedInvoice(data.id);
    }

    // Persist the assigned number + invoice id into the draft so the doc shows
    // it and re-saves update the same row instead of allocating a new number.
    if (docNumber !== d.invoiceNumber) setInvoiceNumber(docNumber);
    await saveOrderDoc(orderId, "invoice", {
      ...draftRef.current,
      invoiceNumber: docNumber,
      savedInvoiceId: invoiceRowId,
    });

    await syncOrderPrice(supabase, orderId);
    // Cost + margin are derived from the invoice too: cost_thb = what we pay
    // the tour operator (operatorTotal = base + operator margin); the kurs is
    // the invoice rate. Company margin = customer total − operator total.
    await supabase
      .from("orders")
      .update({ cost_thb: t.operatorTotal, fx_rate: d.idrRate })
      .eq("id", orderId);
    setSaveState("saved");
    onInvoiceSaved?.();
  }

  function saveToOrder() {
    void queuePayableSync(true);
  }

  async function openPicker() {
    setPickerOpen(true);
    setPickerLoading(true);
    const rows = await listTemplates<InvoiceDraft>("invoice");
    setPickerRows(rows.map((r) => pickerRow(r)));
    setPickerLoading(false);
  }

  async function pickTemplate(id: string) {
    setPickerOpen(false);
    const picked = await loadTemplate<InvoiceDraft>(id);
    if (!picked) return;
    if (lines.length > 0 && !confirm("Ganti isi invoice dengan yang dipilih?"))
      return;
    // Keep this order's own mirror id + payable-invoice link.
    applyDraft({ ...picked.data, libraryId, savedInvoiceId });
  }

  function switchMode(next: InvoiceMode) {
    setMode(next);
    if (next !== "customer" && !billTo.trim()) setBillTo("Love Bangkok.Co.Ltd");
    if (next === "customer" && billTo === "Love Bangkok.Co.Ltd") setBillTo("");
    // Personal invoices get their own unique number, prefilled (editable).
    if (next === "personal" && !invoiceNumber.trim()) {
      setInvoiceNumber(personalInvoiceNumber());
    }
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
    // Land just above the target with the leading digits intact: overshoot a
    // random 0.2–1% (e.g. 920.000 → 92x.xxx), never a flat +10%.
    const hi = T + Math.max(100, Math.round((T * (0.002 + Math.random() * 0.008)) / 100) * 100);
    // Skip items pricier than the target so one unit can't blow past it.
    const usePool = all.filter((it) => it.sell <= T);
    const pool = usePool.length ? usePool : all;

    // 15–22 distinct rows (fills ~2 pages); quantity closes the remaining gap.
    const rowCount = Math.min(pool.length, 15 + Math.floor(Math.random() * 8)); // 15–22
    const items = shuffle(pool).slice(0, rowCount);

    // Quantity ceiling scales with the target so a cheap catalog can still
    // reach big totals (500k–950k+) instead of stalling around 500k.
    const avgSell = items.reduce((s, it) => s + it.sell, 0) / items.length;
    const qtyMax = Math.max(20, Math.ceil(hi / (rowCount * avgSell)) + 5);

    // Seed each row with a quantity near the per-row share, then nudge to target.
    const avg = T / rowCount;
    const qty = items.map((it) =>
      Math.min(qtyMax, Math.max(1, Math.round(avg / it.sell)))
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
        .filter((i) => qty[i] < qtyMax && items[i].sell <= hi - sum);
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
          {onExit && (
            <button
              type="button"
              onClick={() => void exitTemplate()}
              className="mb-2 text-sm font-medium text-gray-500 hover:text-[#1B2A4A]"
            >
              ← Daftar invoice
            </button>
          )}
          {isLibrary ? (
            <input
              value={templateTitle}
              onChange={(event) => setTemplateTitle(event.target.value)}
              placeholder={invoiceNumber || "Nama invoice"}
              className="block w-full max-w-md bg-transparent text-2xl font-bold text-[#1B2A4A] outline-none placeholder:text-gray-300 focus:border-b focus:border-[#F5C518]"
            />
          ) : (
            <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Invoice</h1>
          )}
          <p className="text-sm text-gray-500">
            Tambah item dari katalog atau manual, lalu Print / Simpan PDF dari
            preview. Semua THB.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {isLibrary && mode !== "personal" && (
            <button
              type="button"
              onClick={() => void saveTemplateDraft()}
              disabled={saveState === "saving"}
              className={`${btnSecondaryCls} whitespace-nowrap disabled:opacity-50`}
            >
              {saveState === "saving" ? "Menyimpan…" : "Simpan"}
            </button>
          )}
          {orderId && (
            <button
              type="button"
              onClick={openPicker}
              className={`${btnSecondaryCls} whitespace-nowrap`}
            >
              Pilih dari tersimpan
            </button>
          )}
          {orderId && (
            <div className="flex flex-col items-end gap-0.5">
              <button
                type="button"
                onClick={saveToOrder}
                disabled={lines.length === 0 || saveState === "saving"}
                className={`${btnSecondaryCls} whitespace-nowrap disabled:opacity-50`}
              >
                {saveState === "saving"
                  ? "Menyimpan…"
                  : savedInvoiceId
                    ? "Perbarui invoice order"
                    : "Simpan ke order"}
              </button>
              {saveState === "saved" && (
                <span className="text-xs font-medium text-green-700">
                  Tersimpan di order ✓
                </span>
              )}
              {saveErr && (
                <span className="text-xs font-medium text-red-600">
                  {saveErr}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={printInvoice}
            disabled={lines.length === 0 || downloading}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#1B2A4A] hover:brightness-95 disabled:opacity-50"
          >
            {downloading
              ? `Menyiapkan${pdfProgress ? ` hal. ${pdfProgress}` : ""}…`
              : "Print / Simpan PDF"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 min-[1500px]:grid-cols-[minmax(360px,440px)_minmax(858px,1fr)] print:block">
        {/* ── Editor ── */}
        <div
          ref={editorPaneRef}
          className="no-print space-y-5 min-[1500px]:sticky min-[1500px]:top-6 min-[1500px]:max-h-[calc(100vh-3rem)] min-[1500px]:overflow-y-auto min-[1500px]:pr-1"
        >
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
            <div className="grid gap-x-3 gap-y-3 min-[520px]:grid-cols-2">
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
                readOnly={mode !== "personal"}
                placeholder={
                  mode !== "personal"
                    ? "Otomatis saat disimpan"
                    : "INV-20260630-143205-A1B"
                }
                className={`${inputCls} h-10 ${
                  mode !== "personal" ? "bg-gray-50 text-gray-600" : ""
                }`}
              />
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onChange={(v) => setStatus(v as InvoiceStatus)}
                className="h-10"
                options={(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map(
                  (s) => ({ value: s, label: INVOICE_STATUS_FORM_LABELS[s] })
                )}
              />
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
                Ambil 15–22 item acak dari katalog (modal & margin asli), lalu
                atur quantity sampai total mendarat sedikit di atas target (cth
                920.000 → 92x.xxx). Maks 2 halaman. Tekan ulang untuk acak baru.
              </p>
              {isLibrary && (
                <p className="text-xs font-semibold text-amber-700">
                  Invoice personal tidak disimpan — hanya untuk di-download /
                  print, lalu hilang saat keluar.
                </p>
              )}
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

          {/* Finance-link warning — only when the automatic payable-invoice
              sync can't run, so the user knows Pembayaran/Dashboard won't see
              this invoice yet and why. */}
          {orderId && lines.length > 0 && !savedInvoiceId && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
              {mode === "personal"
                ? "Invoice personal tidak otomatis masuk Pembayaran & Dashboard — tekan “Simpan ke order” jika ingin dihitung."
                : totals.customerTotal <= 0
                  ? "Invoice belum terhitung di Pembayaran & Dashboard — total customer masih 0, isi harga jual dulu."
                  : "Menghubungkan ke Pembayaran & Dashboard…"}
            </div>
          )}

          {/* Items card */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>
                Item{lines.length > 0 ? ` (${lines.length})` : ""}
              </SectionTitle>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCatalogOpen((v) => !v)}
                  aria-pressed={catalogOpen}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1B2A4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#27375c]"
                >
                  <span className="text-base leading-none">+</span> Katalog
                </button>
                <button
                  type="button"
                  onClick={addBlank}
                  className={`${btnSecondaryCls} whitespace-nowrap`}
                >
                  + Manual
                </button>
              </div>
            </div>

            {catalogOpen && (
              <CatalogPicker
                sections={sections}
                loading={loading}
                mode={mode}
                onPick={addFromCatalog}
                onClose={() => setCatalogOpen(false)}
                anchorRef={editorPaneRef}
              />
            )}

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
            <div ref={previewHostRef} className="w-full">
              <div
                className="kt-invoice-fit-host mx-auto overflow-hidden print:!h-auto print:!w-auto print:overflow-visible"
                style={{
                  width: 842 * previewScale,
                  height: docNaturalH ? docNaturalH * previewScale : undefined,
                }}
              >
              <div
                ref={docInnerRef}
                className="kt-invoice-fit w-[842px] origin-top-left print:!transform-none"
                style={{ transform: `scale(${previewScale})` }}
              >
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
              </div>
            </div>
          )}
        </div>
      </div>

      <TemplatePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pilih invoice tersimpan"
        rows={pickerRows}
        loading={pickerLoading}
        onPick={pickTemplate}
      />
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
