"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PRICE_BOOK,
  HOTEL_MARGIN,
  FLEET_LABELS,
  FLEET_KEYS,
  groupHotels,
  groupAttractions,
  isContact,
  type VehiclePrice,
  mergeAddOns,
  type HotelRate,
  type Attraction,
  type AddOnRate,
} from "@/lib/admin/priceBook";
import { formatTHB } from "@/lib/admin/utils";
import { inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import AddPriceRowForm from "@/components/admin/AddPriceRowForm";

function PriceCell({ p }: { p: VehiclePrice }) {
  const margin = p.sell - p.cost;
  const pct = p.sell > 0 ? (margin / p.sell) * 100 : 0;
  return (
    <div className="space-y-0.5 text-right">
      <div className="font-semibold text-[#1B2A4A]">{formatTHB(p.sell)}</div>
      <div className="text-xs text-gray-400">modal {formatTHB(p.cost)}</div>
      <div
        className={`text-xs font-medium ${
          margin >= 0 ? "text-green-700" : "text-red-700"
        }`}
      >
        +{formatTHB(margin)} ({pct.toFixed(0)}%)
      </div>
    </div>
  );
}

export default function PriceListView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Daftar Harga</h1>
        <p className="text-sm text-gray-500">
          Harga jual ke customer, modal (capital), dan margin — semua THB,
          termasuk sopir, bensin, dan tol. Harga rute tetap; harga hotel bisa
          diubah (fluktuatif per musim).
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Tiap sel: <span className="font-semibold text-[#1B2A4A]">jual</span> ·{" "}
          modal · <span className="text-green-700">margin</span>
        </p>
      </div>

      {PRICE_BOOK.map((group) => (
        <section
          key={group.group}
          className="overflow-x-auto rounded-xl border border-gray-200 bg-white"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-semibold text-[#1B2A4A]">{group.group}</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3">Rute</th>
                {FLEET_KEYS.map((k) => (
                  <th key={k} className="px-4 py-3 text-right">
                    {FLEET_LABELS[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.services.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-gray-100 align-top hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-[#1B2A4A]">
                    {s.name}
                  </td>
                  {isContact(s) ? (
                    <td
                      colSpan={FLEET_KEYS.length}
                      className="px-4 py-3 text-right text-gray-400 italic"
                    >
                      Contact
                    </td>
                  ) : (
                    FLEET_KEYS.map((k) => (
                      <td key={k} className="px-4 py-3">
                        <PriceCell p={s.prices![k]} />
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {/* Hotels — editable capital (fluctuate by season), jual = modal + margin */}
      <HotelRatesSection />

      {/* Attractions — editable, prices fill over time */}
      <AttractionRatesSection />

      {/* Add-ons — editable price, name & unit; rows can be added/removed */}
      <AddOnsSection />
    </div>
  );
}

function AddOnsSection() {
  const [rows, setRows] = useState<AddOnRate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("");

  useEffect(() => {
    createClient()
      .from("add_ons")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setRows(mergeAddOns((data as AddOnRate[]) ?? []));
      });
  }, []);

  function patch(id: string, p: Partial<AddOnRate>) {
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setDirty(true);
    setSaved(false);
  }
  function setName(id: string, raw: string) {
    patch(id, { name: raw });
  }
  function setPrice(id: string, raw: string) {
    patch(id, { price: raw === "" ? null : Number(raw) });
  }
  function setUnit(id: string, raw: string) {
    patch(id, { unit: raw === "" ? null : raw });
  }

  async function save() {
    setSaving(true);
    setError(null);
    // Persist base rows (as price/unit overrides) and custom rows alike.
    const payload = rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      unit: r.unit,
      sort: r.sort,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await createClient().from("add_ons").upsert(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setDirty(false);
      setSaved(true);
    }
  }

  async function addRow() {
    const name = newName.trim();
    if (!name) return;
    const row: AddOnRate = {
      id: crypto.randomUUID(),
      name,
      price: newPrice === "" ? null : Number(newPrice),
      unit: newUnit.trim() === "" ? null : newUnit.trim(),
      sort: rows.reduce((m, r) => Math.max(m, r.sort), 0) + 10,
    };
    setError(null);
    const { error } = await createClient().from("add_ons").insert(row);
    if (error) setError(error.message);
    else {
      setRows((arr) => [...arr, row]);
      setNewName("");
      setNewPrice("");
      setNewUnit("");
    }
  }

  async function deleteRow(id: string) {
    if (!confirm("Hapus biaya tambahan ini?")) return;
    const { error } = await createClient().from("add_ons").delete().eq("id", id);
    if (error) setError(error.message);
    else setRows((arr) => arr.filter((r) => r.id !== id));
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1B2A4A]">Biaya Tambahan</h2>
          <p className="text-xs text-gray-400">
            Ubah harga, kosongkan kalau sesuai harga aktual. Lalu simpan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && !dirty && (
            <span className="text-sm text-green-700">Tersimpan ✓</span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {saving ? "Menyimpan…" : "Simpan biaya tambahan"}
          </button>
        </div>
      </div>

      <ErrorNote message={error} />

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Harga</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr
                key={a.id}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-medium text-[#1B2A4A]">
                  {a.base ? (
                    a.name
                  ) : (
                    <input
                      type="text"
                      value={a.name}
                      onChange={(e) => setName(a.id, e.target.value)}
                      className={`${inputCls} w-full`}
                    />
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    min="0"
                    value={a.price ?? ""}
                    placeholder="aktual"
                    onChange={(e) => setPrice(a.id, e.target.value)}
                    className={`${inputCls} ml-auto max-w-24 text-right`}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={a.unit ?? ""}
                    placeholder="—"
                    onChange={(e) => setUnit(a.id, e.target.value)}
                    className={`${inputCls} max-w-28`}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  {!a.base && (
                    <button
                      onClick={() => deleteRow(a.id)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#1B2A4A]">
          Tambah biaya baru
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40">
            <label className="mb-1 block text-xs text-gray-500">Item</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Harga (THB)
            </label>
            <input
              type="number"
              min="0"
              value={newPrice}
              placeholder="aktual"
              onChange={(e) => setNewPrice(e.target.value)}
              className={`${inputCls} max-w-28`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Unit</label>
            <input
              type="text"
              value={newUnit}
              placeholder="/ jam"
              onChange={(e) => setNewUnit(e.target.value)}
              className={`${inputCls} max-w-28`}
            />
          </div>
          <button
            type="button"
            onClick={addRow}
            disabled={!newName.trim()}
            className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Tambah
          </button>
        </div>
      </div>
    </>
  );
}

function HotelRatesSection() {
  const [rows, setRows] = useState<HotelRate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    createClient()
      .from("hotel_rates")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data as HotelRate[]) ?? []);
      });
  }, []);

  function patch(id: string, p: Partial<HotelRate>) {
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setDirty(true);
    setSaved(false);
  }
  function setCapital(id: string, raw: string) {
    patch(id, { capital: Number(raw) || 0 });
  }
  function setMargin(id: string, raw: string) {
    patch(id, { margin: Number(raw) || 0 });
  }
  // Editing the final price keeps capital, derives margin = final − capital.
  function setFinal(id: string, raw: string, capital: number) {
    patch(id, { margin: (Number(raw) || 0) - capital });
  }

  async function addHotel(city: string, name: string, amount: string) {
    const row: HotelRate = {
      id: crypto.randomUUID(),
      city,
      name,
      capital: Number(amount) || 0,
      margin: HOTEL_MARGIN,
      sort: rows.reduce((m, r) => Math.max(m, r.sort), 0) + 10,
    };
    setError(null);
    const { error } = await createClient().from("hotel_rates").insert(row);
    if (error) setError(error.message);
    else setRows((arr) => [...arr, row]);
  }

  async function deleteHotel(id: string) {
    if (!confirm("Hapus hotel ini?")) return;
    const { error } = await createClient()
      .from("hotel_rates")
      .delete()
      .eq("id", id);
    if (error) setError(error.message);
    else setRows((arr) => arr.filter((r) => r.id !== id));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = rows.map((r) => ({
      id: r.id,
      city: r.city,
      name: r.name,
      capital: r.capital,
      margin: r.margin,
      sort: r.sort,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await createClient().from("hotel_rates").upsert(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setDirty(false);
      setSaved(true);
    }
  }

  const cities = groupHotels(rows);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1B2A4A]">Hotel</h2>
          <p className="text-xs text-gray-400">
            Per malam (kamar, 2 pax). Modal, margin, dan final bisa diubah.
            Rekomendasi margin {formatTHB(HOTEL_MARGIN)} / malam. Final = modal +
            margin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && !dirty && (
            <span className="text-sm text-green-700">Tersimpan ✓</span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {saving ? "Menyimpan…" : "Simpan harga hotel"}
          </button>
        </div>
      </div>

      <ErrorNote message={error} />

      {cities.map((c) => (
        <section
          key={c.city}
          className="overflow-x-auto rounded-xl border border-gray-200 bg-white"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold text-[#1B2A4A]">{c.city}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3">Hotel</th>
                <th className="px-4 py-3 text-right">Modal</th>
                <th className="px-4 py-3 text-right">Margin</th>
                <th className="px-4 py-3 text-right">Final (jual)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {c.hotels.map((h) => {
                const sell = h.capital + h.margin;
                const pct = sell > 0 ? (h.margin / sell) * 100 : 0;
                return (
                  <tr
                    key={h.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-[#1B2A4A]">
                      {h.name}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={h.capital || ""}
                        onChange={(e) => setCapital(h.id, e.target.value)}
                        className={`${inputCls} ml-auto max-w-24 text-right`}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={h.margin || ""}
                        onChange={(e) => setMargin(h.id, e.target.value)}
                        className={`${inputCls} ml-auto max-w-24 text-right`}
                      />
                      <span className="mt-0.5 block text-xs font-medium text-green-700">
                        {pct.toFixed(0)}% margin
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={sell || ""}
                        onChange={(e) => setFinal(h.id, e.target.value, h.capital)}
                        className={`${inputCls} ml-auto max-w-24 text-right font-semibold`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteHotel(h.id)}
                        className="text-sm text-red-500 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <AddPriceRowForm
        title="Tambah hotel baru"
        cities={Array.from(new Set(rows.map((r) => r.city)))}
        citiesId="hotel-cities"
        amountLabel="Modal (THB)"
        onAdd={addHotel}
      />

      {rows.length === 0 && !error && (
        <p className="text-sm text-gray-400">Memuat hotel…</p>
      )}
    </>
  );
}

function AttractionRatesSection() {
  const [rows, setRows] = useState<Attraction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    createClient()
      .from("attraction_rates")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data as Attraction[]) ?? []);
      });
  }, []);

  function patch(id: string, p: Partial<Attraction>) {
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setDirty(true);
    setSaved(false);
  }
  function setPrice(id: string, raw: string) {
    patch(id, { price: raw === "" ? null : Number(raw) });
  }
  function setMargin(id: string, raw: string) {
    patch(id, { margin: Number(raw) || 0 });
  }
  // Editing final keeps capital price, derives margin = final − capital.
  function setFinal(id: string, raw: string, capital: number) {
    patch(id, { margin: (Number(raw) || 0) - capital });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = rows.map((r) => ({
      id: r.id,
      city: r.city,
      name: r.name,
      price: r.price,
      margin: r.margin,
      sort: r.sort,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await createClient()
      .from("attraction_rates")
      .upsert(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setDirty(false);
      setSaved(true);
    }
  }

  async function addAttraction(city: string, name: string, amount: string) {
    const row: Attraction = {
      id: crypto.randomUUID(),
      city,
      name,
      price: amount === "" ? null : Number(amount),
      margin: 0,
      sort: rows.reduce((m, r) => Math.max(m, r.sort), 0) + 10,
    };
    setError(null);
    const { error } = await createClient().from("attraction_rates").insert(row);
    if (error) setError(error.message);
    else setRows((arr) => [...arr, row]);
  }

  async function deleteAttraction(id: string) {
    if (!confirm("Hapus atraksi ini?")) return;
    const { error } = await createClient()
      .from("attraction_rates")
      .delete()
      .eq("id", id);
    if (error) setError(error.message);
    else setRows((arr) => arr.filter((r) => r.id !== id));
  }

  const cities = groupAttractions(rows);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1B2A4A]">Tiket Atraksi</h2>
          <p className="text-xs text-gray-400">
            Ubah harga tiket, kosongkan kalau belum ada. Lalu simpan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && !dirty && (
            <span className="text-sm text-green-700">Tersimpan ✓</span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {saving ? "Menyimpan…" : "Simpan harga tiket"}
          </button>
        </div>
      </div>

      <ErrorNote message={error} />

      {cities.map((c) => (
        <section
          key={c.city}
          className="overflow-x-auto rounded-xl border border-gray-200 bg-white"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold text-[#1B2A4A]">{c.city}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3">Atraksi</th>
                <th className="px-4 py-3 text-right">Modal</th>
                <th className="px-4 py-3 text-right">Margin</th>
                <th className="px-4 py-3 text-right">Final (jual)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {c.items.map((a) => {
                const sell = a.price != null ? a.price + a.margin : null;
                const pct =
                  sell != null && sell > 0 ? (a.margin / sell) * 100 : null;
                return (
                  <tr
                    key={a.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-[#1B2A4A]">
                      {a.name}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={a.price ?? ""}
                        placeholder="menyusul"
                        onChange={(e) => setPrice(a.id, e.target.value)}
                        className={`${inputCls} ml-auto max-w-24 text-right`}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={a.margin || ""}
                        onChange={(e) => setMargin(a.id, e.target.value)}
                        className={`${inputCls} ml-auto max-w-24 text-right`}
                      />
                      {pct != null && (
                        <span className="mt-0.5 block text-xs font-medium text-green-700">
                          {pct.toFixed(0)}% margin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={sell ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          setFinal(a.id, e.target.value, a.price ?? 0)
                        }
                        className={`${inputCls} ml-auto max-w-24 text-right font-semibold`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteAttraction(a.id)}
                        className="text-sm text-red-500 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <AddPriceRowForm
        title="Tambah atraksi baru"
        cities={Array.from(new Set(rows.map((r) => r.city)))}
        citiesId="attraction-cities"
        amountLabel="Harga (THB)"
        onAdd={addAttraction}
      />
    </>
  );
}
