"use client";

import { useState } from "react";
import {
  Field,
  inputCls,
  btnCls,
  btnSecondaryCls,
  ErrorNote,
} from "@/components/admin/ui";
import ItineraryDoc from "@/components/admin/ItineraryDoc";
import type {
  ItineraryDay,
  ItineraryActivity,
} from "@/lib/admin/itinerary";

function newId() {
  return crypto.randomUUID();
}

function blankActivity(): ItineraryActivity {
  return { id: newId(), time: "", text: "" };
}

export default function ItineraryBuilderView() {
  const [tripTitle, setTripTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [pax, setPax] = useState("");
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<ItineraryDay[]>([]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function generateWithAI() {
    if (!aiPrompt.trim() || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal generate.");
      if (data.tripTitle) setTripTitle(data.tripTitle);
      if (typeof data.notes === "string") setNotes(data.notes);
      setDays(
        (data.days ?? []).map((d: { title?: string; activities?: { time?: string; text?: string }[] }) => ({
          id: newId(),
          title: d.title ?? "",
          date: "",
          activities: (d.activities ?? []).map((a) => ({
            id: newId(),
            time: a.time ?? "",
            text: a.text ?? "",
          })),
        }))
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal generate.");
    } finally {
      setAiBusy(false);
    }
  }

  function addDay() {
    setDays((arr) => [
      ...arr,
      { id: newId(), title: "", date: "", activities: [blankActivity()] },
    ]);
  }
  function removeDay(id: string) {
    setDays((arr) => arr.filter((d) => d.id !== id));
  }
  function setDayField(id: string, patch: Partial<ItineraryDay>) {
    setDays((arr) => arr.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function addActivity(dayId: string) {
    setDays((arr) =>
      arr.map((d) =>
        d.id === dayId
          ? { ...d, activities: [...d.activities, blankActivity()] }
          : d
      )
    );
  }
  function removeActivity(dayId: string, actId: string) {
    setDays((arr) =>
      arr.map((d) =>
        d.id === dayId
          ? { ...d, activities: d.activities.filter((a) => a.id !== actId) }
          : d
      )
    );
  }
  function setActivity(dayId: string, actId: string, patch: Partial<ItineraryActivity>) {
    setDays((arr) =>
      arr.map((d) =>
        d.id === dayId
          ? {
              ...d,
              activities: d.activities.map((a) =>
                a.id === actId ? { ...a, ...patch } : a
              ),
            }
          : d
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Itinerary</h1>
        <p className="text-sm text-gray-500">
          Susun rencana harian, lalu Print / Simpan PDF dari preview di bawah.
        </p>
      </div>

      {/* AI generator */}
      <section className="no-print space-y-3 rounded-xl border border-[#F5C518]/40 border-t-4 border-t-[#F5C518] bg-[#FFFCEF] p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B2A4A] text-sm font-bold text-[#F5C518]">
            ✦
          </span>
          <h2 className="font-bold text-[#1B2A4A]">Generate dengan AI</h2>
        </div>
        <p className="text-xs text-gray-500">
          Tulis permintaan customer (kota, durasi, minat, jumlah orang). AI akan
          isi itinerary harian — bisa diedit setelahnya.
        </p>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={3}
          placeholder="Contoh: Keluarga 4 orang, Bangkok 4 hari 3 malam, suka belanja & kuil, ada anak kecil."
          className={inputCls}
        />
        <ErrorNote message={aiError} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={generateWithAI}
            disabled={!aiPrompt.trim() || aiBusy}
            className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {aiBusy ? "Membuat itinerary…" : "✦ Generate itinerary"}
          </button>
          {aiBusy && (
            <span className="text-sm text-gray-500">
              Tunggu beberapa detik…
            </span>
          )}
        </div>
      </section>

      <section className="no-print space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Judul trip">
            <input
              value={tripTitle}
              onChange={(e) => setTripTitle(e.target.value)}
              placeholder="Bangkok 4D3N"
              className={inputCls}
            />
          </Field>
          <Field label="Customer">
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Nama customer"
              className={inputCls}
            />
          </Field>
          <Field label="Pax">
            <input
              value={pax}
              onChange={(e) => setPax(e.target.value)}
              placeholder="2 dewasa"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Days */}
        <div className="space-y-4">
          {days.map((d, i) => (
            <div
              key={d.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B2A4A] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <Field label="Judul hari">
                  <input
                    value={d.title}
                    onChange={(e) => setDayField(d.id, { title: e.target.value })}
                    placeholder="Tiba di Bangkok"
                    className={`${inputCls} w-52`}
                  />
                </Field>
                <Field label="Tanggal">
                  <input
                    type="date"
                    value={d.date}
                    onChange={(e) => setDayField(d.id, { date: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeDay(d.id)}
                  className="ml-auto text-sm text-red-500 hover:underline"
                >
                  Hapus hari
                </button>
              </div>

              <div className="space-y-2">
                {d.activities.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <input
                      value={a.time}
                      onChange={(e) =>
                        setActivity(d.id, a.id, { time: e.target.value })
                      }
                      placeholder="09:00"
                      className={`${inputCls} w-24`}
                    />
                    <input
                      value={a.text}
                      onChange={(e) =>
                        setActivity(d.id, a.id, { text: e.target.value })
                      }
                      placeholder="Kegiatan / tempat"
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeActivity(d.id, a.id)}
                      className="text-sm text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addActivity(d.id)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + kegiatan
                </button>
              </div>
            </div>
          ))}

          <button type="button" onClick={addDay} className={btnSecondaryCls}>
            + Tambah hari
          </button>
        </div>

        <Field label="Catatan (opsional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Termasuk: hotel, transport. Tidak termasuk: tiket masuk…"
            className={inputCls}
          />
        </Field>
      </section>

      {days.length === 0 ? (
        <p className="text-sm text-gray-400">
          Tambah minimal satu hari untuk lihat preview itinerary.
        </p>
      ) : (
        <ItineraryDoc
          tripTitle={tripTitle}
          customer={customer}
          pax={pax}
          notes={notes}
          days={days}
        />
      )}
    </div>
  );
}
