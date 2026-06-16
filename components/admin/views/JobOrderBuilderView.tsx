"use client";

import { useState } from "react";
import { Field, inputCls, btnCls, btnSecondaryCls } from "@/components/admin/ui";
import JobOrderDoc from "@/components/admin/JobOrderDoc";
import {
  newJobOrderDay,
  type JobOrderData,
  type JobOrderDay,
} from "@/lib/admin/jobOrder";

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function JobOrderBuilderView() {
  const [jobOrderNo, setJobOrderNo] = useState("");
  const [date, setDate] = useState(today());
  const [travelAgent, setTravelAgent] = useState("");
  const [totalPax, setTotalPax] = useState("");
  const [bedType, setBedType] = useState("");
  const [hotelPattaya, setHotelPattaya] = useState("");
  const [hotelBangkok, setHotelBangkok] = useState("");
  const [days, setDays] = useState<JobOrderDay[]>([newJobOrderDay()]);

  function updateDay(id: string, patch: Partial<JobOrderDay>) {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function addDay() {
    setDays((prev) => [...prev, newJobOrderDay()]);
  }
  function removeDay(id: string) {
    setDays((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== id) : prev));
  }

  const data: JobOrderData = {
    jobOrderNo,
    date,
    travelAgent,
    totalPax,
    bedType,
    hotelPattaya,
    hotelBangkok,
    days,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Job Order</h1>
        <p className="text-sm text-gray-500">
          Isi detail, lalu Print / Simpan PDF dari preview di bawah. Kolom guide,
          ID, plat &amp; tanda tangan sengaja kosong untuk diisi tangan.
        </p>
      </div>

      {/* Header + logistics */}
      <section className="no-print grid gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <Field label="No. Job Order">
          <input
            value={jobOrderNo}
            onChange={(e) => setJobOrderNo(e.target.value)}
            placeholder="INV/2026/002"
            className={inputCls}
          />
        </Field>
        <Field label="Tanggal">
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="13/06/2026"
            className={inputCls}
          />
        </Field>
        <Field label="Travel Agent">
          <input
            value={travelAgent}
            onChange={(e) => setTravelAgent(e.target.value)}
            placeholder="Nama perusahaan travel"
            className={inputCls}
          />
        </Field>
        <Field label="Total Pax">
          <input
            value={totalPax}
            onChange={(e) => setTotalPax(e.target.value)}
            placeholder="8 PAX"
            className={inputCls}
          />
        </Field>
        <Field label="Bed Type">
          <input
            value={bedType}
            onChange={(e) => setBedType(e.target.value)}
            placeholder="Twin / Double / NO"
            className={inputCls}
          />
        </Field>
        <Field label="Hotel Pattaya">
          <input
            value={hotelPattaya}
            onChange={(e) => setHotelPattaya(e.target.value)}
            placeholder="Nama hotel / NO"
            className={inputCls}
          />
        </Field>
        <Field label="Hotel Bangkok">
          <input
            value={hotelBangkok}
            onChange={(e) => setHotelBangkok(e.target.value)}
            placeholder="Nama hotel / NO"
            className={inputCls}
          />
        </Field>
      </section>

      {/* Day rows */}
      <section className="no-print space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#1B2A4A]">Itinerary harian</h2>
          <button type="button" onClick={addDay} className={btnSecondaryCls}>
            + Tambah hari
          </button>
        </div>
        {days.map((d, i) => (
          <div
            key={d.id}
            className="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[80px_1fr_90px_90px_90px_auto]"
          >
            <Field label={i === 0 ? "Tanggal" : ""}>
              <input
                value={d.date}
                onChange={(e) => updateDay(d.id, { date: e.target.value })}
                placeholder="13/06"
                className={inputCls}
              />
            </Field>
            <Field label={i === 0 ? "Itinerary" : ""}>
              <input
                value={d.itinerary}
                onChange={(e) => updateDay(d.id, { itinerary: e.target.value })}
                placeholder="Pick up, transfer ke Pattaya…"
                className={inputCls}
              />
            </Field>
            <Field label={i === 0 ? "Lunch" : ""}>
              <input
                value={d.lunch}
                onChange={(e) => updateDay(d.id, { lunch: e.target.value })}
                placeholder="NO"
                className={inputCls}
              />
            </Field>
            <Field label={i === 0 ? "Dinner" : ""}>
              <input
                value={d.dinner}
                onChange={(e) => updateDay(d.id, { dinner: e.target.value })}
                placeholder="NO"
                className={inputCls}
              />
            </Field>
            <Field label={i === 0 ? "Hotel" : ""}>
              <input
                value={d.hotel}
                onChange={(e) => updateDay(d.id, { hotel: e.target.value })}
                placeholder="NO"
                className={inputCls}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeDay(d.id)}
                disabled={days.length === 1}
                className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-30"
                aria-label="Hapus hari"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Preview + print */}
      <button onClick={() => window.print()} className={`${btnCls} no-print`}>
        Print / Simpan PDF
      </button>
      <div className="overflow-x-auto print:overflow-visible">
        <div className="min-w-[700px] sm:min-w-0 print:min-w-0">
          <JobOrderDoc {...data} />
        </div>
      </div>
    </div>
  );
}
