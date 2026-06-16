"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import ItineraryDoc from "@/components/admin/ItineraryDoc";
import type { ItineraryDay, ItineraryPlace } from "@/lib/admin/itinerary";
import type { Place } from "@/lib/admin/places";

function newId() {
  return crypto.randomUUID();
}

// Quick-pick destinations — click to prefill the AI prompt.
const SUGGESTIONS = [
  "Bangkok City Tour 4 hari 3 malam, keluarga, suka belanja & kuil",
  "Bangkok + Pattaya 5 hari 4 malam, pasangan, pantai & nightlife",
  "Bangkok + Khao Yai 4 hari 3 malam, alam & cafe hopping",
  "Bangkok + Ayutthaya 3 hari 2 malam, sejarah & budaya",
  "Hua Hin 3 hari 2 malam, santai keluarga ada anak kecil",
  "Kanchanaburi 2 hari 1 malam, River Kwai & Erawan Falls",
  "Chiang Mai 4 hari 3 malam, kuil, gajah, & pasar malam",
];

export default function ItineraryBuilderView() {
  const [tripTitle, setTripTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [pax, setPax] = useState("");
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("places")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data }) => setPlaces((data as Place[]) ?? []));
  }, []);

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
        (data.days ?? []).map(
          (d: {
            title?: string;
            activities?: { time?: string; text?: string }[];
          }) => ({
            id: newId(),
            title: d.title ?? "",
            date: "",
            activities: (d.activities ?? []).map((a) => ({
              id: newId(),
              time: a.time ?? "",
              text: a.text ?? "",
            })),
            places: [],
          })
        )
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal generate.");
    } finally {
      setAiBusy(false);
    }
  }

  function addPlace(dayId: string, place: ItineraryPlace) {
    setDays((arr) =>
      arr.map((d) =>
        d.id === dayId ? { ...d, places: [...d.places, place] } : d
      )
    );
  }
  function removePlace(dayId: string, placeId: string) {
    setDays((arr) =>
      arr.map((d) =>
        d.id === dayId
          ? { ...d, places: d.places.filter((p) => p.id !== placeId) }
          : d
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Itinerary</h1>
        <p className="text-sm text-gray-500">
          Generate dengan AI, tambah tempat + foto, lalu Print / Simpan PDF (1
          hari = 1 halaman).
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
          Tulis permintaan customer (kota, durasi, minat, jumlah orang).
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs font-medium text-gray-400">
            Rekomendasi:
          </span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setAiPrompt(s)}
              className="rounded-full border border-[#1B2A4A]/20 bg-white px-3 py-1 text-xs text-[#1B2A4A] transition-colors hover:border-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white"
            >
              {s.split(",")[0]}
            </button>
          ))}
        </div>
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

      {/* Trip details */}
      <section className="no-print grid gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
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
      </section>

      {/* Per-day place pickers */}
      {days.length > 0 && (
        <section className="no-print space-y-3">
          <h2 className="font-bold text-[#1B2A4A]">Tempat & Foto per hari</h2>
          {days.map((d, i) => (
            <DayPlaces
              key={d.id}
              dayNo={i + 1}
              day={d}
              places={places}
              onAdd={(place) => addPlace(d.id, place)}
              onRemove={(placeId) => removePlace(d.id, placeId)}
            />
          ))}
        </section>
      )}

      {days.length === 0 ? (
        <p className="text-sm text-gray-400">
          Generate itinerary dengan AI untuk lihat preview.
        </p>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
          <div className="min-w-[700px] sm:min-w-0 print:min-w-0">
            <ItineraryDoc
              tripTitle={tripTitle}
              customer={customer}
              pax={pax}
              notes={notes}
              days={days}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DayPlaces({
  dayNo,
  day,
  places,
  onAdd,
  onRemove,
}: {
  dayNo: number;
  day: ItineraryDay;
  places: Place[];
  onAdd: (place: ItineraryPlace) => void;
  onRemove: (placeId: string) => void;
}) {
  const cities = Array.from(new Set(places.map((p) => p.city)));
  const [city, setCity] = useState(cities[0] ?? "");
  const [placeId, setPlaceId] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cUrl, setCUrl] = useState("");
  const [cDesc, setCDesc] = useState("");

  const inCity = places.filter((p) => p.city === city);

  function addFromPlace() {
    const p = places.find((x) => x.id === placeId);
    if (!p) return;
    onAdd({
      id: newId(),
      name: p.name,
      image: p.image_url ?? "",
      desc: p.description ?? "",
    });
    setPlaceId("");
  }

  function addCustom() {
    if (!cName.trim()) return;
    onAdd({ id: newId(), name: cName.trim(), image: cUrl.trim(), desc: cDesc.trim() });
    setCName("");
    setCUrl("");
    setCDesc("");
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 text-sm font-semibold text-[#1B2A4A]">
        Hari {dayNo}
        {day.title ? ` · ${day.title}` : ""}
      </p>

      {/* From attractions DB */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPlaceId("");
          }}
          className={`${inputCls} w-auto`}
        >
          {cities.length === 0 && <option value="">— belum ada tempat —</option>}
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          className={`${inputCls} w-auto`}
        >
          <option value="">— pilih tempat —</option>
          {inCity.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.image_url ? " 🖼" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addFromPlace}
          disabled={!placeId}
          className={`${btnCls} disabled:opacity-50`}
        >
          + Tambah
        </button>
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className="text-sm text-blue-600 hover:underline"
        >
          {customOpen ? "tutup" : "atau tempat manual + URL"}
        </button>
      </div>

      {/* Custom place with URL */}
      {customOpen && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2">
          <input
            value={cName}
            onChange={(e) => setCName(e.target.value)}
            placeholder="Nama tempat"
            className={`${inputCls} w-40`}
          />
          <input
            value={cUrl}
            onChange={(e) => setCUrl(e.target.value)}
            placeholder="URL gambar"
            className={`${inputCls} w-48`}
          />
          <input
            value={cDesc}
            onChange={(e) => setCDesc(e.target.value)}
            placeholder="Deskripsi singkat"
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!cName.trim()}
            className={`${btnCls} disabled:opacity-50`}
          >
            + Tambah
          </button>
        </div>
      )}

      {/* Added places */}
      {day.places.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {day.places.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pl-1 pr-2 text-sm"
            >
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[9px] text-gray-400">
                  —
                </span>
              )}
              {p.name}
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="text-red-500"
                aria-label="Hapus tempat"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
