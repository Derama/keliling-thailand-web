"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import { groupPlaces, type Place } from "@/lib/admin/places";

export default function PlacesView() {
  const [rows, setRows] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    createClient()
      .from("places")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data as Place[]) ?? []);
      });
  }, []);

  function patch(id: string, p: Partial<Place>) {
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = rows.map((r) => ({
      id: r.id,
      city: r.city,
      name: r.name,
      image_url: r.image_url,
      description: r.description,
      sort: r.sort,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await createClient().from("places").upsert(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setDirty(false);
      setSaved(true);
    }
  }

  async function addPlace() {
    if (!city.trim() || !name.trim()) return;
    const row: Place = {
      id: crypto.randomUUID(),
      city: city.trim(),
      name: name.trim(),
      image_url: imageUrl.trim() || null,
      description: desc.trim() || null,
      sort: rows.reduce((m, r) => Math.max(m, r.sort), 0) + 10,
    };
    setError(null);
    const { error } = await createClient().from("places").insert(row);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((arr) => [...arr, row]);
    setName("");
    setImageUrl("");
    setDesc("");
  }

  async function deletePlace(id: string) {
    if (!confirm("Hapus tempat ini?")) return;
    const { error } = await createClient().from("places").delete().eq("id", id);
    if (error) setError(error.message);
    else setRows((arr) => arr.filter((r) => r.id !== id));
  }

  const cities = groupPlaces(rows);
  const existingCities = Array.from(new Set(rows.map((r) => r.city)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Tempat & Foto</h1>
          <p className="text-sm text-gray-500">
            Daftar atraksi per kota beserta foto & deskripsi. Dipakai di
            Itinerary.
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
            {saving ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      </div>

      <ErrorNote message={error} />

      {/* Add form */}
      <section className="rounded-xl border border-[#F5C518]/40 border-t-4 border-t-[#F5C518] bg-[#FFFCEF] p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5C518] text-xl font-bold leading-none text-[#1B2A4A] shadow-sm">
            +
          </span>
          <h3 className="text-base font-bold text-[#1B2A4A]">
            Tambah tempat baru
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1.6fr_auto] lg:items-end">
          <Field label="Kota">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              list="place-cities"
              placeholder="Bangkok"
              className={inputCls}
            />
            <datalist id="place-cities">
              {existingCities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Nama tempat">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grand Palace"
              className={inputCls}
            />
          </Field>
          <Field label="URL gambar">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…/foto.jpg"
              className={inputCls}
            />
          </Field>
          <button
            type="button"
            onClick={addPlace}
            disabled={!city.trim() || !name.trim()}
            className={`${btnCls} h-[42px] disabled:opacity-50`}
          >
            Tambah
          </button>
          <div className="lg:col-span-4">
            <Field label="Deskripsi singkat (opsional)">
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Istana kerajaan, ikon Bangkok"
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      </section>

      {cities.map((c) => (
        <section key={c.city} className="space-y-3">
          <h2 className="font-bold text-[#1B2A4A]">{c.city}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.items.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
                    belum ada foto
                  </div>
                )}
                <div className="space-y-2 p-3">
                  <input
                    value={p.name}
                    onChange={(e) => patch(p.id, { name: e.target.value })}
                    className={`${inputCls} font-semibold`}
                  />
                  <input
                    value={p.image_url ?? ""}
                    onChange={(e) =>
                      patch(p.id, {
                        image_url: e.target.value.trim() || null,
                      })
                    }
                    placeholder="URL gambar"
                    className={`${inputCls} text-xs`}
                  />
                  <input
                    value={p.description ?? ""}
                    onChange={(e) =>
                      patch(p.id, { description: e.target.value || null })
                    }
                    placeholder="Deskripsi singkat"
                    className={`${inputCls} text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => deletePlace(p.id)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {rows.length === 0 && !error && (
        <p className="text-sm text-gray-400">
          Belum ada tempat. Tambah di atas.
        </p>
      )}
    </div>
  );
}
