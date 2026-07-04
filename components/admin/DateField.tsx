"use client";

import { useEffect, useRef, useState } from "react";
import { isoLocal, formatDate } from "@/lib/admin/utils";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
// Monday-first week, matching the local calendar convention.
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function parseIso(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Days (Mon-first) for the month grid, padded with leading/trailing blanks. */
function monthGrid(view: Date): (Date | null)[] {
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Branded calendar date field. Replaces native `type="date"` with a styled
 * trigger + month-grid popover. `value`/`onChange` use ISO yyyy-mm-dd.
 * `min` (ISO) disables earlier days — handy for an end date tied to a start.
 */
export default function DateField({
  value,
  onChange,
  min,
  placeholder = "Pilih tanggal",
  variant = "field",
  align = "left",
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  placeholder?: string;
  /** `chip` = compact trigger for dark bars (e.g. the day header). */
  variant?: "field" | "chip";
  /** Which edge the popover hugs — `right` keeps it inside narrow cards. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const minDate = min ? parseIso(min) : null;
  const today = new Date();
  const [view, setView] = useState<Date>(
    () => selected ?? new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  function toggle() {
    // Re-centre on the selected month each time it opens.
    if (!open && selected)
      setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setOpen((o) => !o);
  }

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(d: Date) {
    onChange(isoLocal(d));
    setOpen(false);
  }

  const cells = monthGrid(view);

  const chip = variant === "chip";
  const calendarIcon = (
    <svg
      width={chip ? 13 : 16}
      height={chip ? 13 : 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 ${chip ? "text-white/70" : "text-gray-400"}`}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );

  return (
    <div ref={wrapRef} className={chip ? "relative shrink-0" : "relative"}>
      {chip ? (
        <button
          type="button"
          onClick={toggle}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs text-white transition focus:outline-none ${
            open ? "bg-white/25" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {calendarIcon}
          <span className={selected ? "" : "text-white/60"}>
            {selected ? formatDate(value) : placeholder}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-1 focus:ring-[#1B2A4A] ${
            open
              ? "border-[#1B2A4A] ring-1 ring-[#1B2A4A]"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <span className={selected ? "text-gray-900" : "text-gray-400"}>
            {selected ? formatDate(value) : placeholder}
          </span>
          {calendarIcon}
        </button>
      )}

      {open && (
        <div
          className={`absolute top-full z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Header: month nav */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))
              }
              aria-label="Bulan sebelumnya"
              className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-[#1B2A4A]">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() =>
                setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))
              }
              aria-label="Bulan berikutnya"
              className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              ›
            </button>
          </div>

          {/* Weekday header */}
          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const isSelected = selected && sameDay(d, selected);
              const isToday = sameDay(d, today);
              const disabled = minDate ? d < minDate : false;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(d)}
                  className={`h-9 rounded-lg text-sm transition ${
                    isSelected
                      ? "bg-[#1B2A4A] font-semibold text-white"
                      : disabled
                        ? "text-gray-300"
                        : isToday
                          ? "bg-[#F5C518]/20 font-semibold text-[#1B2A4A] hover:bg-[#F5C518]/30"
                          : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer: quick actions */}
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => pick(new Date())}
              className="text-xs font-medium text-[#1B2A4A] hover:underline"
            >
              Hari ini
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs font-medium text-gray-400 hover:text-red-600"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
