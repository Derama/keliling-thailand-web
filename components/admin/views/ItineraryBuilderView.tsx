"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import { isoLocal } from "@/lib/admin/utils";
import { uploadPlaceImage } from "@/lib/admin/storage";
import ItineraryDoc from "@/components/admin/ItineraryDoc";
import {
  type ItineraryDay,
  type ItineraryActivity,
  type ItineraryPlace,
  scheduleFromPlaces,
  sortActivitiesByTime,
  MEAL_STOPS,
} from "@/lib/admin/itinerary";
import type { Place } from "@/lib/admin/places";
import {
  type DragPayload,
  DAY_DROP_ATTR,
  COVER_DROP_ID,
  MAX_DAY_PHOTOS,
  DND_MIME,
  setDragData,
  readDragData,
  TouchDragProvider,
  useTouchDrag,
} from "@/components/admin/itineraryDnD";

const DRAFT_KEY = "kt-itinerary-draft";

function newId() {
  return crypto.randomUUID();
}

/** Add `n` days to a local YYYY-MM-DD string. Empty in → empty out. */
function addDaysIso(iso: string, n: number): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
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

interface Draft {
  tripTitle: string;
  customer: string;
  pax: string;
  startDate: string;
  notes: string;
  vehicle: string;
  heroImage: string;
  days: ItineraryDay[];
}

