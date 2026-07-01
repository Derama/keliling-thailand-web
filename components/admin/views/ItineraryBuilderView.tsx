"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import { isoLocal } from "@/lib/admin/utils";
import { uploadPlaceImage } from "@/lib/admin/storage";
import { loadOrderDoc, saveOrderDoc, clearOrderDoc } from "@/lib/admin/orderDocs";
import {
  loadItinerary,
  saveItinerary,
  listItineraries,
  createItinerary,
} from "@/lib/admin/itineraryLibrary";
import TemplatePickerModal from "@/components/admin/TemplatePickerModal";
import { pickerRow, type PickerRowData } from "@/lib/admin/docLibrary.labels";
import { loadSetting, saveSetting } from "@/lib/admin/settings";
import DateField from "@/components/admin/DateField";
import ItineraryDoc from "@/components/admin/ItineraryDoc";
import {
  type ItineraryDay,
  type ItineraryActivity,
  type ItineraryPlace,
  type TravelTip,
  mergeAiSchedule,
  scheduleFromPlaces,
  insertByTime,
  MEAL_STOPS,
  DEFAULT_TRAVEL_TIPS,
} from "@/lib/admin/itinerary";
import type { Place } from "@/lib/admin/places";
import { composeItineraryPrompt } from "@/lib/admin/itineraryGeneration";
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

/**
 * Wait for every <img> in the printed document to load AND decode before opening
 * the print dialog. Remote photos (cover hero, attractions) can take longer than
 * a paint frame; printing before they decode bakes a blank into the PDF. Each
 * image gets a generous per-image cap so one broken/slow photo can't hang the
 * button, but the cap is long enough that a normal cover always makes it in.
 */
async function waitForImages(root: ParentNode, timeoutMs = 8000): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img")).filter(
    (img) => img.currentSrc || img.src
  );
  if (imgs.length === 0) return;
  await Promise.all(
    imgs.map((img) => {
      const settled = new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) {
          // Loaded — still force a decode so it's painted, not just fetched.
          img.decode().then(() => resolve(), () => resolve());
          return;
        }
        img.addEventListener(
          "load",
          () => img.decode().then(() => resolve(), () => resolve()),
          { once: true }
        );
        img.addEventListener("error", () => resolve(), { once: true });
      });
      const cap = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
      return Promise.race([settled, cap]);
    })
  );
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
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
  galleryImages: string[];
  travelTips: TravelTip[];
  showTravelTips: boolean;
  /** Library mirror row (itineraries table) this order's itinerary syncs to. */
  mirrorId?: string | null;
}

