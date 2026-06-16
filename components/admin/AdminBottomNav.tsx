"use client";

import { useState } from "react";

type NavTab = { id: string; label: string };

/** Phone-only bottom navigation: a few primary tabs + a "Lainnya" sheet for the
 *  rest. Shares active state with the desktop top tabs via onSelect. */
export default function AdminBottomNav({
  tabs,
  active,
  onSelect,
  primaryIds,
}: {
  tabs: readonly NavTab[];
  active: string;
  onSelect: (id: string) => void;
  primaryIds: readonly string[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const primary = primaryIds
    .map((id) => tabs.find((t) => t.id === id))
    .filter((t): t is NavTab => Boolean(t));
  const overflow = tabs.filter((t) => !primaryIds.includes(t.id));
  const overflowActive = overflow.some((t) => t.id === active);

  function pick(id: string) {
    onSelect(id);
    setSheetOpen(false);
  }

  const itemCls = (on: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
      on ? "text-[#F5C518]" : "text-white/70"
    }`;

  return (
    <>
      {/* Overflow sheet */}
      {sheetOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
            <div className="grid grid-cols-3 gap-2">
              {overflow.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pick(t.id)}
                  className={`rounded-xl border px-2 py-3 text-sm font-medium ${
                    active === t.id
                      ? "border-[#F5C518] bg-[#F5C518]/10 text-[#1B2A4A]"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-[#1B2A4A] pb-[env(safe-area-inset-bottom)] sm:hidden">
        {primary.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            className={itemCls(active === t.id)}
          >
            {t.label}
          </button>
        ))}
        {overflow.length > 0 && (
          <button
            onClick={() => setSheetOpen(true)}
            className={itemCls(overflowActive)}
          >
            Lainnya
          </button>
        )}
      </nav>
    </>
  );
}
