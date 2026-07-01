"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, btnSecondaryCls } from "@/components/admin/ui";
import JobOrderDoc from "@/components/admin/JobOrderDoc";
import { loadOrderDoc, saveOrderDoc } from "@/lib/admin/orderDocs";
import TemplatePickerModal from "@/components/admin/TemplatePickerModal";
import { pickerRow, type PickerRowData } from "@/lib/admin/docLibrary.labels";
import {
  listTemplates,
  loadTemplate,
  createTemplate,
  saveTemplate,
} from "@/lib/admin/docLibrary";
import {
  JOB_ORDER_DEFAULTS,
  daysFromItineraryText,
  newJobOrderDay,
  newJobOrderHotel,
  passengerRowCount,
  type JobOrderData,
  type JobOrderDay,
  type JobOrderHotel,
} from "@/lib/admin/jobOrder";

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** YYYY-MM-DD → DD/MM/YYYY (job orders use the local short format). */
function isoToShort(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : "";
}

export default function JobOrderBuilderView({
  orderId,
  templateId,
  onExit,
}: {
  /** When set, the job order loads from / saves to this order. */
  orderId?: string;
  /** Standalone saved-template row edited outside an order. */
  templateId?: string;
  /** Return to the saved Job Order list. */
  onExit?: () => void;
} = {}) {
  const [jobOrderNo, setJobOrderNo] = useState("");
  const [date, setDate] = useState(today());
  const [travelAgent, setTravelAgent] = useState("");
  const [guideName, setGuideName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [carRegister, setCarRegister] = useState("");
  const [phone, setPhone] = useState<string>(JOB_ORDER_DEFAULTS.phone);
  const [emergencyContact, setEmergencyContact] = useState<string>(
    JOB_ORDER_DEFAULTS.emergencyContact
  );
  const [licenseNo, setLicenseNo] = useState<string>(JOB_ORDER_DEFAULTS.licenseNo);
  const [urgentCall, setUrgentCall] = useState<string>(JOB_ORDER_DEFAULTS.urgentCall);
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [totalPax, setTotalPax] = useState("");
  const [showPassengers, setShowPassengers] = useState(true);
  const [bedType, setBedType] = useState("");
  const [hotels, setHotels] = useState<JobOrderHotel[]>([
    newJobOrderHotel("Pattaya"),
    newJobOrderHotel("Bangkok"),
  ]);
  const [days, setDays] = useState<JobOrderDay[]>([newJobOrderDay()]);

  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRows, setPickerRows] = useState<PickerRowData[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const hydrated = useRef(false);

  // Shrink the 794px-wide A4 job-order preview to fit narrow (phone) screens,
  // mirroring the itinerary/invoice/brochure builders. Print resets zoom to 1.
  const [previewScale, setPreviewScale] = useState(1);
  const previewHostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;
    const update = () => setPreviewScale(Math.min(1, host.clientWidth / 794));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  function applyDraft(d: JobOrderData) {
    setJobOrderNo(d.jobOrderNo ?? "");
    setDate(d.date ?? today());
    setTravelAgent(d.travelAgent ?? "");
    setGuideName(d.guideName ?? "");
    setIdCard(d.idCard ?? "");
    setCarRegister(d.carRegister ?? "");
    setPhone(d.phone ?? JOB_ORDER_DEFAULTS.phone);
    setEmergencyContact(d.emergencyContact ?? JOB_ORDER_DEFAULTS.emergencyContact);
    setLicenseNo(d.licenseNo ?? JOB_ORDER_DEFAULTS.licenseNo);
    setUrgentCall(d.urgentCall ?? JOB_ORDER_DEFAULTS.urgentCall);
    setArrival(d.arrival ?? "");
    setDeparture(d.departure ?? "");
    setTotalPax(d.totalPax ?? "");
    setShowPassengers(d.showPassengers ?? true);
    setBedType(d.bedType ?? "");
    if (Array.isArray(d.hotels)) setHotels(d.hotels);
    if (Array.isArray(d.days) && d.days.length) setDays(d.days);
    setLibraryId(d.libraryId ?? null);
  }

  // Per-order: load saved job order, else seed from the order's basics.
  useEffect(() => {
    if (!orderId && !templateId) {
      hydrated.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      if (templateId && !orderId) {
        const picked = await loadTemplate<JobOrderData>(templateId);
        if (cancelled) return;
        if (picked) {
          setTemplateTitle(picked.title);
          applyDraft({ ...picked.data, libraryId: null });
        }
        hydrated.current = true;
        return;
      }

      if (!orderId) return;
      const saved = await loadOrderDoc<JobOrderData>(orderId, "joborder");
      if (cancelled) return;
      if (saved) {
        applyDraft(saved);
        // The order number isn't in the saved doc — fetch it to tag mirrors.
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
          setJobOrderNo(o.order_number ?? "");
          setDate(isoToShort(o.trip_start) || today());
          setTravelAgent(o.customers?.name ?? "");
          setGuideName(o.driver_name ?? "");
          if (o.pax) setTotalPax(`${o.pax} PAX`);
          // Seed daily rows from the itinerary the admin typed on the order.
          const seeded = daysFromItineraryText(o.itinerary, o.trip_start);
          if (seeded.length) setDays(seeded);
        }
      }
      if (!cancelled) hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, templateId]);

  function updateHotel(id: string, patch: Partial<JobOrderHotel>) {
    setHotels((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }
  function addHotel() {
    setHotels((prev) => [...prev, newJobOrderHotel()]);
  }
  function removeHotel(id: string) {
    setHotels((prev) => prev.filter((h) => h.id !== id));
  }

  function updateDay(id: string, patch: Partial<JobOrderDay>) {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function addDay() {
    setDays((prev) => [...prev, newJobOrderDay()]);
  }
  function removeDay(id: string) {
    setDays((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== id) : prev));
  }
  function move(id: string, dir: -1 | 1) {
    setDays((prev) => {
      const i = prev.findIndex((d) => d.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function printJobOrder() {
    const prev = document.title;
    document.title = `${jobOrderNo || "Job Order"} - ${date}`;

    // Zero the @page margin for this print only. With no page margin Chrome has
    // nowhere to put its own header/footer ("Job Order — date", the BE date,
    // page numbers), so they vanish — and the freed space stops a near-empty
    // trailing page. Each sheet supplies its own 12mm inset via padding (see
    // `.kt-joborder-page` in globals.css). Removed on afterprint so other docs
    // keep the global 12mm margin.
    const style = document.createElement("style");
    style.textContent =
      "@media print { @page { size: A4 !important; margin: 0 !important; } }";
    document.head.appendChild(style);

    const restore = () => {
      document.title = prev;
      style.remove();
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  const data: JobOrderData = {
    jobOrderNo,
    date,
    travelAgent,
    guideName,
    idCard,
    carRegister,
    phone,
    emergencyContact,
    licenseNo,
    urgentCall,
    arrival,
    departure,
    totalPax,
    showPassengers,
    bedType,
    hotels,
    days,
    libraryId,
  };
  const paxRows = passengerRowCount(totalPax);

  // Explicit save to the order. `saved` flips back to false on any edit so the
  // button reflects unsaved changes.
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (hydrated.current) setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  // Flush on unmount — job order has no debounced autosave, so closing the modal
  // or changing wizard step without clicking Save would lose edits and reopen
  // stale. Persist the latest data to the order doc once on teardown.
  const dataRef = useRef(data);
  dataRef.current = data;
  useEffect(
    () => () => {
      if (orderId && hydrated.current) saveOrderDoc(orderId, "joborder", dataRef.current);
    },
    [orderId]
  );

  async function save() {
    setSaving(true);
    if (templateId) {
      await saveTemplate(
        templateId,
        templateTitle.trim() || jobOrderNo || "Job Order",
        { ...data, libraryId: null }
      );
      setSaving(false);
      setSaved(true);
      return;
    }
    if (!orderId) {
      setSaving(false);
      return;
    }
    // Mirror to the library, then persist to the order carrying the mirror id.
    let nextLibraryId = libraryId;
    try {
      if (!nextLibraryId) {
        nextLibraryId = await createTemplate(
          "joborder",
          jobOrderNo || "Job Order",
          { ...data, libraryId: null },
          orderNumber
        );
        if (nextLibraryId) setLibraryId(nextLibraryId);
      } else {
        await saveTemplate(nextLibraryId, jobOrderNo || "Job Order", {
          ...data,
          libraryId: nextLibraryId,
        });
      }
    } catch {
      /* mirror is best-effort; the order doc below is the source of truth */
    }
    await saveOrderDoc(orderId, "joborder", { ...data, libraryId: nextLibraryId });
    setSaving(false);
    setSaved(true);
  }

  async function exitTemplate() {
    if (templateId) await save();
    onExit?.();
  }

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setPickerLoading(true);
    const rows = await listTemplates<JobOrderData>("joborder");
    setPickerRows(rows.map((r) => pickerRow(r)));
    setPickerLoading(false);
  }, []);

  async function pickTemplate(id: string) {
    setPickerOpen(false);
    const picked = await loadTemplate<JobOrderData>(id);
    if (!picked) return;
    const hasContent =
      days.some((d) => d.itinerary.trim()) || hotels.some((h) => h.name.trim());
    if (hasContent && !confirm("Ganti isi job order dengan yang dipilih?")) return;
    // Keep this order's own mirror id — never overwrite it with the source's id.
    applyDraft({ ...picked.data, libraryId });
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
              ← Daftar job order
            </button>
          )}
          {templateId ? (
            <input
              value={templateTitle}
              onChange={(event) => setTemplateTitle(event.target.value)}
              placeholder={jobOrderNo || "Nama job order"}
              className="block w-full max-w-md bg-transparent text-2xl font-bold text-[#1B2A4A] outline-none placeholder:text-gray-300 focus:border-b focus:border-[#F5C518]"
            />
          ) : (
            <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Job Order</h1>
          )}
          <p className="text-sm text-gray-500">
            Isi detail, klik Simpan untuk menyimpan ke order, lalu Download PDF
            dari preview. Kolom guide, ID, plat &amp; tanda tangan sengaja kosong
            untuk diisi tangan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(orderId || templateId) && (
            <button
              type="button"
              onClick={openPicker}
              className={btnSecondaryCls}
            >
              Pilih dari tersimpan
            </button>
          )}
          {orderId && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={btnCls}
            >
              {saving ? "Menyimpan…" : saved ? "Tersimpan ✓" : "Simpan"}
            </button>
          )}
          <button
            type="button"
            onClick={printJobOrder}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#1B2A4A] hover:brightness-95"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 min-[1500px]:grid-cols-[minmax(360px,440px)_minmax(858px,1fr)] print:block">
        {/* ── Editor ── Sticky with its own scroll so the long preview on the
            right scrolls the page while the editor stays in view. */}
        <div className="no-print space-y-5 min-[1500px]:sticky min-[1500px]:top-0 min-[1500px]:max-h-[85vh] min-[1500px]:self-start min-[1500px]:overflow-y-auto min-[1500px]:pr-2">
          {/* Detail card */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <SectionTitle>Detail job order</SectionTitle>
            <div className="grid gap-x-3 gap-y-3 min-[520px]:grid-cols-2 [&>label>span]:min-h-[2.5rem]">
              <Field label="No. Job Order">
                <input
                  value={jobOrderNo}
                  onChange={(e) => setJobOrderNo(e.target.value)}
                  placeholder="INV/2026/002"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="Tanggal">
                <input
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="13/06/2026"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="Travel Agent">
                <input
                  value={travelAgent}
                  onChange={(e) => setTravelAgent(e.target.value)}
                  placeholder="Nama perusahaan travel"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="Total Pax">
                <input
                  value={totalPax}
                  onChange={(e) => setTotalPax(e.target.value)}
                  placeholder="8 PAX"
                  className={`${inputCls} h-10`}
                />
              </Field>
            </div>
            {totalPax.trim() !== "" && (
              <p className="text-xs text-gray-400">
                {paxRows} baris penumpang kosong akan dicetak untuk diisi tangan.
              </p>
            )}
          </section>

          {/* Guide card */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <SectionTitle>Pemandu (guide)</SectionTitle>
            <div className="grid gap-x-3 gap-y-3 min-[520px]:grid-cols-2 [&>label>span]:min-h-[2.5rem]">
              <Field label="Guide Name">
                <input
                  value={guideName}
                  onChange={(e) => setGuideName(e.target.value)}
                  placeholder="Nama pemandu"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="License No.">
                <input
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  placeholder="11/13151"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="ID Card Number">
                <input
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  placeholder="Nomor KTP / paspor"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="Car Register">
                <input
                  value={carRegister}
                  onChange={(e) => setCarRegister(e.target.value)}
                  placeholder="Plat nomor"
                  className={`${inputCls} h-10`}
                />
              </Field>
            </div>
          </section>

          {/* Operator contact card */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <SectionTitle>Kontak operator</SectionTitle>
            <div className="grid gap-x-3 gap-y-3 min-[520px]:grid-cols-2 [&>label>span]:min-h-[2.5rem]">
              <Field label="Phone Number">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+6695-451-1582 Mr. Kevin"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="Emergency Contact">
                <input
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Love Bangkok.Co.Ltd"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="Urgent Call">
                <input
                  value={urgentCall}
                  onChange={(e) => setUrgentCall(e.target.value)}
                  placeholder="+6683-827373-9 Love Bangkok Team"
                  className={`${inputCls} h-10`}
                />
              </Field>
            </div>
          </section>

          {/* Schedule card */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <SectionTitle>Jadwal &amp; tipe kamar</SectionTitle>
            <div className="grid gap-x-3 gap-y-3 min-[520px]:grid-cols-3 [&>label>span]:min-h-[2.5rem]">
              <Field label="Bed Type">
                <input
                  value={bedType}
                  onChange={(e) => setBedType(e.target.value)}
                  placeholder="Twin / Double / NO"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="Waktu Kedatangan">
                <input
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                  placeholder="13/06 10:30 (TG123)"
                  className={`${inputCls} h-10`}
                />
              </Field>
              <Field label="Waktu Kepulangan">
                <input
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  placeholder="17/06 21:45 (TG456)"
                  className={`${inputCls} h-10`}
                />
              </Field>
            </div>
          </section>

          {/* Hotels per city card */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>Hotel per kota ({hotels.length})</SectionTitle>
              <button
                type="button"
                onClick={addHotel}
                className={`${btnSecondaryCls} whitespace-nowrap`}
              >
                + Tambah kota
              </button>
            </div>
            {hotels.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <p className="text-sm font-medium text-gray-500">Belum ada hotel</p>
                <p className="mt-1 text-xs text-gray-400">
                  Tambah kota untuk Pattaya, Bangkok, Ayutthaya, Khao Yai, dll.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {hotels.map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <div className="w-24 shrink-0 sm:w-28">
                      <input
                        value={h.city}
                        onChange={(e) => updateHotel(h.id, { city: e.target.value })}
                        placeholder="Kota"
                        className={`${inputCls} h-10`}
                      />
                    </div>
                    <input
                      value={h.name}
                      onChange={(e) => updateHotel(h.id, { name: e.target.value })}
                      placeholder="Nama hotel / NO"
                      className={`${inputCls} h-10 min-w-0 flex-1`}
                    />
                    <IconBtn onClick={() => removeHotel(h.id)} label="Hapus kota" danger>
                      ✕
                    </IconBtn>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Itinerary card */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>Itinerary harian ({days.length})</SectionTitle>
              <button
                type="button"
                onClick={addDay}
                className={`${btnSecondaryCls} whitespace-nowrap`}
              >
                + Tambah hari
              </button>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1B2A4A]">
              <input
                type="checkbox"
                checked={showPassengers}
                onChange={(e) => setShowPassengers(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-[#F5C518]"
              />
              <span>Tampilkan tabel penumpang</span>
            </label>

            <div className="space-y-2">
              {days.map((d, i) => (
                <div
                  key={d.id}
                  className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-3"
                >
                  {/* Row: index · itinerary · controls */}
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1B2A4A]/5 text-xs font-bold text-[#1B2A4A]">
                      {i + 1}
                    </span>
                    <input
                      value={d.itinerary}
                      onChange={(e) =>
                        updateDay(d.id, { itinerary: e.target.value })
                      }
                      placeholder="Pick up, transfer ke Pattaya…"
                      className={`${inputCls} h-10 min-w-0 flex-1`}
                    />
                    <IconBtn
                      onClick={() => move(d.id, -1)}
                      disabled={i === 0}
                      label="Naikkan"
                    >
                      ▲
                    </IconBtn>
                    <IconBtn
                      onClick={() => move(d.id, 1)}
                      disabled={i === days.length - 1}
                      label="Turunkan"
                    >
                      ▼
                    </IconBtn>
                    <IconBtn
                      onClick={() => removeDay(d.id)}
                      disabled={days.length === 1}
                      label="Hapus hari"
                      danger
                    >
                      ✕
                    </IconBtn>
                  </div>

                  {/* Date + meals + hotel */}
                  <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
                    <MiniField
                      label="Tanggal"
                      value={d.date}
                      placeholder="13/06"
                      onChange={(v) => updateDay(d.id, { date: v })}
                    />
                    <MiniField
                      label="Lunch"
                      value={d.lunch}
                      onChange={(v) => updateDay(d.id, { lunch: v })}
                    />
                    <MiniField
                      label="Dinner"
                      value={d.dinner}
                      onChange={(v) => updateDay(d.id, { dinner: v })}
                    />
                    <MiniField
                      label="Hotel"
                      value={d.hotel}
                      onChange={(v) => updateDay(d.id, { hotel: v })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Live preview ── */}
        <div>
          <div
            ref={previewHostRef}
            className="w-full overflow-hidden print:overflow-visible"
          >
            <div
              className="kt-joborder-fit mx-auto w-[794px] print:w-auto"
              style={{ zoom: previewScale }}
            >
              <JobOrderDoc {...data} />
            </div>
          </div>
        </div>
      </div>

      <TemplatePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pilih job order tersimpan"
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

function MiniField({
  label,
  value,
  onChange,
  placeholder = "NO",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block truncate text-[11px] font-medium text-gray-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} h-10 px-2`}
      />
    </label>
  );
}

function IconBtn({
  onClick,
  disabled,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gray-200 text-sm transition-colors disabled:opacity-25 ${
        danger
          ? "text-red-500 hover:border-red-200 hover:bg-red-50"
          : "text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-[#1B2A4A]"
      }`}
    >
      {children}
    </button>
  );
}
