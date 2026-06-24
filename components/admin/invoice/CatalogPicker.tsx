"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatTHB } from "@/lib/admin/utils";
import type { InvoiceMode } from "@/lib/admin/invoice";
import type { CatalogItem, CatalogSection } from "./useCatalog";

/**
 * Search-as-you-type catalog popover. Click an item to add it to the invoice;
 * the panel stays open so several items can be added in a row.
 */
export default function CatalogPicker({
  sections,
  loading,
  mode,
  onPick,
}: {
  sections: CatalogSection[];
  loading: boolean;
  mode: InvoiceMode;
  onPick: (item: CatalogItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1B2A4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#27375c]"
      >
        <span className="text-base leading-none">+</span> Katalog
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari rute, hotel, tiket, biaya…"
              className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B2A4A]"
            />
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-400">Memuat katalog…</p>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">
                Tidak ada hasil untuk “{query}”.
              </p>
            ) : (
              results.map((s) => (
                <div key={s.group}>
                  <p className="sticky top-0 bg-gray-50/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 backdrop-blur">
                    {s.group}
                  </p>
                  {s.items.map((i) => (
                    <button
                      key={i.key}
                      type="button"
                      onClick={() => onPick(i)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#F5C518]/15"
                    >
                      <span className="text-[#1B2A4A]">
                        {i.label}
                        {i.unit ? (
                          <span className="text-gray-400"> / {i.unit}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-gray-600">
                        {formatTHB(priceOf(i))}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
