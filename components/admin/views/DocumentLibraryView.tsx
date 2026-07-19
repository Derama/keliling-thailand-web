"use client";

import { useCallback, useEffect, useState } from "react";
import { btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import { pickerRow } from "@/lib/admin/docLibrary.labels";
import {
  useRowSelection,
  SelectionBar,
} from "@/components/admin/RowSelection";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  type TemplateKind,
  type TemplateRow,
} from "@/lib/admin/docLibrary";

/** Sentinel openId for a deferred (not-yet-persisted) new document. */
export const NEW_DOC_ID = "new";

interface DocumentLibraryViewProps<T> {
  kind: TemplateKind;
  heading: string;
  description: string;
  newLabel: string;
  emptyLabel: string;
  createDraft: () => T;
  renderBuilder: (id: string, onExit: () => void) => React.ReactNode;
  /**
   * Open new documents without creating a DB row — the builder is rendered
   * with NEW_DOC_ID and persists itself on first save (throwaway drafts never
   * hit the database).
   */
  deferCreate?: boolean;
}

export default function DocumentLibraryView<T>({
  kind,
  heading,
  description,
  newLabel,
  emptyLabel,
  createDraft,
  renderBuilder,
  deferCreate,
}: DocumentLibraryViewProps<T>) {
  const [rows, setRows] = useState<TemplateRow<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const sel = useRowSelection();

  async function removeSelected() {
    if (sel.selected.size === 0) return;
    if (!confirm(`Hapus ${sel.selected.size} ${heading.toLowerCase()} terpilih?`))
      return;
    setBusy(true);
    setError(null);
    try {
      for (const id of sel.selected) await deleteTemplate(id);
      sel.reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menghapus dokumen.");
    } finally {
      setBusy(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listTemplates<T>(kind));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : `Gagal memuat ${heading}.`
      );
    } finally {
      setLoading(false);
    }
  }, [heading, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createNew() {
    if (deferCreate) {
      setOpenId(NEW_DOC_ID);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createTemplate(kind, "", createDraft(), null);
      if (!id) throw new Error(`Gagal membuat ${heading.toLowerCase()} baru.`);
      setOpenId(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal membuat dokumen.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(row: TemplateRow<T>) {
    setBusy(true);
    setError(null);
    try {
      const label = pickerRow(row).label;
      const id = await createTemplate(
        kind,
        `${label} (salinan)`,
        row.data,
        null
      );
      if (!id) throw new Error("Gagal menduplikat dokumen.");
      setOpenId(id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Gagal menduplikat dokumen."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: TemplateRow<T>) {
    const label = pickerRow(row).label;
    if (!confirm(`Hapus \"${label}\"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTemplate(row.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menghapus dokumen.");
    } finally {
      setBusy(false);
    }
  }

  if (openId) {
    return renderBuilder(openId, () => {
      setOpenId(null);
      void load();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">{heading}</h1>
          <p className="text-sm text-gray-500">{description}</p>
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
              onClick={createNew}
              disabled={busy}
              className={`${btnCls} disabled:opacity-50`}
            >
              {newLabel}
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
          <p>{emptyLabel}</p>
          <button
            type="button"
            onClick={createNew}
            disabled={busy}
            className={`${btnCls} mt-4 disabled:opacity-50`}
          >
            {newLabel}
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {rows.map((row) => {
            const display = pickerRow(row);
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
                    {display.label}
                  </p>
                  {display.sub && (
                    <p className="text-xs text-gray-400">{display.sub}</p>
                  )}
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
                    disabled={busy}
                    className="text-red-500 hover:underline disabled:opacity-50"
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
