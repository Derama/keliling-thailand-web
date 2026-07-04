"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { formatTHB } from "@/lib/admin/utils";
import type { InvoiceMode } from "@/lib/admin/invoice";
import type { CatalogItem, CatalogSection } from "./useCatalog";

/**
 * Search-as-you-type catalog picker shown as a focused popup *over the editor
 * (left) pane only* — the pane dims and a centered card holds the search + list.
 * Sized to the pane's on-screen box (clamped to the viewport) so it tracks the
 * pane on scroll/resize. Stays open after a pick so several items can be added.
 */
export default function CatalogPicker({
  sections,
  loading,
  mode,
  onPick,
  onClose,
  anchorRef,
}: {
  sections: CatalogSection[];
  loading: boolean;
  mode: InvoiceMode;
  onPick: (item: CatalogItem) => void;
  onClose: () => void;
  /** The editor pane the popup should cover. */
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const [query, setQuery] = useState("");
  // Key of the row that was just tapped — flashes green + shows ✓ so the admin
  // gets feedback the item landed on the invoice (the picker stays open).
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(item: CatalogItem) {
    onPick(item);
    setFlashKey(item.key);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashKey(null), 900);
  }

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);
  // Touch → bottom sheet (leaves the invoice preview visible above, sits tidily
  // over the bottom nav). Desktop → popup anchored to the editor pane's box.
  const [sheet, setSheet] = useState(false);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    function place() {
      // Detect touch via coarse pointer, not innerWidth: a page with horizontal
      // overflow inflates the layout viewport past 640, which would wrongly pick
      // the desktop popup on a phone.
      const coarse =
        window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 640;
      if (coarse) {
        setSheet(true);
        return;
      }
      setSheet(false);
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const top = Math.max(r.top, 8);
      const bottom = Math.min(r.bottom, window.innerHeight - 8);
      setBox({ top, left: r.left, width: r.width, height: Math.max(0, bottom - top) });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef]);

  useEffect(() => {
    // Autofocus only with a real keyboard — on phones it pops the on-screen
    // keyboard over the catalog list when the admin only wants to tap items.
    if (!window.matchMedia?.("(pointer: coarse)").matches)
      inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo<CatalogSection[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({
        group: s.group,
        items: s.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            s.group.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [sections, query]);

  const priceOf = (i: CatalogItem) => (mode === "operator" ? i.capital : i.sell);

  const content = (
    <>
      <div className="border-b border-gray-100 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-[#1B2A4A]">Tambah item</span>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Tutup
          </button>
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari rute, hotel, tiket, biaya…"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-base focus:border-[#1B2A4A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B2A4A]"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Memuat katalog…</p>
        ) : results.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">
            Tidak ada hasil untuk “{query}”.
          </p>
        ) : (
          results.map((s) => (
            <div key={s.group}>
              <p className="sticky top-0 z-10 border-y border-gray-100 bg-gray-100/95 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 backdrop-blur">
                {s.group}
              </p>
              {s.items.map((i) => {
                const added = flashKey === i.key;
                return (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => pick(i)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors duration-150 active:bg-[#F5C518]/25 ${
                      added ? "bg-green-50" : "hover:bg-[#F5C518]/15"
                    }`}
                  >
                    <span className="text-[15px] leading-snug text-[#1B2A4A]">
                      {i.label}
                      {i.unit ? (
                        <span className="text-gray-400"> / {i.unit}</span>
                      ) : null}
                    </span>
                    {added ? (
                      <span className="shrink-0 animate-[addPop_0.25s_ease-out] text-sm font-semibold text-green-600">
                        ✓ Ditambah
                      </span>
                    ) : (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-600">
                        {formatTHB(priceOf(i))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </>
  );

  // Phone: bottom sheet. Fills the lower ~72% so the invoice preview stays
  // visible above, and covers the bottom nav cleanly (no half-overlap).
  if (sheet) {
    return createPortal(
      <div className="fixed inset-0 z-50" onMouseDown={onClose}>
        <div className="absolute inset-0 bg-black/25" />
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 flex h-[72dvh] max-h-[88vh] flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl animate-[sheetUp_0.28s_ease-out]"
        >
          <div className="flex shrink-0 justify-center pt-2">
            <span className="h-1.5 w-10 rounded-full bg-gray-300" />
          </div>
          {content}
        </div>
      </div>,
      document.body
    );
  }

  // Desktop: popup anchored to the editor pane box.
  if (!box) return null;
  return createPortal(
    <div
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
      className="fixed z-50 flex items-center justify-center p-3"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 rounded-2xl bg-black/40" />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="relative flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        {content}
      </div>
    </div>,
    document.body
  );
}
