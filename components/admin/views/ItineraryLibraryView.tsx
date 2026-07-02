"use client";

import { useCallback, useEffect, useState } from "react";
import { btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import { formatDate } from "@/lib/admin/utils";
import ItineraryBuilderView from "@/components/admin/views/ItineraryBuilderView";
import {
  useRowSelection,
  SelectionBar,
} from "@/components/admin/RowSelection";
import {
  listItineraries,
  createItinerary,
  deleteItinerary,
  type ItineraryRow,
} from "@/lib/admin/itineraryLibrary";

// The draft shape we read for the list's auto-fallback label + day count.
interface DraftPeek {
  tripTitle?: string;
  customer?: string;
  startDate?: string;
  days?: unknown[];
}

/** Label for a row: manual title, else trip title · customer · start date. */
function rowLabel(row: ItineraryRow<DraftPeek>): string {
  if (row.title.trim()) return row.title.trim();
  const d = row.data ?? {};
  const parts = [d.tripTitle, d.customer, d.startDate ? formatDate(d.startDate) : ""]
    .filter(Boolean)
    .join(" · ");
  return parts || "Itinerary tanpa judul";
}

function savedLabel(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ItineraryLibraryView() {
  const [rows, setRows] = useState<ItineraryRow<DraftPeek>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // null = list; otherwise the open itinerary's id.
  const [openId, setOpenId] = useState<string | null>(null);
  const sel = useRowSelection();

  async function removeSelected() {
    if (sel.selected.size === 0) return;
    if (!confirm(`Hapus ${sel.selected.size} itinerary terpilih?`)) return;
    setBusy(true);
    setError(null);
    try {
      for (const id of sel.selected) await deleteItinerary(id);
      sel.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus itinerary.");
    } finally {
      setBusy(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listItineraries<DraftPeek>());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat itinerary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function newItinerary() {
    setBusy(true);
    setError(null);
    try {
      const id = await createItinerary("", {});
      if (!id) {
        setError("Gagal membuat itinerary baru.");
        return;
      }
      setOpenId(id);
    } catch (e) {
      setError(
        `Gagal membuat itinerary baru: ${
          e instanceof Error ? e.message : "kesalahan tak dikenal"
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(row: ItineraryRow<DraftPeek>) {
    setBusy(true);
    const title = `${rowLabel(row)} (salinan)`;
    const id = await createItinerary(title, row.data);
    setBusy(false);
    if (id) setOpenId(id);
  }

  async function remove(row: ItineraryRow<DraftPeek>) {
    if (!confirm(`Hapus itinerary "${rowLabel(row)}"?`)) return;
    await deleteItinerary(row.id);
    load();
  }

  // Builder takes over the tab; returning reloads the list (reflects autosave).
  if (openId) {
    return (
      <ItineraryBuilderView
        libraryId={openId}
        onExit={() => {
          setOpenId(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Itinerary</h1>
          <p className="text-sm text-gray-500">
            Itinerary tersimpan. Buka untuk lanjut menyunting, atau buat baru.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && !sel.active && (
            <button
              type="button"
              onClick={() => sel.setActive(true)}
              className={btnSecondaryCls}
            >
              Pilih
            </button>
          )}
          {/* The empty state below shows its own create button — don't render
              two identical buttons on an empty list. */}
          {(loading || rows.length > 0) && (
            <button
              type="button"
              onClick={newItinerary}
              disabled={busy}
              className={`${btnCls} disabled:opacity-50`}
            >
              + Itinerary baru
            </button>
          )}
        </div>
      </div>

      {sel.active && (
        <SelectionBar
          count={sel.selected.size}
          total={rows.length}
          busy={busy}
          onSelectAll={(on) => sel.setAll(rows.map((r) => r.id), on)}
          onDelete={removeSelected}
          onCancel={sel.reset}
        />
      )}

      <ErrorNote message={error} />

      {loading ? (
        <p className="text-sm text-gray-400">Memuat…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          <p>Belum ada itinerary tersimpan.</p>
          <button
            type="button"
            onClick={newItinerary}
            disabled={busy}
            className={`${btnCls} mt-4 disabled:opacity-50`}
          >
            + Buat itinerary pertama
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {rows.map((row) => {
            const dayCount = Array.isArray(row.data?.days) ? row.data.days.length : 0;
            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
              >
                {sel.active && (
                  <input
                    type="checkbox"
                    checked={sel.selected.has(row.id)}
                    onChange={() => sel.toggle(row.id)}
                    className="h-4 w-4 shrink-0 accent-[#1B2A4A]"
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    sel.active ? sel.toggle(row.id) : setOpenId(row.id)
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-semibold text-[#1B2A4A]">
                    {rowLabel(row)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {dayCount} hari · disimpan {savedLabel(row.updated_at)}
                  </p>
                </button>
                <div
                  className={`flex shrink-0 items-center gap-3 text-sm ${
                    sel.active ? "hidden" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(row.id)}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    Buka
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicate(row)}
                    disabled={busy}
                    className="text-gray-500 hover:underline disabled:opacity-50"
                  >
                    Duplikat
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    className="text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
