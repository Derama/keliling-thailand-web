"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import Modal from "@/components/admin/Modal";
import { groupPlaces, type Place } from "@/lib/admin/places";

// Public bucket holding attraction photos. Create it once in Supabase:
//   Storage → New bucket → name "place-images", Public = on.
const BUCKET = "place-images";

/** Upload a file to the public bucket; return its public URL. */
async function uploadPlaceImage(file: File, city: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const slug = (city || "misc").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Ask the server (OpenAI) for a short Indonesian blurb. */
async function aiDescription(name: string, city: string): Promise<string> {
  const res = await fetch("/api/place-description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, city }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Gagal generate deskripsi.");
  return String(data.description ?? "");
}

export default function PlacesView() {
  const [rows, setRows] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cardBusy, setCardBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    createClient()
      .from("places")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data as Place[]) ?? []);
      });
  }, []);

  useEffect(load, [load]);

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

  async function deletePlace(id: string) {
    if (!confirm("Hapus tempat ini?")) return;
    const { error } = await createClient().from("places").delete().eq("id", id);
    if (error) setError(error.message);
    else setRows((arr) => arr.filter((r) => r.id !== id));
  }

  // Per-card photo replace: upload, then patch the row (saved on "Simpan").
  async function replacePhoto(p: Place, file: File) {
    setCardBusy(p.id);
    setError(null);
    try {
      const url = await uploadPlaceImage(file, p.city);
      patch(p.id, { image_url: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal unggah foto.");
    } finally {
      setCardBusy(null);
    }
  }

  // Per-card AI description: write into the row (saved on "Simpan").
  async function aiCard(p: Place) {
    setCardBusy(p.id);
    setError(null);
    try {
      const desc = await aiDescription(p.name, p.city);
      patch(p.id, { description: desc });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate.");
    } finally {
      setCardBusy(null);
    }
  }

  const cities = groupPlaces(rows);
  const existingCities = Array.from(new Set(rows.map((r) => r.city)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Tempat &amp; Foto</h1>
          <p className="text-sm text-gray-500">
            Daftar atraksi per kota beserta foto &amp; deskripsi. Dipakai di
            Itinerary.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && !dirty && (
            <span className="text-sm text-green-700">Tersimpan ✓</span>
          )}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={btnCls}
          >
            + Tambah tempat
          </button>
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

      {cities.map((c) => (
        <section key={c.city} className="space-y-3">
          <h2 className="font-bold text-[#1B2A4A]">{c.city}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.items.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <div className="relative">
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
                  <label className="absolute bottom-2 right-2 cursor-pointer rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white hover:bg-black/75">
                    {cardBusy === p.id ? "…" : "Ganti foto"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) replacePhoto(p, f);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="space-y-2 p-3">
                  <input
                    value={p.name}
                    onChange={(e) => patch(p.id, { name: e.target.value })}
                    className={`${inputCls} font-semibold`}
                  />
                  <textarea
                    rows={2}
                    value={p.description ?? ""}
                    onChange={(e) =>
                      patch(p.id, { description: e.target.value || null })
                    }
                    placeholder="Deskripsi singkat"
                    className={`${inputCls} text-xs`}
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => aiCard(p)}
                      disabled={cardBusy === p.id}
                      className="text-sm font-medium text-[#1B2A4A] hover:underline disabled:opacity-50"
                    >
                      {cardBusy === p.id ? "…" : "✨ Deskripsi AI"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePlace(p.id)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {rows.length === 0 && !error && (
        <p className="text-sm text-gray-400">
          Belum ada tempat. Klik “+ Tambah tempat”.
        </p>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Tambah tempat baru"
      >
        <AddPlaceForm
          existingCities={existingCities}
          nextSort={rows.reduce((m, r) => Math.max(m, r.sort), 0) + 10}
          onAdded={(row) => {
            setRows((arr) => [...arr, row]);
            setAdding(false);
          }}
        />
      </Modal>
    </div>
  );
}

function AddPlaceForm({
  existingCities,
  nextSort,
  onAdded,
}: {
  existingCities: string[];
  nextSort: number;
  onAdded: (row: Place) => void;
}) {
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setImageUrl(await uploadPlaceImage(file, city));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal unggah foto.");
    } finally {
      setUploading(false);
    }
  }

  async function onGenerate() {
    if (!name.trim()) {
      setError("Isi nama tempat dulu.");
      return;
    }
    setAiBusy(true);
    setError(null);
    try {
      setDesc(await aiDescription(name.trim(), city.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate.");
    } finally {
      setAiBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !name.trim()) return;
    setBusy(true);
    setError(null);
    const row: Place = {
      id: crypto.randomUUID(),
      city: city.trim(),
      name: name.trim(),
      image_url: imageUrl,
      description: desc.trim() || null,
      sort: nextSort,
    };
    const { error } = await createClient().from("places").insert(row);
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    onAdded(row);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kota">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            list="add-place-cities"
            placeholder="Bangkok"
            className={inputCls}
          />
          <datalist id="add-place-cities">
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
      </div>

      <Field label="Foto">
        <div className="flex items-center gap-3">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-20 w-28 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-20 w-28 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
              belum ada
            </div>
          )}
          <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            {uploading ? "Mengunggah…" : imageUrl ? "Ganti foto" : "Unggah foto"}
            <input
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              className="hidden"
            />
          </label>
        </div>
      </Field>

      <Field label="Deskripsi">
        <textarea
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Istana kerajaan, ikon Bangkok…"
          className={inputCls}
        />
      </Field>
      <button
        type="button"
        onClick={onGenerate}
        disabled={aiBusy}
        className="text-sm font-medium text-[#1B2A4A] hover:underline disabled:opacity-50"
      >
        {aiBusy ? "Membuat…" : "✨ Buat deskripsi dengan AI"}
      </button>

      <ErrorNote message={error} />
      <button
        type="submit"
        disabled={busy || uploading || !city.trim() || !name.trim()}
        className={`${btnCls} disabled:opacity-50`}
      >
        {busy ? "Menyimpan…" : "Tambah tempat"}
      </button>
    </form>
  );
}
