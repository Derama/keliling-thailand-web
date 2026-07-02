"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Customer } from "@/lib/admin/types";
import { inputCls } from "@/components/admin/ui";

/**
 * Styled, searchable customer picker. Replaces a native <select>, whose OS
 * dropdown renders as an out-of-place dark overlay on mobile. Opens a panel
 * below the trigger (never over the wizard stepper above), with a 16px search
 * field so iOS doesn't zoom the viewport on focus.
 */
export default function CustomerSelect({
  value,
  customers,
  onChange,
}: {
  value: string;
  customers: Customer[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = customers.find((c) => c.id === value);
  const label = (c: Customer) =>
    `${c.name}${c.origin_city ? ` (${c.origin_city})` : ""}`;

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.origin_city ?? "").toLowerCase().includes(s)
    );
  }, [customers, q]);

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

  function choose(id: string) {
    onChange(id);
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between gap-2 text-left`}
      >
        <span className={`truncate ${selected ? "text-[#1B2A4A]" : "text-gray-400"}`}>
          {selected ? label(selected) : "— pilih —"}
        </span>
        <span className="shrink-0 text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari customer…"
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-base focus:border-[#1B2A4A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B2A4A]"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => choose("")}
                className="w-full px-3 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-50"
              >
                — pilih —
              </button>
            </li>
            {shown.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => choose(c.id)}
                  className={`w-full px-3 py-2.5 text-left text-[15px] hover:bg-[#F5C518]/15 ${
                    c.id === value ? "bg-[#F5C518]/10 font-semibold" : ""
                  } text-[#1B2A4A]`}
                >
                  {label(c)}
                </button>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-400">
                Tidak ada customer cocok.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
