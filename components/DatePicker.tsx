"use client";

import { useState, useRef, useEffect } from "react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDisplay(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface DatePickerProps {
  value: string; // ISO date string yyyy-mm-dd
  onChange: (val: string) => void;
  placeholder?: string;
  dark?: boolean;
}

export default function DatePicker({ value, onChange, placeholder = "Select date", dark = false }: DatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsed = value ? new Date(value + "T00:00:00") : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const selected = new Date(viewYear, viewMonth, day);
    onChange(toISODate(selected));
    setOpen(false);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function isSelected(day: number) {
    return parsed?.getFullYear() === viewYear &&
      parsed?.getMonth() === viewMonth &&
      parsed?.getDate() === day;
  }

  function isToday(day: number) {
    return today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day;
  }

  function isPast(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger button — h-11 matches the pax counter/select box */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full h-11 flex items-center gap-2 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent transition-colors text-left ${
          dark
            ? "border border-white/20 bg-white/10 text-white hover:border-white/40"
            : "border border-gray-200 bg-white text-gray-900 hover:border-[#F5C518]"
        }`}
      >
        <svg className="w-4 h-4 text-[#F5C518] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={parsed ? (dark ? "text-white" : "text-gray-900") : (dark ? "text-white/40" : "text-gray-400")}>
          {parsed ? formatDisplay(parsed) : placeholder}
        </span>
      </button>

      {/* Dropdown calendar — white card style */}
      {open && (
        <div className="absolute z-50 mt-2 left-0 w-72 max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-black/20 p-4 animate-fade-in">
          {/* Month / Year nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#1B2A4A]/60 hover:text-[#1B2A4A] transition-colors text-lg font-bold"
            >
              ‹
            </button>
            <span className="text-[#1B2A4A] font-extrabold text-sm">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#1B2A4A]/60 hover:text-[#1B2A4A] transition-colors text-lg font-bold"
            >
              ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold text-[#1B2A4A]/40 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const past = isPast(day);
              const selected = isSelected(day);
              const tod = isToday(day);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={past}
                  onClick={() => selectDay(day)}
                  className={`
                    w-8 h-8 mx-auto flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${past ? "text-gray-300 cursor-not-allowed" : "hover:bg-[#F5C518]/20 hover:text-[#1B2A4A] cursor-pointer"}
                    ${selected ? "bg-[#F5C518] text-[#1B2A4A] font-extrabold hover:bg-[#F5C518]" : ""}
                    ${tod && !selected ? "border-2 border-[#F5C518] text-[#1B2A4A] font-bold" : ""}
                    ${!past && !selected && !tod ? "text-[#1B2A4A]" : ""}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                onChange(toISODate(today));
                setOpen(false);
              }}
              className="text-xs text-[#F5C518] font-bold hover:underline"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