export default function ItineraryBuilderView({
  orderId,
  libraryId,
  onExit,
}: {
  /** When set, the draft loads from / saves to this order. */
  orderId?: string;
  /** When set, the draft loads from / saves to this library itinerary row. */
  libraryId?: string;
  /** Shown as a "back to list" affordance in library mode. */
  onExit?: () => void;
} = {}) {
  // Library mode: a manual name for the saved itinerary (column, not in Draft).
  const [title, setTitle] = useState("");
  const [tripTitle, setTripTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [pax, setPax] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicle, setVehicle] = useState("VAN");
  const [heroImage, setHeroImage] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [travelTips, setTravelTips] = useState<TravelTip[]>(DEFAULT_TRAVEL_TIPS);
  const [showTravelTips, setShowTravelTips] = useState(true);
  // Global default tips (saved template) — seeds new drafts + the Reset action.
  const [defaultTips, setDefaultTips] = useState<TravelTip[]>(DEFAULT_TRAVEL_TIPS);
  const [savingTips, setSavingTips] = useState(false);
  const [tipsSaved, setTipsSaved] = useState(false);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // AI edit-in-place: refine the existing itinerary without a full rebuild.
  const [editPrompt, setEditPrompt] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [qDays, setQDays] = useState(3);
  const [qDest, setQDest] = useState<string[]>([]);
  // True once the admin sets/uploads a cover manually — stops AI from overwriting it.
  const [coverManual, setCoverManual] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  // Library mirror (orderId mode): one itineraries row per order, autosaved in
  // sync. Distinct from the `libraryId` prop, which is the library-edit mode.
  const [mirrorId, setMirrorId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRowsState, setPickerRowsState] = useState<PickerRowData[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const hydrated = useRef(false);
  // Wraps the printable doc so we only wait on its images, not the editor gallery.
  const docRef = useRef<HTMLDivElement>(null);
  const previewHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;

    const updateScale = () => {
      setPreviewScale(Math.min(1, host.clientWidth / 858));
    };
    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(host);
    return () => observer.disconnect();
  }, [days.length]);

  // Load attractions for the per-day place picker.
  useEffect(() => {
    createClient()
      .from("places")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data }) => setPlaces((data as Place[]) ?? []));
  }, []);

  function applyDraft(d: Draft) {
    setTripTitle(d.tripTitle ?? "");
    setCustomer(d.customer ?? "");
    setPax(d.pax ?? "");
    setStartDate(d.startDate ?? "");
    setNotes(d.notes ?? "");
    setVehicle(d.vehicle ?? "VAN");
    setHeroImage(d.heroImage ?? "");
    setGalleryImages(Array.isArray(d.galleryImages) ? d.galleryImages : []);
    setTravelTips(
      Array.isArray(d.travelTips) ? d.travelTips : DEFAULT_TRAVEL_TIPS
    );
    setShowTravelTips(d.showTravelTips ?? true);
    setDays(Array.isArray(d.days) ? d.days : []);
    setMirrorId(d.mirrorId ?? null);
  }

  // Restore draft once on mount. Per-order → DB (order_documents); else
  // localStorage. A fresh per-order doc is seeded from the order's basics.
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      // Seed tips from the saved global template; a loaded draft overrides below.
      const storedTips = await loadSetting<TravelTip[]>("itinerary_travel_tips");
      if (cancelled) return;
      if (Array.isArray(storedTips) && storedTips.length) {
        setDefaultTips(storedTips);
        setTravelTips(storedTips);
      }
      if (orderId) {
        const saved = await loadOrderDoc<Draft>(orderId, "itinerary");
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
            setCustomer(o.customers?.name ?? "");
            setPax(o.pax ? String(o.pax) : "");
            setStartDate(o.trip_start ?? "");
            if (o.vehicle) setVehicle(o.vehicle);
            // Seed customer-facing days from the itinerary typed on the order:
            // one day per non-blank line, prefix ("Hari N:") stripped into title.
            const lines: string[] = (o.itinerary ?? "")
              .split("\n")
              .map((l: string) => l.trim())
              .filter(Boolean);
            if (lines.length) {
              setDays(
                lines.map((line, i) => ({
                  id: newId(),
                  title: line.replace(
                    /^(hari|day)\s*\d+\s*[:.)-]?\s*|^\d+\s*[:.)-]\s*/i,
                    ""
                  ),
                  date: addDaysIso(o.trip_start ?? "", i),
                  activities: [],
                  places: [],
                }))
              );
            }
          }
        }
      } else if (libraryId) {
        const saved = await loadItinerary<Draft>(libraryId);
        if (cancelled) return;
        if (saved) {
          setTitle(saved.title);
          if (saved.data && Object.keys(saved.data).length) applyDraft(saved.data);
        }
      } else {
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw) applyDraft(JSON.parse(raw) as Draft);
        } catch {
          /* ignore corrupt draft */
        }
      }
      if (!cancelled) hydrated.current = true;
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [orderId, libraryId]);

  // Snapshot the current editor state into a Draft.
  const buildDraft = useCallback(
    (): Draft => ({
      tripTitle,
      customer,
      pax,
      startDate,
      notes,
      vehicle,
      heroImage,
      days,
      galleryImages,
      travelTips,
      showTravelTips,
      mirrorId,
    }),
    [tripTitle, customer, pax, startDate, notes, vehicle, heroImage, days, galleryImages, travelTips, showTravelTips, mirrorId]
  );

  // Persist a draft to the active target (order doc / library row / localStorage).
  const persist = useCallback(
    async (draft: Draft): Promise<void> => {
      if (orderId) {
        await saveOrderDoc(orderId, "itinerary", draft);
        // Mirror into the itinerary library so the order's itinerary is also a
        // reusable, named entry (appears in the standalone Itinerary tab).
        try {
          const mirrorTitle =
            [tripTitle, customer].filter(Boolean).join(" · ") || "Itinerary";
          if (!mirrorId) {
            const id = await createItinerary(mirrorTitle, {
              ...draft,
              mirrorId: null,
            });
            if (id) setMirrorId(id);
          } else {
            await saveItinerary(mirrorId, mirrorTitle, { ...draft, mirrorId });
          }
        } catch {
          /* mirror is best-effort */
        }
        return;
      }
      if (libraryId) return saveItinerary(libraryId, title, draft);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      return Promise.resolve();
    },
    [orderId, libraryId, title, mirrorId, tripTitle, customer]
  );

  const markSaved = useCallback(() => {
    setSavedAt(
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  // Explicit save — flushes immediately instead of waiting for the debounce.
  async function saveNow() {
    if (saving) return;
    setSaving(true);
    try {
      await persist(buildDraft());
      markSaved();
    } finally {
      setSaving(false);
    }
  }

  // Latest draft + persist, kept in refs so the unmount flush below sees current
  // values without re-subscribing (which would defeat flush-on-unmount).
  const draftRef = useRef<Draft | null>(null);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // Autosave draft (debounced) after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    const draft = buildDraft();
    draftRef.current = draft;
    const t = setTimeout(() => {
      persist(draft).then(markSaved);
    }, 600);
    return () => clearTimeout(t);
  }, [buildDraft, persist, markSaved]);

  // Flush on unmount — the debounced timer above is cancelled when the builder
  // unmounts (modal close / wizard step change), so a pending edit would be lost
  // and the order would reopen blank. Persist the latest draft once on teardown.
  useEffect(
    () => () => {
      if (hydrated.current && draftRef.current) {
        persistRef.current(draftRef.current);
      }
    },
    []
  );

  const hasContent =
    days.length > 0 || tripTitle || customer || notes || aiPrompt;

  const destOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of places) if (p.image_url) set.add(p.city.toUpperCase());
    return [...set].sort();
  }, [places]);

  async function generateWithAI() {
    if (aiBusy) return;
    const effectivePrompt = composeItineraryPrompt({
      customer,
      pax,
      days: qDays,
      destinations: qDest,
      request: aiPrompt,
    });
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
      if (!Array.isArray(data.days) || data.days.length === 0) {
        throw new Error("Respons AI tidak memiliki itinerary harian yang valid.");
      }
      const nextDays: ItineraryDay[] = data.days.map(
        (
          d: {
            title?: string;
            theme?: string;
            city?: string;
            route?: string;
            intro?: string;
            cityHighlight?: string;
            activities?: { time?: string; text?: string }[];
            places?: {
              name?: string;
              image?: string;
              desc?: string;
              activity?: string;
            }[];
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
              activity: p.activity ?? "",
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
            activities: mergeAiSchedule(places, d.activities ?? []),
            places,
          };
        }
      );

      if (data.tripTitle) setTripTitle(data.tripTitle);
      if (typeof data.notes === "string") setNotes(data.notes);
      setDays(nextDays);
      // Set cover from a picked attraction unless the admin set one manually.
      if (data.heroImage && !coverManual) setHeroImage(data.heroImage);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal generate.");
    } finally {
      setAiBusy(false);
    }
  }

  // Refine the existing itinerary with a prompt. The server round-trips ids, so
  // every day/activity/place the AI leaves alone keeps its identity — manual
  // edits and uploaded photos survive. Only what the prompt asks for changes.
  async function editWithAI() {
    if (editBusy || days.length === 0) return;
    const instruction = editPrompt.trim();
    if (!instruction) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const current = {
        tripTitle,
        notes,
        days: days.map((d) => ({
          id: d.id,
          title: d.title,
          theme: d.theme ?? "",
          city: d.city ?? "",
          route: d.route ?? "",
          intro: d.intro ?? "",
          cityHighlight: d.cityHighlight ?? "",
          date: d.date ?? "",
          activities: d.activities.map((a) => ({
            id: a.id,
            time: a.time,
            text: a.text,
          })),
          places: d.places.map((p) => ({
            id: p.id,
            name: p.name,
            activity: p.activity ?? "",
          })),
        })),
      };
      const res = await fetch("/api/itinerary/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal mengubah.");

      // Merge by id: preserve existing place photos/descriptions when the id is
      // unchanged (the AI doesn't know image URLs or our descriptions).
      const placeById = new Map<string, ItineraryPlace>();
      for (const d of days) for (const p of d.places) placeById.set(p.id, p);

      const nextDays: ItineraryDay[] = (data.days ?? []).map(
        (d: {
          id?: string;
          title?: string;
          theme?: string;
          city?: string;
          route?: string;
          intro?: string;
          cityHighlight?: string;
          date?: string;
          activities?: { id?: string; time?: string; text?: string }[];
          places?: {
            id?: string;
            name?: string;
            activity?: string;
            image?: string;
          }[];
        }) => {
          const places: ItineraryPlace[] = (d.places ?? [])
            .slice(0, MAX_DAY_PHOTOS)
            .map((p) => {
              const prev = p.id ? placeById.get(p.id) : undefined;
              return {
                id: p.id || newId(),
                name: p.name ?? prev?.name ?? "",
                image: prev?.image || p.image || "",
                desc: prev?.desc ?? "",
                activity: p.activity ?? prev?.activity ?? "",
              };
            });
          const activities: ItineraryActivity[] = (d.activities ?? []).map(
            (a) => ({ id: a.id || newId(), time: a.time ?? "", text: a.text ?? "" })
          );
          return {
            id: d.id || newId(),
            title: d.title ?? "",
            theme: d.theme ?? "",
            city: d.city ?? "",
            route: d.route ?? "",
            intro: d.intro ?? "",
            cityHighlight: d.cityHighlight ?? "",
            date: d.date ?? "",
            activities,
            places,
          };
        }
      );

      if (typeof data.tripTitle === "string") setTripTitle(data.tripTitle);
      if (typeof data.notes === "string") setNotes(data.notes);
      setDays(nextDays);
      setEditPrompt("");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal mengubah.");
    } finally {
      setEditBusy(false);
    }
  }

  async function printItinerary() {
    if (printing) return;
    setPrinting(true);
    const prev = document.title;
    document.title = [tripTitle || "Itinerary", customer].filter(Boolean).join(" - ");

    // Zero the @page margin for this print only (same as the brochure). With no
    // margin Chrome has nowhere to put its own header/footer (title, date, URL,
    // page numbers) so they disappear, and each 297mm sheet maps to exactly one
    // A4 page. Each interior page supplies its 12mm inset via its own padding.
    // Removed on afterprint so other docs keep the global 12mm margin.
    const style = document.createElement("style");
    style.textContent =
      "@media print { @page { size: A4 !important; margin: 0 !important; } .kt-itinerary-preview { width: auto !important; zoom: 1 !important; } }";
    document.head.appendChild(style);
    await nextPaint();

    const restore = () => {
      document.title = prev;
      style.remove();
      setPrinting(false);
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    // Wait only for any still-loading photos in the doc — otherwise Chrome
    // snapshots mid-load and the cover prints blank.
    try {
      if (docRef.current) await waitForImages(docRef.current);
    } catch {
      /* print anyway — a missing photo beats a hung button */
    }
    window.print();
  }

  async function openPicker() {
    setPickerOpen(true);
    setPickerLoading(true);
    const rows = await listItineraries<Draft>();
    setPickerRowsState(rows.map((r) => pickerRow(r)));
    setPickerLoading(false);
  }

  async function pickFromLibrary(id: string) {
    setPickerOpen(false);
    const picked = await loadItinerary<Draft>(id);
    if (!picked) return;
    if (days.length > 0 && !confirm("Ganti itinerary dengan yang dipilih?"))
      return;
    // Keep this order's own mirror id; load everything else from the source.
    const nextDraft: Draft = { ...picked.data, mirrorId };
    applyDraft(nextDraft);
    // Flush immediately — the debounced autosave gets cancelled if the builder
    // unmounts (modal close / step change) before its 600ms timer fires, which
    // would drop the pick so the order reopens blank.
    await persist(nextDraft);
    markSaved();
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
    setGalleryImages([]);
    setTravelTips(defaultTips);
    setShowTravelTips(true);
    setCoverManual(false);
    setDays([]);
    setAiPrompt("");
    setAiError(null);
    setQDays(3);
    setQDest([]);
    if (orderId) clearOrderDoc(orderId, "itinerary");
    else localStorage.removeItem(DRAFT_KEY);
  }

  // Save the current tips as the global template reused by every new itinerary.
  async function saveTipsAsDefault() {
    if (savingTips) return;
    setSavingTips(true);
    try {
      await saveSetting("itinerary_travel_tips", travelTips);
      setDefaultTips(travelTips);
      setTipsSaved(true);
      setTimeout(() => setTipsSaved(false), 2000);
    } finally {
      setSavingTips(false);
    }
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
      {/* Back to library list (library mode only) */}
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="no-print -mb-2 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-[#1B2A4A]"
        >
          ← Daftar itinerary
        </button>
      )}

      {/* Header / toolbar */}
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {libraryId ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                [tripTitle, customer].filter(Boolean).join(" · ") ||
                "Nama itinerary"
              }
              className="w-full max-w-md bg-transparent text-2xl font-bold text-[#1B2A4A] outline-none placeholder:text-gray-300 focus:border-b focus:border-[#F5C518]"
            />
          ) : (
            <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Itinerary</h1>
          )}
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
          {orderId && (
            <button
              type="button"
              onClick={openPicker}
              className={btnSecondaryCls}
            >
              Pilih dari tersimpan
            </button>
          )}
          <button
            type="button"
            onClick={saveNow}
            disabled={saving}
            className={`${btnSecondaryCls} disabled:opacity-50`}
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
          <button
            type="button"
            onClick={printItinerary}
            disabled={days.length === 0 || printing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#1B2A4A] hover:brightness-95 disabled:opacity-50"
          >
            {printing ? "Menyiapkan…" : "Download PDF"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 min-[1500px]:grid-cols-[minmax(360px,440px)_minmax(858px,1fr)] print:block">
        {/* ── Editor column ── */}
        <TouchDragProvider onDrop={handleDropOnDay}>
        <div className="no-print space-y-5 min-[1500px]:sticky min-[1500px]:top-6 min-[1500px]:max-h-[calc(100vh-3rem)] min-[1500px]:overflow-y-auto min-[1500px]:pr-1">
          {/* 1 — AI generator */}
          <section className="space-y-4 rounded-xl border border-[#F5C518]/40 border-t-4 border-t-[#F5C518] bg-[#FFFCEF] p-5">
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

          {/* 1b — AI edit-in-place (only once there's something to refine) */}
          {days.length > 0 && (
            <section className="space-y-3 rounded-xl border border-[#1B2A4A]/15 border-t-4 border-t-[#1B2A4A] bg-white p-5">
              <StepHead n="✦" title="Ubah dengan AI" accent />
              <p className="text-xs text-gray-500">
                Minta perubahan spesifik tanpa membongkar semuanya. Hari &amp;
                suntingan lain tetap utuh. Contoh: “tambah satu kuil di hari 2”,
                “mulai hari 3 lebih siang”, “ganti makan siang hari 1 jadi
                seafood”.
              </p>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={2}
                placeholder="Tulis perubahan yang diinginkan…"
                className={inputCls}
              />
              <ErrorNote message={editError} />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={editWithAI}
                  disabled={editBusy || !editPrompt.trim()}
                  className={`${btnSecondaryCls} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {editBusy ? "Mengubah…" : "✦ Terapkan perubahan"}
                </button>
                {editBusy && (
                  <span className="text-sm text-gray-500">Tunggu sebentar…</span>
                )}
              </div>
            </section>
          )}

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
                <DateField value={startDate} onChange={applyStartDate} />
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
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
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
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="3" title="Catatan (inclusions / tips)" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Termasuk: transport AC, driver berbahasa Indonesia. Tidak termasuk: tiket masuk."
              className={inputCls}
            />
          </section>

          {/* 5 — Free trip photos for the closing gallery */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="4" title="Galeri perjalanan (foto bebas)" />
            <GallerySection images={galleryImages} onChange={setGalleryImages} />
          </section>

          {/* 6 — Info Perjalanan (editable + toggle) */}
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <StepHead n="5" title="Info perjalanan (halaman penutup)" />
            <TravelTipsSection
              tips={travelTips}
              defaults={defaultTips}
              show={showTravelTips}
              saving={savingTips}
              saved={tipsSaved}
              onToggle={setShowTravelTips}
              onChange={setTravelTips}
              onSaveDefault={saveTipsAsDefault}
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
            <div ref={docRef} className="print:overflow-visible">
              <div
                ref={previewHostRef}
                className="w-full overflow-hidden print:overflow-visible"
              >
                <div
                  className="kt-itinerary-preview mx-auto w-[858px] print:w-auto"
                  style={{ zoom: previewScale }}
                >
                  <ItineraryDoc
                    tripTitle={tripTitle}
                    customer={customer}
                    pax={pax}
                    notes={notes}
                    vehicle={vehicle}
                    heroImage={heroImage}
                    days={days}
                    galleryImages={galleryImages}
                    travelTips={travelTips}
                    showTravelTips={showTravelTips}
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
        title="Pilih itinerary tersimpan"
        rows={pickerRowsState}
        loading={pickerLoading}
        onPick={pickFromLibrary}
      />
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

// ── Free trip-photo gallery (closing recap page) ──────────────

const MAX_GALLERY_PHOTOS = 8;

function GallerySection({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const free = Math.max(0, MAX_GALLERY_PHOTOS - images.length);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErr(null);
    try {
      const picked = Array.from(files).slice(0, free);
      const urls = await Promise.all(
        picked.map((f) => uploadPlaceImage(f, "gallery"))
      );
      onChange([...images, ...urls].slice(0, MAX_GALLERY_PHOTOS));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(i: number) {
    onChange(images.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Foto bebas (bukan atraksi) untuk halaman penutup “Galeri Perjalanan”.
        Maksimal {MAX_GALLERY_PHOTOS} foto.
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, i) => (
            <div
              key={src}
              className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-[10px] text-white hover:bg-black/75"
                aria-label="Hapus foto"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <label
          className={`${btnSecondaryCls} cursor-pointer ${
            uploading || free === 0 ? "opacity-60" : ""
          }`}
        >
          {uploading
            ? "Mengunggah…"
            : free === 0
              ? "Galeri penuh"
              : "Unggah foto"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading || free === 0}
            onChange={(e) => onUpload(e.target.files)}
          />
        </label>
        <span className="text-xs text-gray-400">
          {images.length}/{MAX_GALLERY_PHOTOS} · bisa pilih banyak sekaligus
        </span>
      </div>
      <ErrorNote message={err} />
    </div>
  );
}

// ── Info Perjalanan editor (closing-page reminders) ───────────

function TravelTipsSection({
  tips,
  defaults,
  show,
  saving,
  saved,
  onToggle,
  onChange,
  onSaveDefault,
}: {
  tips: TravelTip[];
  defaults: TravelTip[];
  show: boolean;
  saving: boolean;
  saved: boolean;
  onToggle: (v: boolean) => void;
  onChange: (next: TravelTip[]) => void;
  onSaveDefault: () => void;
}) {
  function patch(i: number, p: Partial<TravelTip>) {
    onChange(tips.map((t, idx) => (idx === i ? { ...t, ...p } : t)));
  }
  function remove(i: number) {
    onChange(tips.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...tips, { label: "", text: "" }]);
  }
  function reset() {
    onChange(defaults);
  }

  return (
    <div className="space-y-3">
      {/* Toggle — tidy labeled row, matches the rest of the panel */}
      <label className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
        <span className="text-sm font-medium text-gray-700">
          Tampilkan di halaman penutup
        </span>
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border-gray-300"
        />
      </label>

      <div className={show ? "" : "pointer-events-none opacity-50"}>
        <div className="space-y-2">
          {tips.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-gray-200 p-2"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <input
                  value={t.label}
                  onChange={(e) => patch(i, { label: e.target.value })}
                  placeholder="Judul (mis. Mata Uang)"
                  className={`${inputCls} py-1.5 text-xs font-semibold`}
                />
                <input
                  value={t.text}
                  onChange={(e) => patch(i, { text: e.target.value })}
                  placeholder="Isi tips…"
                  className={`${inputCls} py-1.5 text-xs`}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Hapus tips"
                className="shrink-0 px-1 text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
          {tips.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center text-xs text-gray-400">
              Belum ada tips. Tambah di bawah, atau pulihkan bawaan.
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={add} className={btnSecondaryCls}>
            + Tambah tips
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-gray-500 hover:underline"
          >
            Pulihkan bawaan
          </button>
        </div>
        {/* Persist current tips as the template every new itinerary starts with */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onSaveDefault}
            disabled={saving}
            className={`${btnCls} disabled:opacity-50`}
          >
            {saving ? "Menyimpan…" : "Simpan sebagai default"}
          </button>
          <span className="text-xs text-gray-400">
            {saved
              ? "✓ Tersimpan — dipakai untuk itinerary baru."
              : "Pakai tips ini di semua itinerary baru."}
          </span>
        </div>
      </div>
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
  function moveActivity(id: string, dir: -1 | 1) {
    const i = day.activities.findIndex((a) => a.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= day.activities.length) return;
    const next = [...day.activities];
    [next[i], next[j]] = [next[j], next[i]];
    onPatch({ activities: next });
  }
  function addCustomRow() {
    onPatch({
      activities: [...day.activities, { id: newId(), time: "", text: "" }],
    });
  }
  function addMeals() {
    let acts = day.activities;
    const has = (text: string) =>
      acts.some((a) => a.text.trim().toLowerCase() === text.toLowerCase());
    // Slot each missing meal into its time position; keep other rows in place.
    for (const m of MEAL_STOPS) {
      if (has(m.text)) continue;
      acts = insertByTime(acts, { id: newId(), time: m.time, text: m.text });
    }
    if (acts === day.activities) return;
    onPatch({ activities: acts });
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
          {day.activities.map((a, i) => {
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
                <div className="flex shrink-0 items-center text-gray-400">
                  <button
                    type="button"
                    aria-label="Naikkan"
                    onClick={() => moveActivity(a.id, -1)}
                    disabled={i === 0}
                    className="px-1 hover:text-[#1B2A4A] disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Turunkan"
                    onClick={() => moveActivity(a.id, 1)}
                    disabled={i === day.activities.length - 1}
                    className="px-1 hover:text-[#1B2A4A] disabled:opacity-25"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Hapus baris"
                    title={isPlace ? "Hapus via foto atraksi" : "Hapus baris"}
                    onClick={() => removeActivity(a.id)}
                    disabled={isPlace}
                    className="px-1 hover:text-red-500 disabled:opacity-25"
                  >
                    ✕
                  </button>
                </div>
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
  const [slotUploading, setSlotUploading] = useState<number | null>(null);
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

  async function onSlotUpload(file: File | undefined, slotIndex: number) {
    if (!file || full) return;
    setSlotUploading(slotIndex);
    setCErr(null);
    try {
      const image = await uploadPlaceImage(file, city || "itinerary");
      const name =
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim() || `Foto ${slotIndex + 1}`;
      onAdd({ id: newId(), name, image, desc: "" });
    } catch (e) {
      setCErr(e instanceof Error ? e.message : "Gagal mengunggah foto.");
    } finally {
      setSlotUploading(null);
    }
  }

  async function addCustom() {
    if (!cName.trim()) return;
    const image = cUrl.trim();
    // Optionally save the new attraction to the shared gallery DB.
    if (saveGallery && image) {
      setSaving(true);
      setCErr(null);
      // places.id is a text PK with no DB default — generate a readable, unique slug.
      const slug =
        cName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "tempat";
      const { error } = await createClient()
        .from("places")
        .insert({
          id: `${slug}-${Math.random().toString(36).slice(2, 7)}`,
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
              <label
                key={`empty-${i}`}
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors ${
                  dragActive
                    ? "border-[#F5C518] bg-[#FFFCEF]"
                    : "border-gray-200 bg-white hover:border-[#1B2A4A]/40 hover:bg-gray-50"
                }`}
              >
                <span className="text-lg font-semibold text-gray-300">
                  {i + 1}
                </span>
                <span className="px-1 text-[10px] leading-tight text-gray-400">
                  {slotUploading === i ? "Mengunggah…" : "Tarik / unggah foto"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={full || slotUploading !== null}
                  onChange={(e) => onSlotUpload(e.target.files?.[0], i)}
                />
              </label>
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
