"use client";

import { useCallback, useState } from "react";

/**
 * Multi-select state for a list. `active` toggles selection mode (checkboxes +
 * bulk bar); `selected` holds the picked row ids. Shared by the document
 * libraries, the itinerary library, and the customer list.
 */
export function useRowSelection() {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setAll = useCallback((ids: string[], on: boolean) => {
    setSelected(on ? new Set(ids) : new Set());
  }, []);

  const reset = useCallback(() => {
    setActive(false);
    setSelected(new Set());
  }, []);

  return { active, setActive, selected, toggle, setAll, reset };
}

/** Bar shown above a list while selecting: count, select-all, delete, cancel. */
export function SelectionBar({
  count,
  total,
  busy,
  onSelectAll,
  onDelete,
  onCancel,
}: {
  count: number;
  total: number;
  busy: boolean;
  onSelectAll: (on: boolean) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const allChecked = total > 0 && count === total;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm">
      <label className="flex items-center gap-2 font-medium text-[#1B2A4A]">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="h-4 w-4 accent-[#1B2A4A]"
        />
        Pilih semua
      </label>
      <span className="text-gray-500">{count} dipilih</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || count === 0}
          className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Menghapus…" : `Hapus (${count})`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="font-medium text-gray-500 hover:underline disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
