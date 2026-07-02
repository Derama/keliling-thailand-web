"use client";

import { useEffect, useRef, useState } from "react";
import { inputCls } from "@/components/admin/ui";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Styled dropdown that replaces a native <select>, whose OS popup renders as
 * an out-of-place dark overlay (see CustomerSelect for the searchable
 * variant). Opens a panel below the trigger; closes on outside click/Escape.
 */
export default function Select({
  value,
  options,
  onChange,
  placeholder = "— pilih —",
  className = "",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes for the trigger button (e.g. compact h-8 w-auto). */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputCls} flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={`truncate ${selected ? "text-[#1B2A4A]" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="shrink-0 text-gray-400">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 z-30 mt-1 max-h-60 w-max min-w-full max-w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => choose(o.value)}
                className={`w-full px-3 py-2.5 text-left text-[15px] hover:bg-[#F5C518]/15 ${
                  o.value === value ? "bg-[#F5C518]/10 font-semibold" : ""
                } text-[#1B2A4A]`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
