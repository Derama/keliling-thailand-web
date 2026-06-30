// components/admin/LeadCard.tsx
"use client";

import type { Lead } from "@/lib/admin/leads";
import { CHANNEL_META } from "@/lib/admin/leads";
import { formatIDR } from "@/lib/admin/utils";

/**
 * One lead card on the board. Draggable (HTML5) for desktop stage moves; click
 * opens the detail modal. The "→ order" marker shows once converted.
 */
export default function LeadCard({
  lead,
  onOpen,
  onDragStart,
}: {
  lead: Lead;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const ch = CHANNEL_META[lead.channel];
  const contact = lead.handle || lead.phone || "";
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="block w-full cursor-grab rounded-xl border border-gray-200 bg-white p-3 text-left active:cursor-grabbing hover:border-[#F5C518]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-[#1B2A4A]">
          {lead.name || "Tanpa nama"}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ch.color}`}
        >
          {ch.short}
        </span>
      </div>
      {contact && (
        <p className="mt-0.5 truncate text-xs text-gray-500">{contact}</p>
      )}
      <div className="mt-1 flex items-center justify-between text-xs">
        {lead.est_value_idr > 0 ? (
          <span className="font-medium text-[#1B2A4A]">
            {formatIDR(lead.est_value_idr)}
          </span>
        ) : (
          <span />
        )}
        {lead.order_id && (
          <span className="font-medium text-green-700">→ order</span>
        )}
      </div>
    </button>
  );
}
