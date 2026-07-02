"use client";

import { useState } from "react";

type NavTab = { id: string; label: string };

const ICON = "h-6 w-6 shrink-0";

/** Line icons keyed by tab id. Fallback (dot) for anything without a match. */
function TabIcon({ id }: { id: string }) {
  const common = {
    className: ICON,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M3 12 12 3l9 9" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 3v3h6V3M8 11h8M8 15h5" />
        </svg>
      );
    case "joborder":
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h6" />
        </svg>
      );
    case "invoice":
      return (
        <svg {...common}>
          <path d="M6 2h9l3 3v15l-2.5-1.5L13 20l-2.5-1.5L8 20l-2-1.5V2z" />
          <path d="M9 8h6M9 12h6" />
        </svg>
      );
    case "prices":
      return (
        <svg {...common}>
          <path d="M12 2v20M17 6H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6" />
        </svg>
      );
    case "places":
      return (
        <svg {...common}>
          <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "itinerary":
      return (
        <svg {...common}>
          <path d="M9 3v15M9 18l6 3V6L9 3 3 6v15zM15 6l6-3v15l-6 3" />
        </svg>
      );
    case "brochure":
      return (
        <svg {...common}>
          <path d="M4 5a8 8 0 0 1 8 0 8 8 0 0 1 8 0v13a8 8 0 0 0-8 0 8 8 0 0 0-8 0zM12 5v13" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      );
    case "customers":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 5a3.5 3.5 0 0 1 0 7M18 20a6.5 6.5 0 0 0-3-5.5" />
        </svg>
      );
    case "pdftrim":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <path d="M8 8l12 8M8 16l12-8" />
        </svg>
      );
    case "leads":
      return (
        <svg {...common}>
          <path d="M3 5h18v14H3zM3 7l9 6 9-6" />
        </svg>
      );
    case "blog":
      return (
        <svg {...common}>
          <path d="M4 4h11l5 5v11H4zM15 4v5h5" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}

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
    `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] text-[11px] font-semibold transition-colors active:bg-white/5 ${
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
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium ${
                    active === t.id
                      ? "border-[#F5C518] bg-[#F5C518]/10 text-[#1B2A4A]"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  <TabIcon id={t.id} />
                  <span className="leading-tight">{t.label}</span>
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
            <TabIcon id={t.id} />
            <span className="max-w-full truncate px-0.5">{t.label}</span>
          </button>
        ))}
        {overflow.length > 0 && (
          <button
            onClick={() => setSheetOpen(true)}
            className={itemCls(overflowActive)}
          >
            <TabIcon id="more" />
            <span>Lainnya</span>
          </button>
        )}
      </nav>
    </>
  );
}
