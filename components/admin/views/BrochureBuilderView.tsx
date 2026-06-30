"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/admin/Modal";
import TemplatePickerModal from "@/components/admin/TemplatePickerModal";
import { inputCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import { uploadPlaceImage } from "@/lib/admin/storage";
import { loadOrderDoc, saveOrderDoc, clearOrderDoc } from "@/lib/admin/orderDocs";
import { pickerRow, type PickerRowData } from "@/lib/admin/docLibrary.labels";
import {
  createTemplate,
  listTemplates,
  loadTemplate,
  saveTemplate,
} from "@/lib/admin/docLibrary";
import { groupPlaces, type Place } from "@/lib/admin/places";
import {
  groupHotels,
  groupAttractions,
  type HotelRate,
  type Attraction,
} from "@/lib/admin/priceBook";
import BrochureDoc from "@/components/admin/BrochureDoc";
import {
  DEFAULT_FLEET,
  DEFAULT_META,
  DEFAULT_NOTES,
  MAX_CITY_DESTINATIONS,
  type BrochureCity,
  type BrochureMeta,
  type CatalogItem,
  type FleetItem,
} from "@/lib/admin/brochure";

const DRAFT_KEY = "kt-brochure-draft";
/** Custom drag MIME carrying a photo URL (city thumbnail → cover slot). */
const IMG_URL_MIME = "application/x-kt-image-url";

function newId() {
  return crypto.randomUUID();
}

export interface BrochureDraft {
  meta: BrochureMeta;
  cities: BrochureCity[];
  fleet: FleetItem[];
  hotels: CatalogItem[];
  attractions: CatalogItem[];
  notes: string;
  /** Library mirror row this order's brochure is synced to. */
  libraryId?: string | null;
}

export default function BrochureBuilderView({
  orderId,
  templateId,
  onExit,
}: {
  /** When set, the brochure loads from / saves to this order. */
  orderId?: string;
  /** Standalone saved-template row edited outside an order. */
  templateId?: string;
  /** Return to the saved Brochure list. */
  onExit?: () => void;
} = {}) {
  const [meta, setMeta] = useState<BrochureMeta>(DEFAULT_META);
  const [cities, setCities] = useState<BrochureCity[]>([]);
  const [fleet, setFleet] = useState<FleetItem[]>(DEFAULT_FLEET);
  const [hotels, setHotels] = useState<CatalogItem[]>([]);
  const [attractions, setAttractions] = useState<CatalogItem[]>([]);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRows, setPickerRows] = useState<PickerRowData[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const hydrated = useRef(false);

  function applyDraft(draft: Partial<BrochureDraft>) {
    setMeta({ ...DEFAULT_META, ...(draft.meta ?? {}) });
    setCities(Array.isArray(draft.cities) ? draft.cities : []);
    setFleet(
      Array.isArray(draft.fleet) && draft.fleet.length
        ? draft.fleet
        : DEFAULT_FLEET
    );
    setHotels(Array.isArray(draft.hotels) ? draft.hotels : []);
    setAttractions(Array.isArray(draft.attractions) ? draft.attractions : []);
    setNotes(typeof draft.notes === "string" ? draft.notes : DEFAULT_NOTES);
    setLibraryId(draft.libraryId ?? null);
  }

  // Restore draft once, then load fresh data and merge in saved overrides.
  // Per-order → order_documents; else localStorage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let draft: Partial<BrochureDraft> | null = null;
      if (orderId) {
        draft = await loadOrderDoc<BrochureDraft>(orderId, "brochure");
        const { data: order } = await createClient()
          .from("orders")
          .select("order_number")
          .eq("id", orderId)
          .maybeSingle();
        if (!cancelled) setOrderNumber(order?.order_number ?? null);
      } else if (templateId) {
        const picked = await loadTemplate<BrochureDraft>(templateId);
        if (picked) {
          setTemplateTitle(picked.title);
          draft = { ...picked.data, libraryId: null };
        }
      } else {
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw) draft = JSON.parse(raw) as BrochureDraft;
        } catch {
          /* ignore corrupt draft */
        }
      }
      if (cancelled) return;

      if (draft) {
        applyDraft(draft);
      }

      const supabase = createClient();
      const savedCities = draft?.cities ?? [];
      const savedHotels = draft?.hotels ?? [];
      const savedAttractions = draft?.attractions ?? [];

      supabase
        .from("places")
        .select("*")
        .order("sort", { ascending: true })
        .then(({ data }) => {
          if (cancelled) return;
          const rows = (data as Place[]) ?? [];
          setCities(mergeCities(groupPlaces(rows), savedCities));
        });

      supabase
        .from("hotel_rates")
        .select("*")
        .order("sort", { ascending: true })
        .then(({ data }) => {
          if (cancelled) return;
          const rows = (data as HotelRate[]) ?? [];
          const items: CatalogItem[] = groupHotels(rows).flatMap((g) =>
            g.hotels.map((h) => ({
              id: h.id,
              city: g.city,
              name: h.name,
              price: h.capital + h.margin,
              enabled: enabledFrom(savedHotels, h.id, true),
            }))
          );
          setHotels(items);
        });

      supabase
        .from("attraction_rates")
        .select("*")
        .order("sort", { ascending: true })
        .then(({ data }) => {
          if (cancelled) return;
          const rows = (data as Attraction[]) ?? [];
          const items: CatalogItem[] = groupAttractions(rows).flatMap((g) =>
            g.items.map((a) => ({
              id: a.id,
              city: g.city,
              name: a.name,
              price: a.price != null ? a.price + a.margin : null,
              enabled: enabledFrom(savedAttractions, a.id, true),
            }))
          );
          setAttractions(items);
        });

      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, templateId]);

  async function persistDraft() {
    const draft: BrochureDraft = {
      meta,
      cities,
      fleet,
      hotels,
      attractions,
      notes,
      libraryId,
    };
    const markSaved = () =>
      setSavedAt(
        new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      );

    if (orderId) {
      let nextLibraryId = libraryId;
      try {
        if (!nextLibraryId) {
          nextLibraryId = await createTemplate(
            "brochure",
            meta.title || "Brosur",
            { ...draft, libraryId: null },
            orderNumber
          );
          if (nextLibraryId) setLibraryId(nextLibraryId);
        } else {
          await saveTemplate(nextLibraryId, meta.title || "Brosur", {
            ...draft,
            libraryId: nextLibraryId,
          });
        }
      } catch {
        /* order_documents remains the source of truth if mirroring fails */
      }
      await saveOrderDoc(orderId, "brochure", {
        ...draft,
        libraryId: nextLibraryId,
      });
      markSaved();
      return;
    }

    if (templateId) {
      await saveTemplate(
        templateId,
        templateTitle.trim() || meta.title || "Brosur",
        { ...draft, libraryId: null }
      );
      markSaved();
      return;
    }

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    markSaved();
  }

  // Autosave (debounced).
  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => {
      void persistDraft();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, templateId, templateTitle, orderNumber, libraryId, meta, cities, fleet, hotels, attractions, notes]);

  const [printing, setPrinting] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  // Shrink the A4 preview to fit narrow (phone) screens. Print resets it to 1.
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

  // Every place photo (across all cities) the admin can pick as the brochure
  // cover, grouped by city. Sourced from the same `places` data that fills the
  // city pages, so the gallery always mirrors the Tempat page. Deduped by URL.
  const photoGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: { city: string; photos: { image: string; name: string }[] }[] = [];
    for (const c of cities) {
      const photos: { image: string; name: string }[] = [];
      for (const d of c.destinations) {
        if (d.image && !seen.has(d.image)) {
          seen.add(d.image);
          photos.push({ image: d.image, name: d.name });
        }
      }
      if (photos.length) groups.push({ city: c.city, photos });
    }
    return groups;
  }, [cities]);
  const photoCount = useMemo(
    () => photoGroups.reduce((n, g) => n + g.photos.length, 0),
    [photoGroups]
  );

  async function printBrochure() {
    if (printing) return;
    setPrinting(true);
    const prev = document.title;
    document.title = `Brosur Keliling Thailand - ${meta.title || "Katalog"}`;

    // Zero the A4 page margin for this print only, so the cover photo bleeds to
    // the paper edge. Each sheet supplies its own inset via padding. Other docs
    // (invoice/itinerary) keep the global 12mm margin since this is removed on
    // afterprint.
    const style = document.createElement("style");
    // Pin A4 + zero margin so the 210×297mm sheets match the page box exactly.
    // Without an explicit `size`, the browser falls back to the OS default paper
    // (often US Letter, 279mm) — shorter than the sheets, which clips content
    // and can emit a stray trailing page. The sheet sizing + per-page break
    // rules live in globals.css (.kt-brochure-sheet / .kt-brochure-page-frame),
    // identical to the itinerary print path — one full-height 296mm sheet per
    // page, no scaling. (An earlier Safari-targeted scale-into-270mm-frame hack
    // caused each sheet to leave a ~27mm blank strip and overflow onto a second
    // page, doubling the page count — removed.)
    style.textContent =
      "@media print { @page { size: A4 !important; margin: 0 !important; } .kt-brochure-fit { width: auto !important; zoom: 1 !important; } }";
    document.head.appendChild(style);

    const restore = () => {
      document.title = prev;
      style.remove();
      window.removeEventListener("afterprint", restore);
      setPrinting(false);
    };
    window.addEventListener("afterprint", restore);

    // Wait for every photo to finish loading/decoding before opening the print
    // dialog — otherwise Chrome snapshots the page mid-load and the cover, logo,
    // and gallery photos come out blank in the PDF.
    try {
      await waitForImages();
    } catch {
      /* print anyway — a missing photo beats a hung button */
    }
    window.print();
  }

  async function openPicker() {
    setPickerOpen(true);
    setPickerLoading(true);
    const rows = await listTemplates<BrochureDraft>("brochure");
    setPickerRows(rows.map((row) => pickerRow(row)));
    setPickerLoading(false);
  }

  async function pickTemplate(id: string) {
    setPickerOpen(false);
    const picked = await loadTemplate<BrochureDraft>(id);
    if (!picked) return;
    if (!confirm("Ganti isi brosur dengan yang dipilih?")) return;
    applyDraft({ ...picked.data, libraryId });
  }

  async function exitTemplate() {
    if (templateId) await persistDraft();
    onExit?.();
  }

  function resetAll() {
    if (!confirm("Reset brosur ke data terbaru dan hapus perubahan?")) return;
    if (orderId) {
      clearOrderDoc(orderId, "brochure").then(() => window.location.reload());
    } else if (templateId) {
      applyDraft({
        meta: DEFAULT_META,
        cities: [],
        fleet: DEFAULT_FLEET,
        hotels: [],
        attractions: [],
        notes: DEFAULT_NOTES,
        libraryId: null,
      });
    } else {
      localStorage.removeItem(DRAFT_KEY);
      window.location.reload();
    }
  }

  // ── City mutators ──
  function patchCity(id: string, patch: Partial<BrochureCity>) {
    setCities((arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function toggleCity(id: string) {
    setCities((arr) => arr.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
  }
  function toggleDest(cityId: string, destId: string) {
    setCities((arr) =>
      arr.map((c) =>
        c.id === cityId
          ? {
              ...c,
              destinations: c.destinations.map((d) =>
                d.id === destId ? { ...d, _off: !d._off } : d
              ),
            }
          : c
      )
    );
  }
  function moveCity(id: string, dir: -1 | 1) {
    setCities((arr) => {
      const i = arr.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  // ── Fleet mutators ──
  function patchFleet(id: string, patch: Partial<FleetItem>) {
    setFleet((arr) => arr.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  // ── Catalog mutators ──
  function toggleItem(
    setter: React.Dispatch<React.SetStateAction<CatalogItem[]>>,
    id: string
  ) {
    setter((arr) => arr.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)));
  }

  // Strip the editor-only `_off` flag → filtered destinations for the doc.
  const docCities: BrochureCity[] = cities.map((c) => ({
    ...c,
    destinations: c.destinations.filter((d) => !d._off),
  }));

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
              ← Daftar brosur
            </button>
          )}
          {templateId ? (
            <input
              value={templateTitle}
              onChange={(event) => setTemplateTitle(event.target.value)}
              placeholder={meta.title || "Nama brosur"}
              className="block w-full max-w-md bg-transparent text-2xl font-bold text-[#1B2A4A] outline-none placeholder:text-gray-300 focus:border-b focus:border-[#F5C518]"
            />
          ) : (
            <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Brosur</h1>
          )}
          <p className="text-sm text-gray-500">
            Katalog perusahaan: kota &amp; destinasi unggulan, armada, hotel, dan
            tiket. Atur isi, lalu Print / Simpan PDF.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {orderId && (
            <button
              type="button"
              onClick={openPicker}
              className={btnSecondaryCls}
            >
              Pilih dari tersimpan
            </button>
          )}
          {savedAt && (
            <span className="hidden text-xs text-gray-400 sm:inline">
              Tersimpan · {savedAt}
            </span>
          )}
          <button
            type="button"
            onClick={resetAll}
            className="text-sm font-medium text-red-500 hover:underline"
          >
            Reset
          </button>
          {templateId && (
            <button
              type="button"
              onClick={() => void persistDraft()}
              className={btnSecondaryCls}
            >
              Simpan
            </button>
          )}
          <button
            type="button"
            onClick={printBrochure}
            disabled={printing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#1B2A4A] hover:brightness-95 disabled:opacity-60"
          >
            {printing ? "Menyiapkan…" : "Print / Simpan PDF"}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 min-[1280px]:grid-cols-[minmax(380px,1fr)_minmax(0,820px)] print:block">
        {/* Editor column — sticks to the top so the controls stay in view while
            scrolling the tall multi-page preview. Scrolls within itself if the
            form is taller than the viewport. */}
        <div className="no-print space-y-5 min-[1280px]:sticky min-[1280px]:top-6 min-[1280px]:self-start min-[1280px]:max-h-[calc(100vh-3rem)] min-[1280px]:overflow-y-auto min-[1280px]:pr-1">
          {/* 1 — Cover */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="1" title="Sampul" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Judul brosur">
                <input
                  value={meta.title}
                  onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                  className={inputCls}
                />
              </Labeled>
              <Labeled label="Edisi">
                <input
                  value={meta.edition}
                  onChange={(e) => setMeta((m) => ({ ...m, edition: e.target.value }))}
                  className={inputCls}
                />
              </Labeled>
              <Labeled label="Subjudul" full>
                <input
                  value={meta.subtitle}
                  onChange={(e) => setMeta((m) => ({ ...m, subtitle: e.target.value }))}
                  className={inputCls}
                />
              </Labeled>
              <div className="sm:col-span-2">
                <ImageSlot
                  label="Foto sampul"
                  folder="brochure"
                  value={meta.coverImage}
                  aspect="aspect-[16/7]"
                  onChange={(v) => setMeta((m) => ({ ...m, coverImage: v }))}
                  droppable
                  hoverUpload
                />
                <button
                  type="button"
                  onClick={() => setCoverPickerOpen(true)}
                  className="group mt-2 flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-[#1B2A4A]/40 hover:bg-[#F8FAFF]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1B2A4A]/5 text-base transition-colors group-hover:bg-[#F5C518]">
                    🖼
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#1B2A4A]">
                      Pilih dari galeri tempat
                    </span>
                    <span className="block text-xs text-gray-400">
                      {photoCount > 0
                        ? `${photoCount} foto tersedia dari halaman Tempat`
                        : "Belum ada foto tempat"}
                    </span>
                  </span>
                  <span className="shrink-0 text-gray-300 transition-colors group-hover:text-[#1B2A4A]">
                    →
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* 2 — Cities */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="2" title="Kota & destinasi" />
            <p className="text-xs text-gray-500">
              Diisi otomatis dari galeri Tempat. Matikan kota/destinasi yang tak
              perlu, tulis deskripsi kota, urutkan. Maks {MAX_CITY_DESTINATIONS}{" "}
              destinasi tampil per kota.
            </p>
            {cities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-400">
                Belum ada tempat. Tambah foto di tab Tempat dulu.
              </p>
            ) : (
              <div className="space-y-3">
                {cities.map((c, i) => (
                  <CityCard
                    key={c.id}
                    city={c}
                    isFirst={i === 0}
                    isLast={i === cities.length - 1}
                    onToggle={() => toggleCity(c.id)}
                    onPatch={(patch) => patchCity(c.id, patch)}
                    onToggleDest={(destId) => toggleDest(c.id, destId)}
                    onMove={(dir) => moveCity(c.id, dir)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 3 — Fleet */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="3" title="Armada" />
            <div className="space-y-3">
              {fleet.map((f) => (
                <FleetCard key={f.id} item={f} onPatch={(p) => patchFleet(f.id, p)} />
              ))}
            </div>
          </section>

          {/* 4 — Hotels & tickets */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="4" title="Hotel & tiket" />
            <CatalogToggle
              title="Hotel partner"
              items={hotels}
              onToggle={(id) => toggleItem(setHotels, id)}
            />
            <CatalogToggle
              title="Tiket atraksi"
              items={attractions}
              onToggle={(id) => toggleItem(setAttractions, id)}
            />
          </section>

          {/* 5 — Notes */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="5" title="Catatan (termasuk / ketentuan)" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={inputCls}
            />
          </section>
        </div>

        {/* Preview column */}
        <div>
          <div
            ref={previewHostRef}
            className="w-full overflow-hidden print:overflow-visible"
          >
            <div
              className="kt-brochure-fit mx-auto w-[794px] print:w-auto print:min-w-0"
              style={{ zoom: previewScale }}
            >
              <BrochureDoc
                meta={meta}
                cities={docCities}
                fleet={fleet}
                hotels={hotels}
                attractions={attractions}
                notes={notes}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        title="Pilih foto sampul dari galeri tempat"
        wide
      >
        {photoCount === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <p className="text-3xl">🏞️</p>
            <p className="mt-2 text-sm font-medium text-[#1B2A4A]">Belum ada foto tempat</p>
            <p className="mt-1 text-xs text-gray-400">
              Tambah foto destinasi di tab Tempat, lalu pilih di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-xs text-gray-400">
              Klik foto untuk menjadikannya sampul brosur.
            </p>
            {photoGroups.map((g) => (
              <section
                key={g.city}
                className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/60"
              >
                <div className="flex items-center gap-2 border-b border-gray-200 bg-[#1B2A4A] px-4 py-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5C518] text-[11px]">
                    📍
                  </span>
                  <h3 className="text-sm font-bold tracking-tight text-white">{g.city}</h3>
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80">
                    {g.photos.length} foto
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
                  {g.photos.map((p) => {
                    const selected = meta.coverImage === p.image;
                    return (
                      <button
                        key={p.image}
                        type="button"
                        onClick={() => {
                          setMeta((m) => ({ ...m, coverImage: p.image }));
                          setCoverPickerOpen(false);
                        }}
                        title={`Jadikan sampul: ${p.name}`}
                        className={`group relative aspect-[4/3] overflow-hidden rounded-xl ring-2 transition-all ${
                          selected
                            ? "ring-[#F5C518]"
                            : "ring-transparent hover:ring-[#1B2A4A]/20"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 via-black/25 to-transparent px-2.5 pb-1.5 pt-5 text-left text-[11px] font-medium text-white">
                          {p.name}
                        </span>
                        {selected ? (
                          <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#F5C518] text-[12px] font-bold text-[#1B2A4A] shadow">
                            ✓
                          </span>
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center bg-[#1B2A4A]/0 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:bg-[#1B2A4A]/35 group-hover:opacity-100">
                            Jadikan sampul
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </Modal>

      <TemplatePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pilih brosur tersimpan"
        rows={pickerRows}
        loading={pickerLoading}
        onPick={pickTemplate}
      />
    </div>
  );
}

// ── Helpers: merge fresh data with saved draft overrides ──────

/** Resolve once every <img> on the page has loaded (or errored). Decoding is
 *  awaited too so the print snapshot has fully-painted photos. */
async function waitForImages(): Promise<void> {
  const imgs = Array.from(document.images);
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return img.decode().catch(() => undefined);
      }
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    })
  );
}

function enabledFrom(saved: CatalogItem[], id: string, fallback: boolean): boolean {
  const found = saved.find((s) => s.id === id);
  return found ? found.enabled : fallback;
}

/** Rebuild city sections from fresh places, carrying over saved intro/order/toggles. */
function mergeCities(
  groups: { city: string; items: Place[] }[],
  saved: BrochureCity[]
): BrochureCity[] {
  const savedByCity = new Map(saved.map((c) => [c.city, c]));
  const merged = groups.map((g) => {
    const prev = savedByCity.get(g.city);
    const prevDest = new Map((prev?.destinations ?? []).map((d) => [d.id, d]));
    return {
      id: prev?.id ?? newId(),
      city: g.city,
      enabled: prev?.enabled ?? true,
      intro: prev?.intro ?? "",
      cover: prev?.cover ?? "",
      destinations: g.items.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image_url ?? "",
        desc: p.description ?? "",
        _off: prevDest.get(p.id)?._off ?? false,
      })),
    };
  });
  // Preserve saved city order where possible.
  if (saved.length) {
    const order = new Map(saved.map((c, i) => [c.city, i]));
    merged.sort((a, b) => (order.get(a.city) ?? 999) - (order.get(b.city) ?? 999));
  }
  return merged;
}

// ── Presentational sub-components ─────────────────────────────

function StepHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B2A4A]/10 text-sm font-bold text-[#1B2A4A]">
        {n}
      </span>
      <h2 className="font-bold text-[#1B2A4A]">{title}</h2>
    </div>
  );
}

function Labeled({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function CityCard({
  city,
  isFirst,
  isLast,
  onToggle,
  onPatch,
  onToggleDest,
  onMove,
}: {
  city: BrochureCity;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<BrochureCity>) => void;
  onToggleDest: (destId: string) => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const shownList = city.destinations.filter((d) => !d._off);
  const shown = shownList.length;
  const printed = shownList.slice(0, MAX_CITY_DESTINATIONS);
  const printedIds = new Set(printed.map((d) => d.id));
  // The cover can be ANY of the city's photos, even one not shown on the page.
  // Default highlight: the admin's pick if it's still a valid photo, else the
  // first shown photo. Mirrors CityPage's hero fallback.
  const effectiveCover =
    (city.cover && city.destinations.some((d) => d.image === city.cover) && city.cover) ||
    printed.find((d) => d.image)?.image ||
    city.destinations.find((d) => d.image)?.image ||
    "";
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function onGenerateIntro() {
    if (aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const places = city.destinations.filter((d) => !d._off).map((d) => d.name);
      const res = await fetch("/api/city-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.city, places }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal generate.");
      if (data.description) onPatch({ intro: data.description });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal generate.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div
      className={`rounded-xl border ${
        city.enabled ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-70"
      }`}
    >
      <div className="flex items-center gap-2 rounded-t-xl bg-[#1B2A4A] px-3 py-2 text-white">
        <input
          type="checkbox"
          checked={city.enabled}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 rounded border-gray-300"
        />
        <span className="flex-1 truncate text-sm font-semibold">{city.city}</span>
        <span className="shrink-0 text-[11px] text-white/60">
          {shown}/{Math.min(city.destinations.length, MAX_CITY_DESTINATIONS)} tampil
        </span>
        <div className="flex shrink-0 items-center gap-1 pl-1">
          <button
            type="button"
            aria-label="Naikkan"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="text-white/70 hover:text-white disabled:opacity-25"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Turunkan"
            onClick={() => onMove(1)}
            disabled={isLast}
            className="text-white/70 hover:text-white disabled:opacity-25"
          >
            ↓
          </button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Deskripsi kota</span>
            <button
              type="button"
              onClick={onGenerateIntro}
              disabled={aiBusy}
              className="inline-flex items-center gap-1 rounded-full border border-[#1B2A4A]/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1B2A4A] transition-colors hover:border-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white disabled:opacity-50"
            >
              {aiBusy ? "Membuat…" : "✦ Tulis dengan AI"}
            </button>
          </div>
          <textarea
            value={city.intro}
            onChange={(e) => onPatch({ intro: e.target.value })}
            rows={2}
            placeholder={`Deskripsi singkat ${city.city}…`}
            className={inputCls}
          />
          <ErrorNote message={aiError} />
        </div>
        <p className="text-[11px] text-gray-400">
          Klik foto = tampil/sembunyikan · ★ = jadikan sampul kota
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {city.destinations.map((d) => {
            const off = !!d._off;
            const isPrinted = printedIds.has(d.id);
            const capped = !off && !isPrinted;
            const isCover = !!d.image && d.image === effectiveCover;
            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => onToggleDest(d.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggleDest(d.id);
                  }
                }}
                draggable={!!d.image}
                onDragStart={(e) => {
                  if (!d.image) return;
                  e.dataTransfer.setData(IMG_URL_MIME, d.image);
                  e.dataTransfer.setData("text/plain", d.image);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                title={d.image ? `${d.name} — tarik ke foto sampul` : d.name}
                className={`group relative overflow-hidden rounded-lg border text-left transition-opacity ${
                  isCover ? "border-[#1B2A4A] ring-2 ring-[#1B2A4A]" : off ? "border-gray-200 opacity-40" : "border-[#F5C518]"
                } ${d.image ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
              >
                <div className="aspect-square bg-gray-100">
                  {d.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] text-gray-400">
                      {d.name}
                    </span>
                  )}
                </div>
                {/* Cover star — available on every photo, even ones not shown
                    on the city page (the cover is independent of the grid). */}
                {d.image && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPatch({ cover: city.cover === d.image ? "" : d.image });
                    }}
                    title={isCover ? "Sampul kota saat ini" : "Jadikan sampul kota"}
                    className={`absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] leading-none ${
                      isCover ? "bg-[#F5C518] text-[#1B2A4A]" : "bg-black/55 text-white hover:bg-black/75"
                    }`}
                  >
                    {isCover ? "★" : "☆"}
                  </button>
                )}
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-[10px] text-white">
                  {off ? "+" : "✓"}
                </span>
                <p className="truncate px-1.5 py-1 text-[10px] font-medium text-[#1B2A4A]">
                  {d.name}
                  {capped && <span className="text-gray-400"> · lebih</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FleetCard({
  item,
  onPatch,
}: {
  item: FleetItem;
  onPatch: (patch: Partial<FleetItem>) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        item.enabled ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-70"
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={item.enabled}
          onChange={() => onPatch({ enabled: !item.enabled })}
          className="h-4 w-4 rounded border-gray-300"
        />
        <input
          value={item.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder="Nama kendaraan"
          className="min-w-0 flex-1 rounded border border-transparent bg-gray-50 px-2 py-1 text-sm font-semibold text-[#1B2A4A] focus:border-gray-300 focus:outline-none"
        />
        <input
          value={item.capacity}
          onChange={(e) => onPatch({ capacity: e.target.value })}
          placeholder="1–9 penumpang"
          className="w-32 rounded border border-transparent bg-gray-50 px-2 py-1 text-xs text-gray-600 focus:border-gray-300 focus:outline-none"
        />
      </div>
      <div className="mt-2 flex gap-3">
        <ImageSlot
          label=""
          folder="fleet"
          value={item.image}
          aspect="aspect-[4/3] w-28 shrink-0"
          onChange={(v) => onPatch({ image: v })}
          compact
        />
        <textarea
          value={item.blurb}
          onChange={(e) => onPatch({ blurb: e.target.value })}
          rows={3}
          placeholder="Deskripsi singkat kendaraan…"
          className={`${inputCls} flex-1`}
        />
      </div>
    </div>
  );
}

function CatalogToggle({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: CatalogItem[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold text-[#1B2A4A]">{title}</p>
        <p className="mt-1 text-xs text-gray-400">Belum ada data (isi di Daftar Harga).</p>
      </div>
    );
  }
  const on = items.filter((i) => i.enabled).length;
  return (
    <div>
      <p className="text-sm font-semibold text-[#1B2A4A]">
        {title} <span className="text-xs font-normal text-gray-400">· {on}/{items.length} tampil</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              it.enabled
                ? "border-[#1B2A4A] bg-[#1B2A4A] text-white"
                : "border-gray-300 bg-white text-gray-400"
            }`}
          >
            {it.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Image upload / paste slot ─────────────────────────────────

function ImageSlot({
  label,
  folder,
  value,
  aspect,
  onChange,
  compact,
  droppable,
  hoverUpload,
}: {
  label: string;
  folder: string;
  value: string;
  aspect: string;
  onChange: (v: string) => void;
  compact?: boolean;
  /** Accept dropped image files (from desktop) or a dragged photo URL. */
  droppable?: boolean;
  /** Drop the "Ganti"/URL row; upload by hovering the photo and clicking the
   *  "Unggah foto baru" overlay (or clicking the empty placeholder). */
  hoverUpload?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      onChange(await uploadPlaceImage(file, folder));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setUploading(false);
    }
  }

  function onDragOver(e: React.DragEvent) {
    if (!droppable) return;
    const dt = e.dataTransfer;
    if (
      dt.types.includes("Files") ||
      dt.types.includes(IMG_URL_MIME) ||
      dt.types.includes("text/uri-list")
    ) {
      e.preventDefault();
      setOver(true);
    }
  }
  function onDrop(e: React.DragEvent) {
    if (!droppable) return;
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onUpload(file);
      return;
    }
    const url =
      e.dataTransfer.getData(IMG_URL_MIME) ||
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");
    if (url && /^(https?:|\/)/.test(url.trim())) onChange(url.trim());
  }

  return (
    <div>
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      )}
      <div
        onDragOver={onDragOver}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
        onDrop={onDrop}
        className={`group relative flex ${aspect} items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          over
            ? "border-[#F5C518] bg-[#FFFCEF]"
            : value
              ? "border-transparent"
              : "border-gray-300 bg-gray-50"
        }`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className={`h-full w-full ${compact ? "object-contain p-1" : "object-cover"}`}
            />
            {hoverUpload && (
              // Hover the photo → reveal a full-cover upload label. Click anywhere
              // on the photo opens the file picker and replaces the cover.
              <label
                className={`absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 ${
                  uploading ? "opacity-100" : ""
                }`}
              >
                <span className="text-lg">⬆</span>
                <span className="text-xs font-semibold">
                  {uploading ? "Mengunggah…" : "Unggah foto baru"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files?.[0])}
                />
              </label>
            )}
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
              aria-label="Hapus foto"
            >
              ✕
            </button>
          </>
        ) : hoverUpload ? (
          // Empty: the whole box is the upload trigger.
          <label className="flex h-full w-full cursor-pointer items-center justify-center px-2 text-center text-xs text-gray-400 hover:text-[#1B2A4A]">
            {uploading ? "Mengunggah…" : "Unggah foto sampul, atau tarik foto ke sini"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
          </label>
        ) : (
          <span className="px-2 text-center text-xs text-gray-400">
            {compact
              ? "Foto"
              : droppable
                ? "Tarik foto ke sini, atau unggah"
                : "Unggah foto sampul"}
          </span>
        )}
      </div>
      {!hoverUpload && (
        <div className="mt-1.5 flex items-center gap-2">
          <label
            className={`${btnSecondaryCls} cursor-pointer ${compact ? "px-2 py-1 text-xs" : ""} ${
              uploading ? "opacity-60" : ""
            }`}
          >
            {uploading ? "Mengunggah…" : value ? "Ganti" : "Unggah"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
          </label>
          {!compact && (
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="atau tempel URL"
              className={`${inputCls} flex-1`}
            />
          )}
        </div>
      )}
      <ErrorNote message={err} />
    </div>
  );
}
