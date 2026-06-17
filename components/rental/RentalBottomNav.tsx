"use client";

type NavTab = { id: string; label: string };

export default function RentalBottomNav({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly NavTab[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const itemCls = (on: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
      on ? "text-[#F5C518]" : "text-white/70"
    }`;

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-[#1B2A4A] pb-[env(safe-area-inset-bottom)] sm:hidden">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onSelect(t.id)} className={itemCls(active === t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
