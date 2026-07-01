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
  const inputRef = useRef<HTMLInputElement>(null);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Match the popup to the pane's visible box, clamped to the viewport. On
  // phones the "cover just the editor pane" idea reads as a stray floating card,
  // so below 640px the picker fills the screen as a near-fullscreen sheet.
  useLayoutEffect(() => {
    function place() {
      if (window.innerWidth < 640) {
        setBox({
          top: 8,
          left: 8,
          width: window.innerWidth - 16,
          height: window.innerHeight - 16,
        });
        return;
      }
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
        <div className="border-b border-gray-100 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-[#1B2A4A]">
              Tambah item
            </span>
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

        <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-2">
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
                {s.items.map((i) => (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => onPick(i)}
                    className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-[#F5C518]/15 active:bg-[#F5C518]/25"
                  >
                    <span className="text-[15px] leading-snug text-[#1B2A4A]">
                      {i.label}
                      {i.unit ? (
                        <span className="text-gray-400"> / {i.unit}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-600">
                      {formatTHB(priceOf(i))}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
