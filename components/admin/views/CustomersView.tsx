"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/admin/types";
import {
  Field,
  inputCls,
  btnCls,
  btnSecondaryCls,
  ErrorNote,
} from "@/components/admin/ui";
import Modal from "@/components/admin/Modal";
import { useRowSelection, SelectionBar } from "@/components/admin/RowSelection";

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const sel = useRowSelection();

  const load = useCallback(() => {
    createClient()
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCustomers(data ?? []);
      });
  }, []);

  useEffect(load, [load]);

  async function onDelete(c: Customer) {
    if (
      !confirm(
        `Hapus customer "${c.name}"? Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;
    setError(null);
    const { error } = await createClient()
      .from("customers")
      .delete()
      .eq("id", c.id);
    if (error) {
      // Most likely an FK violation: the customer still has orders.
      setError(
        `Gagal menghapus: ${error.message}. Customer dengan order tidak bisa dihapus.`
      );
      return;
    }
    setCustomers((prev) => prev.filter((x) => x.id !== c.id));
  }

  async function removeSelected() {
    if (sel.selected.size === 0) return;
    if (
      !confirm(
        `Hapus ${sel.selected.size} customer terpilih? Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    const ids = [...sel.selected];
    const { error } = await createClient()
      .from("customers")
      .delete()
      .in("id", ids);
    setBusy(false);
    if (error) {
      setError(
        `Gagal menghapus: ${error.message}. Customer dengan order tidak bisa dihapus.`
      );
      return;
    }
    setCustomers((prev) => prev.filter((x) => !sel.selected.has(x.id)));
    sel.reset();
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Customer</h1>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && !sel.active && (
            <button
              type="button"
              onClick={() => sel.setActive(true)}
              className={btnSecondaryCls}
            >
              Pilih
            </button>
          )}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={btnCls}
          >
            + Customer baru
          </button>
        </div>
      </div>
      <input
        placeholder="Cari nama…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${inputCls} max-w-sm`}
      />

      {sel.active && (
        <SelectionBar
          count={sel.selected.size}
          total={filtered.length}
          busy={busy}
          onSelectAll={(on) => sel.setAll(filtered.map((c) => c.id), on)}
          onDelete={removeSelected}
          onCancel={sel.reset}
        />
      )}

      <ErrorNote message={error} />

      {/* Phone: card list */}
      <div className="space-y-2 sm:hidden">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {sel.active && (
                  <input
                    type="checkbox"
                    checked={sel.selected.has(c.id)}
                    onChange={() => sel.toggle(c.id)}
                    className="h-4 w-4 shrink-0 accent-[#1B2A4A]"
                  />
                )}
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="truncate font-semibold text-[#1B2A4A] hover:underline"
                >
                  {c.name}
                </Link>
              </div>
              {!sel.active && (
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Hapus
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-sm text-gray-500">
              <span>{c.origin_city ?? "—"}</span>
              {c.phone ? (
                <a
                  href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#25D366] hover:underline"
                >
                  {c.phone}
                </a>
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
            Belum ada customer. Customer dibuat dari form order.
          </p>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              {sel.active && <th className="w-10 px-4 py-3" />}
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Kota asal</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                {sel.active && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={sel.selected.has(c.id)}
                      onChange={() => sel.toggle(c.id)}
                      className="h-4 w-4 accent-[#1B2A4A]"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {c.phone ? (
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#25D366] hover:underline"
                    >
                      {c.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{c.origin_city ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {!sel.active && (
                    <button
                      type="button"
                      onClick={() => onDelete(c)}
                      className="font-medium text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={sel.active ? 5 : 4}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Belum ada customer. Customer dibuat dari form order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Customer baru"
      >
        <CustomerForm
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}

function CustomerForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient()
      .from("customers")
      .insert({
        name,
        phone: phone || null,
        origin_city: city || null,
      });
    if (error) {
      setError(`Gagal membuat customer: ${error.message}`);
      setBusy(false);
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nama">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="WhatsApp">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
          placeholder="628…"
        />
      </Field>
      <Field label="Kota asal">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={inputCls}
        />
      </Field>
      <ErrorNote message={error} />
      <button type="submit" disabled={busy} className={btnCls}>
        {busy ? "Menyimpan…" : "Buat customer"}
      </button>
    </form>
  );
}
