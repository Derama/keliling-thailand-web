"use client";

import Modal from "@/components/admin/Modal";
import type { PickerRowData } from "@/lib/admin/docLibrary.labels";

/**
 * Source-agnostic picker. The caller fetches + formats rows (via pickerRow)
 * from whichever store applies (itineraries or document_templates) and handles
 * the chosen id. This component only renders the list + selection.
 */
export default function TemplatePickerModal({
  open,
  onClose,
  title,
  rows,
  loading,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: PickerRowData[];
  loading: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Belum ada yang tersimpan.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r.id)}
                className="block w-full px-4 py-3 text-left hover:bg-gray-50"
              >
                <p className="truncate font-semibold text-[#1B2A4A]">
                  {r.label}
                </p>
                {r.sub && <p className="text-xs text-gray-400">{r.sub}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