export default function ItineraryBuilderView() {
  const [tripTitle, setTripTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [pax, setPax] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicle, setVehicle] = useState("VAN");
  const [heroImage, setHeroImage] = useState("");
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [qDays, setQDays] = useState(3);
  const [qDest, setQDest] = useState<string[]>([]);
  // True once the admin sets/uploads a cover manually — stops AI from overwriting it.
  const [coverManual, setCoverManual] = useState(false);

  const hydrated = useRef(false);

  // Load attractions for the per-day place picker.
  useEffect(() => {
    createClient()
      .from("places")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data }) => setPlaces((data as Place[]) ?? []));
  }, []);

  // Restore draft once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        setTripTitle(d.tripTitle ?? "");
        setCustomer(d.customer ?? "");
        setPax(d.pax ?? "");
        setStartDate(d.startDate ?? "");
        setNotes(d.notes ?? "");
        setVehicle(d.vehicle ?? "VAN");
        setHeroImage(d.heroImage ?? "");
        setDays(Array.isArray(d.days) ? d.days : []);
      }
    } catch {
      /* ignore corrupt draft */
    }
    hydrated.current = true;
  }, []);

  // Autosave draft (debounced) after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    const draft: Draft = {
      tripTitle,
      customer,
      pax,
      startDate,
      notes,
      vehicle,
      heroImage,
      days,
    };
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSavedAt(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }, 600);
    return () => clearTimeout(t);
  }, [tripTitle, customer, pax, startDate, notes, vehicle, heroImage, days]);

  const hasContent =
    days.length > 0 || tripTitle || customer || notes || aiPrompt;

  const destOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of places) if (p.image_url) set.add(p.city.toUpperCase());
    return [...set].sort();
  }, [places]);

  async function generateWithAI() {
    if (aiBusy) return;
    const parts: string[] = [];
    if (customer) parts.push(`Customer: ${customer}.`);
    if (pax) parts.push(`Jumlah: ${pax}.`);
    if (qDays) parts.push(`Durasi: ${qDays} hari.`);
    if (qDest.length) parts.push(`Tujuan: ${qDest.join(", ")}.`);
    if (aiPrompt.trim()) parts.push(aiPrompt.trim());
    const effectivePrompt = parts.join(" ");
    if (!effectivePrompt) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal generate.");
      if (data.tripTitle) setTripTitle(data.tripTitle);
      if (typeof data.notes === "string") setNotes(data.notes);
      setDays(
        (data.days ?? []).map(
          (
            d: {
              title?: string;
              theme?: string;
              city?: string;
              route?: string;
              intro?: string;
              cityHighlight?: string;
              activities?: { time?: string; text?: string }[];
              places?: { name?: string; image?: string; desc?: string }[];
            },
            i: number
          ) => {
            const places = (d.places ?? [])
              .slice(0, MAX_DAY_PHOTOS)
              .map((p) => ({
                id: newId(),
                name: p.name ?? "",
                image: p.image ?? "",
                desc: p.desc ?? "",
              }));
            return {
              id: newId(),
              title: d.title ?? "",
              theme: d.theme ?? "",
              city: d.city ?? "",
              route: d.route ?? "",
              intro: d.intro ?? "",
              cityHighlight: d.cityHighlight ?? "",
              date: addDaysIso(startDate, i),
              // Timetable is derived from the attractions (one timed stop each).
              activities: scheduleFromPlaces(places),
              places,
            };
          }
        )
      );
      // Set cover from a picked attraction unless the admin set one manually.
      if (data.heroImage && !coverManual) setHeroImage(data.heroImage);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal generate.");
    } finally {
      setAiBusy(false);
    }
  }

  function printItinerary() {
    const prev = document.title;
    document.title = [tripTitle || "Itinerary", customer].filter(Boolean).join(" - ");
    const restore = () => {
      document.title = prev;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  function resetAll() {
    if (!confirm("Hapus draft itinerary ini dan mulai dari awal?")) return;
    setTripTitle("");
    setCustomer("");
    setPax("");
    setStartDate("");
    setNotes("");
    setVehicle("VAN");
    setHeroImage("");
    setCoverManual(false);
    setDays([]);
    setAiPrompt("");
    setAiError(null);
    setQDays(3);
    setQDest([]);
    localStorage.removeItem(DRAFT_KEY);
  }

  // When the start date changes, re-date every day sequentially.
  function applyStartDate(iso: string) {
    setStartDate(iso);
    setDays((arr) => arr.map((d, i) => ({ ...d, date: addDaysIso(iso, i) })));
  }

  // ── Day mutators ─────────────────────────────────────────────
  function patchDay(id: string, patch: Partial<ItineraryDay>) {
    setDays((arr) => arr.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function addDay() {
    setDays((arr) => [
      ...arr,
      {
        id: newId(),
        title: "",
        date: addDaysIso(startDate, arr.length),
        activities: [],
        places: [],
      },
    ]);
  }
  function removeDay(id: string) {
    setDays((arr) => {
      const next = arr.filter((d) => d.id !== id);
      // keep dates consecutive after a removal
      return next.map((d, i) => ({ ...d, date: addDaysIso(startDate, i) }));
    });
  }
  function moveDay(id: string, dir: -1 | 1) {
    setDays((arr) => {
      const i = arr.findIndex((d) => d.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((d, k) => ({ ...d, date: addDaysIso(startDate, k) }));
    });
  }

  // ── Place (photo) mutators — used by picker + drag-and-drop ──
  // Each attraction is a timed stop: keep the schedule in sync with the photos.
  function syncDay(d: ItineraryDay): ItineraryDay {
    return { ...d, activities: scheduleFromPlaces(d.places, d.activities) };
  }
  function addPlaceToDay(dayId: string, place: ItineraryPlace) {
    setDays((arr) =>
      arr.map((d) =>
        d.id === dayId && d.places.length < MAX_DAY_PHOTOS
          ? syncDay({ ...d, places: [...d.places, place] })
          : d
      )
    );
  }
  function removePlaceFromDay(dayId: string, placeId: string) {
    setDays((arr) =>
      arr.map((d) =>
        d.id === dayId
          ? syncDay({ ...d, places: d.places.filter((p) => p.id !== placeId) })
          : d
      )
    );
  }
  // Click a gallery card → drop it into the first day that still has a free slot.
  function quickAddPlace(place: Omit<ItineraryPlace, "id">) {
    setDays((arr) => {
      const target = arr.find((d) => d.places.length < MAX_DAY_PHOTOS);
      if (!target) return arr; // every day full
      return arr.map((d) =>
        d.id === target.id
          ? syncDay({ ...d, places: [...d.places, { ...place, id: newId() }] })
          : d
      );
    });
  }
  function patchPlaceInDay(
    dayId: string,
    placeId: string,
    patch: Partial<ItineraryPlace>
  ) {
    setDays((arr) =>
      arr.map((d) =>
        d.id === dayId
          ? syncDay({
              ...d,
              places: d.places.map((p) =>
                p.id === placeId ? { ...p, ...patch } : p
              ),
            })
          : d
      )
    );
  }
  // Handle a drop onto a day OR the cover slot: a fresh palette card or a move.
  function handleDropOnDay(targetDayId: string, payload: DragPayload) {
    // Cover hero: any dragged photo just sets the cover image (no move/remove).
    if (targetDayId === COVER_DROP_ID) {
      if (payload.place.image) {
        setHeroImage(payload.place.image);
        setCoverManual(true);
      }
      return;
    }
    if (payload.kind === "new") {
      addPlaceToDay(targetDayId, { ...payload.place, id: newId() });
      return;
    }
    if (payload.fromDayId === targetDayId) return;
    setDays((arr) => {
      const target = arr.find((d) => d.id === targetDayId);
      if (target && target.places.length >= MAX_DAY_PHOTOS) return arr; // full
      return arr.map((d) => {
        if (d.id === payload.fromDayId) {
          return syncDay({
            ...d,
            places: d.places.filter((p) => p.id !== payload.place.id),
          });
        }
        if (d.id === targetDayId) {
          return syncDay({ ...d, places: [...d.places, payload.place] });
        }
        return d;
      });
    });
  }

  return (
    <div className="space-y-6">
      {/* Header / toolbar */}
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Itinerary</h1>
          <p className="text-sm text-gray-500">
            Generate dengan AI, sunting tiap hari, lalu Print / Simpan PDF (1
            hari = 1 halaman).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="hidden text-xs text-gray-400 sm:inline">
              Tersimpan · {savedAt}
            </span>
          )}
          {hasContent && (
            <button
              type="button"
              onClick={resetAll}
              className="text-sm font-medium text-red-500 hover:underline"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={printItinerary}
            disabled={days.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#1B2A4A] hover:brightness-95 disabled:opacity-50"
          >
            Print / Simpan PDF
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 min-[1280px]:grid-cols-[minmax(380px,1fr)_minmax(0,820px)] print:block">
        {/* ── Editor column ── */}
        <TouchDragProvider onDrop={handleDropOnDay}>
        <div className="no-print space-y-5">
          {/* 1 — AI generator */}
          <section className="space-y-3 rounded-xl border border-[#F5C518]/40 border-t-4 border-t-[#F5C518] bg-[#FFFCEF] p-5">
            <StepHead n="AI" title="Generate dengan AI" accent />
            <p className="text-xs text-gray-500">
              Isi Detail trip (customer, pax, jumlah hari) di bawah, pilih
              tujuan, lalu Generate. Kotak teks opsional — untuk minat khusus
              (mis. suka belanja, ada anak kecil).
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
            {destOptions.length > 0 && (
              <div className="space-y-1">
                <span className="block text-sm font-medium text-gray-700">
                  Tujuan
                </span>
                <div className="flex flex-wrap gap-2">
                  {destOptions.map((city) => {
                    const on = qDest.includes(city);
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() =>
                          setQDest((prev) =>
                            on
                              ? prev.filter((c) => c !== city)
                              : [...prev, city]
                          )
                        }
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          on
                            ? "border-[#1B2A4A] bg-[#1B2A4A] text-white"
                            : "border-[#1B2A4A]/20 bg-white text-[#1B2A4A] hover:border-[#1B2A4A]"
                        }`}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
                disabled={aiBusy}
                className={`${btnCls} disabled:cursor-not-allowed`}
              >
                {aiBusy
                  ? "Membuat itinerary…"
                  : days.length > 0
                    ? "✦ Generate ulang"
                    : "✦ Generate itinerary"}
              </button>
              {aiBusy && (
                <span className="text-sm text-gray-500">
                  Tunggu beberapa detik…
                </span>
              )}
            </div>
          </section>

          {/* 2 — Trip details */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="1" title="Detail trip" />
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Judul trip" value={tripTitle} onChange={setTripTitle} placeholder="Bangkok 4D3N" />
              <LabeledInput label="Customer" value={customer} onChange={setCustomer} placeholder="Nama customer" />
              <LabeledInput label="Pax" value={pax} onChange={setPax} placeholder="2 dewasa" />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Jumlah hari
                </span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={qDays}
                  onChange={(e) => setQDays(Number(e.target.value) || 1)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Tanggal mulai
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => applyStartDate(e.target.value)}
                  className={inputCls}
                />
              </label>
              <LabeledInput label="Kendaraan" value={vehicle} onChange={setVehicle} placeholder="VAN" />
              <CoverSlot
                value={heroImage}
                onChange={(v) => {
                  setHeroImage(v);
                  setCoverManual(!!v);
                }}
              />
            </div>
          </section>

          {/* 3 — Day editor */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="2" title="Rencana per hari" />

            {days.length > 0 && places.length > 0 && (
              <PlacePalette places={places} onPick={quickAddPlace} />
            )}

            {days.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-400">
                Belum ada hari. Generate dengan AI di atas, atau tambah hari
                manual.
              </p>
            ) : (
              <div className="space-y-4">
                {days.map((d, i) => (
                  <DayCard
                    key={d.id}
                    dayNo={i + 1}
                    day={d}
                    places={places}
                    isFirst={i === 0}
                    isLast={i === days.length - 1}
                    onPatch={(patch) => patchDay(d.id, patch)}
                    onRemove={() => removeDay(d.id)}
                    onMove={(dir) => moveDay(d.id, dir)}
                    onAddPlace={(p) => addPlaceToDay(d.id, p)}
                    onRemovePlace={(pid) => removePlaceFromDay(d.id, pid)}
                    onPatchPlace={(pid, patch) => patchPlaceInDay(d.id, pid, patch)}
                    onDropPlace={(payload) => handleDropOnDay(d.id, payload)}
                  />
                ))}
              </div>
            )}
            <button type="button" onClick={addDay} className={btnSecondaryCls}>
              + Tambah hari
            </button>
          </section>

          {/* 4 — Notes */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="3" title="Catatan (inclusions / tips)" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Termasuk: transport AC, driver berbahasa Indonesia. Tidak termasuk: tiket masuk."
              className={inputCls}
            />
          </section>
        </div>
        </TouchDragProvider>

        {/* ── Live preview column ── */}
        <div className="min-[1500px]:sticky min-[1500px]:top-6 min-[1500px]:self-start">
          {days.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400 no-print">
              Preview itinerary muncul di sini.
            </div>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <div className="print:min-w-0">
                <ItineraryDoc
                  tripTitle={tripTitle}
                  customer={customer}
                  pax={pax}
                  notes={notes}
                  vehicle={vehicle}
                  heroImage={heroImage}
                  days={days}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small presentational helpers ──────────────────────────────

function StepHead({
  n,
  title,
  accent,
}: {
  n: string;
  title: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
          accent ? "bg-[#1B2A4A] text-[#F5C518]" : "bg-[#1B2A4A]/10 text-[#1B2A4A]"
        }`}
      >
        {accent ? "✦" : n}
      </span>
      <h2 className="font-bold text-[#1B2A4A]">{title}</h2>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  );
}

// ── Cover hero drop slot (drag from gallery, or upload) ───────

function CoverSlot({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const touch = useTouchDrag();
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const highlight = over || touch.overDayId === COVER_DROP_ID;

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      onChange(await uploadPlaceImage(file, "covers"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        Foto sampul
      </span>
      <div
        {...{ [DAY_DROP_ATTR]: COVER_DROP_ID }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DND_MIME)) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const p = readDragData(e);
          if (p?.place.image) onChange(p.place.image);
        }}
        className={`relative flex aspect-[16/7] items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          highlight
            ? "border-[#F5C518] bg-[#FFFCEF]"
            : value
              ? "border-transparent"
              : "border-gray-300 bg-gray-50"
        }`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
              aria-label="Hapus foto sampul"
            >
              ✕
            </button>
          </>
        ) : (
          <div className="px-4 text-center">
            <p className="text-sm font-medium text-gray-500">
              Tarik foto dari galeri ke sini
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              atau unggah dari perangkat
            </p>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label
          className={`${btnSecondaryCls} cursor-pointer ${
            uploading ? "opacity-60" : ""
          }`}
        >
          {uploading ? "Mengunggah…" : value ? "Ganti foto" : "Unggah foto"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
        </label>
        <span className="text-xs text-gray-400">
          Tampil di halaman sampul brosur.
        </span>
      </div>
      <ErrorNote message={err} />
    </div>
  );
}

// ── Draggable attraction palette ──────────────────────────────

function PlacePalette({
  places,
  onPick,
}: {
  places: Place[];
  onPick: (place: Omit<ItineraryPlace, "id">) => void;
}) {
  const touch = useTouchDrag();
  const cities = Array.from(new Set(places.map((p) => p.city)));
  const [city, setCity] = useState<string>("");
  const [q, setQ] = useState("");

  const activeCity = city || "";
  const shown = places.filter((p) => {
    if (activeCity && p.city !== activeCity) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Galeri tempat
        </span>
        <span className="text-xs text-gray-400">— klik untuk tambah, atau tarik ke hari</span>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari…"
            className={`${inputCls} h-8 w-32 py-1`}
          />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={`${inputCls} h-8 w-auto bg-white py-1`}
          >
            <option value="">Semua kota</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-1 py-3 text-xs text-gray-400">Tidak ada tempat cocok.</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {shown.map((p) => (
            <div
              key={p.id}
              draggable
              onDragStart={(e) =>
                setDragData(e, {
                  kind: "new",
                  place: {
                    id: p.id,
                    name: p.name,
                    image: p.image_url ?? "",
                    desc: p.description ?? "",
                  },
                })
              }
              onPointerDown={(e) =>
                touch.begin(
                  e,
                  {
                    kind: "new",
                    place: {
                      id: p.id,
                      name: p.name,
                      image: p.image_url ?? "",
                      desc: p.description ?? "",
                    },
                  },
                  { label: p.name, image: p.image_url ?? undefined }
                )
              }
              onClick={() =>
                onPick({
                  name: p.name,
                  image: p.image_url ?? "",
                  desc: p.description ?? "",
                })
              }
              style={{ touchAction: "pan-x" }}
              title={`${p.name} — klik untuk tambah, atau tarik ke hari`}
              className="group w-28 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:border-[#F5C518]"
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="h-20 w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-20 w-full items-center justify-center bg-gray-100 text-[10px] text-gray-400">
                  {p.name}
                </div>
              )}
              <p className="truncate px-2 py-1 text-[11px] font-medium text-[#1B2A4A]">
                {p.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Day editor card ───────────────────────────────────────────

function DayCard({
  dayNo,
  day,
  places,
  isFirst,
  isLast,
  onPatch,
  onRemove,
  onMove,
  onAddPlace,
  onRemovePlace,
  onPatchPlace,
  onDropPlace,
}: {
  dayNo: number;
  day: ItineraryDay;
  places: Place[];
  isFirst: boolean;
  isLast: boolean;
  onPatch: (patch: Partial<ItineraryDay>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddPlace: (place: ItineraryPlace) => void;
  onRemovePlace: (placeId: string) => void;
  onPatchPlace: (placeId: string, patch: Partial<ItineraryPlace>) => void;
  onDropPlace: (payload: DragPayload) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const touch = useTouchDrag();
  const highlight = dragOver || touch.overDayId === day.id;
  const detailCount = [
    day.theme,
    day.city,
    day.route,
    day.intro,
    day.cityHighlight,
  ].filter((v) => v && v.trim()).length;

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const payload = readDragData(e);
    if (payload) onDropPlace(payload);
  }

  // Timetable = attraction stops (synced to the photos) + manual rows the admin
  // adds here (meals / custom stops). Manual rows survive photo changes.
  const placeIds = new Set(day.places.map((p) => p.id));

  function patchActivity(id: string, patch: Partial<ItineraryActivity>) {
    onPatch({
      activities: day.activities.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    });
  }
  function removeActivity(id: string) {
    onPatch({ activities: day.activities.filter((a) => a.id !== id) });
  }
  function addCustomRow() {
    onPatch({
      activities: [...day.activities, { id: newId(), time: "", text: "" }],
    });
  }
  function addMeals() {
    const has = (text: string) =>
      day.activities.some(
        (a) => a.text.trim().toLowerCase() === text.toLowerCase()
      );
    const missing = MEAL_STOPS.filter((m) => !has(m.text)).map((m) => ({
      id: newId(),
      time: m.time,
      text: m.text,
    }));
    if (missing.length === 0) return;
    onPatch({
      activities: sortActivitiesByTime([...day.activities, ...missing]),
    });
  }

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DND_MIME)) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the card itself, not a child.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={onDrop}
      {...{ [DAY_DROP_ATTR]: day.id }}
      className={`rounded-xl border bg-white transition-shadow ${
        highlight
          ? "border-[#F5C518] ring-2 ring-[#F5C518] ring-offset-1"
          : "border-gray-200"
      }`}
    >
      {/* Day header */}
      <div className="flex items-center gap-2 rounded-t-xl bg-[#1B2A4A] px-3 py-2 text-white">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5C518] text-xs font-bold text-[#1B2A4A]">
          {dayNo}
        </span>
        <input
          value={day.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder={`Judul hari ${dayNo} (mis. Tiba & City Tour)`}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white placeholder-white/50 focus:outline-none"
        />
        <input
          type="date"
          value={day.date}
          onChange={(e) => onPatch({ date: e.target.value })}
          className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs text-white focus:outline-none [color-scheme:dark]"
        />
        <div className="flex shrink-0 items-center gap-1 pl-1">
          <button
            type="button"
            aria-label="Naikkan hari"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="text-white/70 hover:text-white disabled:opacity-25"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Turunkan hari"
            onClick={() => onMove(1)}
            disabled={isLast}
            className="text-white/70 hover:text-white disabled:opacity-25"
          >
            ↓
          </button>
          <button
            type="button"
            aria-label="Hapus hari"
            onClick={onRemove}
            className="pl-1 text-white/70 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-4 p-3">
        {/* Brochure detail — collapsed by default to keep the builder compact */}
        <div>
          <button
            type="button"
            onClick={() => setDetailOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            <span>
              Detail brosur (tema, kota, rute, intro)
              {detailCount > 0 && (
                <span className="ml-1.5 text-gray-400">· {detailCount} terisi</span>
              )}
            </span>
            <span className="text-gray-400">{detailOpen ? "▲" : "▼"}</span>
          </button>
          {detailOpen && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                value={day.theme ?? ""}
                onChange={(e) => onPatch({ theme: e.target.value })}
                placeholder="Tema (mis. MENUJU PESISIR)"
                className={`${inputCls} uppercase`}
              />
              <input
                value={day.city ?? ""}
                onChange={(e) => onPatch({ city: e.target.value })}
                placeholder="Kota (mis. PATTAYA)"
                className={`${inputCls} uppercase`}
              />
              <input
                value={day.route ?? ""}
                onChange={(e) => onPatch({ route: e.target.value })}
                placeholder="Rute (mis. BANGKOK → PATTAYA → HOTEL)"
                className={`${inputCls} uppercase sm:col-span-2`}
              />
              <textarea
                value={day.intro ?? ""}
                onChange={(e) => onPatch({ intro: e.target.value })}
                rows={2}
                placeholder="Intro singkat hari ini…"
                className={`${inputCls} sm:col-span-2`}
              />
              <textarea
                value={day.cityHighlight ?? ""}
                onChange={(e) => onPatch({ cityHighlight: e.target.value })}
                rows={2}
                placeholder="Highlight kota (tampil di band bawah halaman hari)…"
                className={`${inputCls} sm:col-span-2`}
              />
            </div>
          )}
        </div>

        {/* Timetable — attraction stops (auto) + meals / custom rows (manual) */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-400">
            Jadwal (atraksi otomatis · tambah makan / jam lain di bawah)
          </p>
          {day.activities.map((a) => {
            const isPlace = placeIds.has(a.id);
            return (
              <div key={a.id} className="flex items-center gap-2">
                <input
                  value={a.time}
                  onChange={(e) => patchActivity(a.id, { time: e.target.value })}
                  placeholder="08:00"
                  className="w-16 shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-center text-sm tabular-nums focus:border-[#1B2A4A] focus:outline-none focus:ring-1 focus:ring-[#1B2A4A]"
                />
                <input
                  value={a.text}
                  onChange={(e) => patchActivity(a.id, { text: e.target.value })}
                  placeholder={isPlace ? "Nama atraksi…" : "Kegiatan…"}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B2A4A] focus:outline-none focus:ring-1 focus:ring-[#1B2A4A]"
                />
                <button
                  type="button"
                  aria-label="Hapus baris"
                  title={isPlace ? "Hapus via foto atraksi" : "Hapus baris"}
                  onClick={() => removeActivity(a.id)}
                  disabled={isPlace}
                  className="shrink-0 px-1.5 text-gray-400 hover:text-red-500 disabled:opacity-25"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {day.activities.length === 0 && (
            <p className="text-xs text-gray-400">
              Tambah foto atraksi di bawah — jadwalnya muncul otomatis.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={addMeals}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:border-[#1B2A4A] hover:text-[#1B2A4A]"
            >
              + Jam makan
            </button>
            <button
              type="button"
              onClick={addCustomRow}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:border-[#1B2A4A] hover:text-[#1B2A4A]"
            >
              + Tambah jam
            </button>
          </div>
        </div>

        {/* Places */}
        <DayPlaces
          dayId={day.id}
          places={places}
          added={day.places}
          dragActive={highlight}
          onAdd={onAddPlace}
          onRemove={onRemovePlace}
          onPatch={onPatchPlace}
        />
      </div>
    </div>
  );
}

// ── Per-day place / photo picker ──────────────────────────────

function DayPlaces({
  dayId,
  places,
  added,
  dragActive,
  onAdd,
  onRemove,
  onPatch,
}: {
  dayId: string;
  places: Place[];
  added: ItineraryPlace[];
  dragActive: boolean;
  onAdd: (place: ItineraryPlace) => void;
  onRemove: (placeId: string) => void;
  onPatch: (placeId: string, patch: Partial<ItineraryPlace>) => void;
}) {
  const touch = useTouchDrag();
  const full = added.length >= MAX_DAY_PHOTOS;
  const cities = Array.from(new Set(places.map((p) => p.city)));
  const [cityChoice, setCity] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cCity, setCCity] = useState("");
  const [cUrl, setCUrl] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveGallery, setSaveGallery] = useState(true);
  const [cErr, setCErr] = useState<string | null>(null);

  // Fall back to the first city until the user picks one (no effect needed).
  const city = cityChoice || cities[0] || "";
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

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setCErr(null);
    try {
      setCUrl(await uploadPlaceImage(file, cCity || city));
    } catch (e) {
      setCErr(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setUploading(false);
    }
  }

  async function addCustom() {
    if (!cName.trim()) return;
    const image = cUrl.trim();
    // Optionally save the new attraction to the shared gallery DB.
    if (saveGallery && image) {
      setSaving(true);
      setCErr(null);
      const { error } = await createClient()
        .from("places")
        .insert({
          city: (cCity || city || "Lainnya").trim(),
          name: cName.trim(),
          image_url: image,
          description: cDesc.trim(),
          sort: 999,
        });
      setSaving(false);
      if (error) {
        setCErr(error.message);
        return;
      }
    }
    onAdd({ id: newId(), name: cName.trim(), image, desc: cDesc.trim() });
    setCName("");
    setCCity("");
    setCUrl("");
    setCDesc("");
    setCErr(null);
  }

  return (
    <div
      className={`rounded-lg border bg-gray-50/60 p-3 ${
        dragActive ? "border-[#F5C518] bg-[#FFFCEF]" : "border-gray-100"
      }`}
    >
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Tempat & foto
        <span className="text-gray-400">
          {added.length}/{MAX_DAY_PHOTOS}
        </span>
        {dragActive && !full && (
          <span className="font-medium normal-case text-[#1B2A4A]">
            — lepas di sini untuk menambahkan
          </span>
        )}
        {full && (
          <span className="font-medium normal-case text-gray-400">
            — maksimal {MAX_DAY_PHOTOS} foto
          </span>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPlaceId("");
          }}
          className={`${inputCls} w-auto bg-white`}
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
          className={`${inputCls} w-auto bg-white`}
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
          disabled={!placeId || full}
          className={`${btnCls} disabled:opacity-50`}
        >
          + Tambah
        </button>
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className="text-sm text-blue-600 hover:underline"
        >
          {customOpen ? "tutup" : "+ tempat baru / unggah foto"}
        </button>
      </div>

      {customOpen && (
        <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          {/* Photo: upload file or paste URL, with preview */}
          <div className="flex items-start gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {cUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">
                  preview
                </span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label
                className={`${btnSecondaryCls} cursor-pointer ${uploading ? "opacity-60" : ""}`}
              >
                {uploading ? "Mengunggah…" : cUrl ? "Ganti foto" : "Unggah foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files?.[0])}
                />
              </label>
              <input
                value={cUrl}
                onChange={(e) => setCUrl(e.target.value)}
                placeholder="atau tempel URL gambar"
                className={`${inputCls}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Nama tempat" className={`${inputCls} flex-1`} />
            <input value={cCity} onChange={(e) => setCCity(e.target.value)} placeholder={`Kota (${city || "—"})`} className={`${inputCls} w-32`} />
          </div>
          <input value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Deskripsi singkat" className={inputCls} />

          {cErr && <ErrorNote message={cErr} />}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={saveGallery}
                onChange={(e) => setSaveGallery(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Simpan ke galeri tempat (bisa dipakai lagi)
            </label>
            <button
              type="button"
              onClick={addCustom}
              disabled={!cName.trim() || uploading || saving || full}
              className={`${btnCls} disabled:opacity-50`}
            >
              {saving ? "Menyimpan…" : "+ Tambah"}
            </button>
          </div>
        </div>
      )}

      {/* 4 photo slots — filled cards are draggable; empties show capacity */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: MAX_DAY_PHOTOS }).map((_, i) => {
          const p = added[i];
          if (!p) {
            return (
              <div
                key={`empty-${i}`}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors ${
                  dragActive
                    ? "border-[#F5C518] bg-[#FFFCEF]"
                    : "border-gray-200 bg-white"
                }`}
              >
                <span className="text-lg font-semibold text-gray-300">
                  {i + 1}
                </span>
                <span className="px-1 text-[10px] leading-tight text-gray-400">
                  Tarik / pilih foto
                </span>
              </div>
            );
          }
          return (
            <div
              key={p.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <div
                draggable
                onDragStart={(e) =>
                  setDragData(e, { kind: "move", fromDayId: dayId, place: p })
                }
                onPointerDown={(e) =>
                  touch.begin(
                    e,
                    { kind: "move", fromDayId: dayId, place: p },
                    { label: p.name, image: p.image }
                  )
                }
                style={{ touchAction: "pan-y" }}
                title="Tarik ke hari lain untuk memindahkan"
                className="group relative aspect-square cursor-grab active:cursor-grabbing"
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-400">
                    tanpa foto
                  </span>
                )}
                <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1B2A4A]/80 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-[10px] text-white hover:bg-black/75"
                  aria-label="Hapus tempat"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1 p-1.5">
                <input
                  value={p.name}
                  onChange={(e) => onPatch(p.id, { name: e.target.value })}
                  placeholder="Nama tempat"
                  className="w-full rounded border border-transparent bg-gray-50 px-1.5 py-1 text-xs font-medium text-[#1B2A4A] focus:border-gray-300 focus:outline-none"
                />
                <textarea
                  value={p.desc}
                  onChange={(e) => onPatch(p.id, { desc: e.target.value })}
                  rows={2}
                  placeholder="Deskripsi singkat…"
                  className="w-full resize-none rounded border border-transparent bg-gray-50 px-1.5 py-1 text-[11px] leading-snug text-gray-600 focus:border-gray-300 focus:outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
