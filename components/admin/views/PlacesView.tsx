"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import Modal from "@/components/admin/Modal";
import { groupPlaces, type Place } from "@/lib/admin/places";
import { seedPlaces } from "@/lib/admin/placeSeed";

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

const placeKey = (city: string, name: string) =>
  `${city.trim().toLowerCase()}|${name.trim().toLowerCase()}`;

export default function PlacesView() {
  const [rows, setRows] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [tidying, setTidying] = useState(false);
  const [filling, setFilling] = useState(false);
  // Editing an existing place, adding a new one (with optional preset city),
  // or closed.
  const [editing, setEditing] = useState<Place | null>(null);
  const [adding, setAdding] = useState<{ city: string } | null>(null);

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

  // Insert any tours.ts attractions not already in the DB (dedupe city+name).
  // Re-reads from the DB first so a stale `rows` state can't cause dupes.
  async function importSeed() {
    setImporting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: readErr } = await supabase.from("places").select("*");
    if (readErr) {
      setError(readErr.message);
      setImporting(false);
      return;
    }
    const current = (data as Place[]) ?? [];
    const existing = new Set(current.map((r) => placeKey(r.city, r.name)));
    const missing = seedPlaces().filter(
      (s) => !existing.has(placeKey(s.city, s.name))
    );
    if (missing.length === 0) {
      setImporting(false);
      alert("Semua atraksi bawaan sudah ada.");
      return;
    }
    if (!confirm(`Impor ${missing.length} atraksi sebagai placeholder?`)) {
      setImporting(false);
      return;
    }
    let sort = current.reduce((m, r) => Math.max(m, r.sort), 0) + 10;
    const payload = missing.map((s) => ({
      id: crypto.randomUUID(),
      city: s.city,
      name: s.name,
      image_url: s.image_url,
      description: s.description,
      sort: (sort += 10),
    }));
    const { error } = await supabase.from("places").insert(payload);
    setImporting(false);
    if (error) setError(error.message);
    else load();
  }

  // Hard reset: delete every place row and re-import the full seed clean.
  // Guarantees no duplicates and that every attraction uses its local photo,
  // regardless of how older rows were named or imaged.
  async function resetGallery() {
    if (
      !confirm(
        "Hapus SEMUA tempat lalu impor ulang dari daftar bawaan?\n\nIni menghilangkan duplikat & memperbaiki foto kosong. Foto yang sudah Anda unggah sendiri akan hilang."
      )
    )
      return;
    setTidying(true);
    setError(null);
    const supabase = createClient();

    // Delete all rows (Supabase requires a filter; this matches everything).
    const { error: delErr } = await supabase
      .from("places")
      .delete()
      .not("id", "is", null);
    if (delErr) {
      setError(delErr.message);
      setTidying(false);
      return;
    }

    // Re-insert the full seed with local photo paths.
    let sort = 0;
    const payload = seedPlaces().map((s) => ({
      id: crypto.randomUUID(),
      city: s.city,
      name: s.name,
      image_url: s.image_url,
      description: s.description,
      sort: (sort += 10),
    }));
    const { error: insErr } = await supabase.from("places").insert(payload);
    setTidying(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    alert(`Selesai. ${payload.length} tempat diimpor ulang tanpa duplikat.`);
    load();
  }

  // Non-destructive: fill empty descriptions from the seed by city+name.
  // Leaves photos and existing descriptions untouched.
  async function fillDescriptions() {
    setFilling(true);
    setError(null);
    const supabase = createClient();
    const { data, error: readErr } = await supabase.from("places").select("*");
    if (readErr) {
      setError(readErr.message);
      setFilling(false);
      return;
    }
    const seedDesc = new Map(
      seedPlaces().map((s) => [placeKey(s.city, s.name), s.description])
    );
    let filled = 0;
    for (const r of (data as Place[]) ?? []) {
      if (r.description && r.description.trim()) continue;
      const desc = seedDesc.get(placeKey(r.city, r.name));
      if (!desc) continue;
      const { error } = await supabase
        .from("places")
        .update({ description: desc })
        .eq("id", r.id);
      if (!error) filled++;
    }
    setFilling(false);
    alert(`Selesai. ${filled} deskripsi terisi.`);
    load();
  }

  const cities = groupPlaces(rows);
  const existingCities = Array.from(new Set(rows.map((r) => r.city)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Tempat &amp; Foto</h1>
          <p className="text-sm text-gray-500">
            Galeri atraksi per kota. Klik foto untuk ubah / unggah foto asli.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fillDescriptions}
            disabled={filling}
            className={`${btnSecondaryCls} disabled:opacity-50`}
          >
            {filling ? "Mengisi…" : "Isi deskripsi"}
          </button>
          <button
            type="button"
            onClick={resetGallery}
            disabled={tidying}
            className={`${btnSecondaryCls} disabled:opacity-50`}
          >
            {tidying ? "Mereset…" : "Reset & impor ulang"}
          </button>
          <button
            type="button"
            onClick={importSeed}
            disabled={importing}
            className={`${btnSecondaryCls} disabled:opacity-50`}
          >
            {importing ? "Mengimpor…" : "Impor atraksi bawaan"}
          </button>
          <button
            type="button"
            onClick={() => setAdding({ city: "" })}
            className={btnCls}
          >
            + Tambah tempat
          </button>
        </div>
      </div>

      <ErrorNote message={error} />

      {cities.map((c) => (
        <section key={c.city} className="space-y-2">
          <h2 className="font-bold text-[#1B2A4A]">{c.city}</h2>
          {/* Facebook-album style collage: first tile large, rest small. */}
          <div className="grid auto-rows-[120px] grid-cols-2 gap-1 sm:auto-rows-[150px] sm:grid-cols-4">
            {c.items.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setEditing(p)}
                className={`group relative overflow-hidden rounded-lg bg-gray-100 ${
                  i === 0 ? "col-span-2 row-span-2" : ""
                }`}
              >
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    belum ada foto
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-xs font-semibold text-white">
                  {p.name}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAdding({ city: c.city })}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-[#F5C518] hover:text-[#1B2A4A]"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-xs font-medium">Tambah</span>
            </button>
          </div>
        </section>
      ))}

      {rows.length === 0 && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Belum ada tempat. Klik{" "}
          <span className="font-semibold">“Impor atraksi bawaan”</span> untuk
          mulai dari daftar atraksi, lalu unggah foto asli.
        </div>
      )}

      <Modal
        open={editing !== null || adding !== null}
        onClose={() => {
          setEditing(null);
          setAdding(null);
        }}
        title={editing ? "Ubah tempat" : "Tambah tempat baru"}
      >
        <PlaceForm
          place={editing}
          initialCity={adding?.city ?? ""}
          existingCities={existingCities}
          nextSort={rows.reduce((m, r) => Math.max(m, r.sort), 0) + 10}
          onDone={() => {
            setEditing(null);
            setAdding(null);
            load();
          }}
        />
      </Modal>
    </div>
  );
}

function PlaceForm({
  place,
  initialCity,
  existingCities,
  nextSort,
  onDone,
}: {
  place: Place | null;
  initialCity: string;
  existingCities: string[];
  nextSort: number;
  onDone: () => void;
}) {
  const [city, setCity] = useState(place?.city ?? initialCity);
  const [name, setName] = useState(place?.name ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(place?.image_url ?? null);
  const [desc, setDesc] = useState(place?.description ?? "");
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
    const supabase = createClient();
    const fields = {
      city: city.trim(),
      name: name.trim(),
      image_url: imageUrl,
      description: desc.trim() || null,
    };
    const { error } = place
      ? await supabase
          .from("places")
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq("id", place.id)
      : await supabase
          .from("places")
          .insert({ id: crypto.randomUUID(), ...fields, sort: nextSort });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    onDone();
  }

  async function onDelete() {
    if (!place || !confirm("Hapus tempat ini?")) return;
    setBusy(true);
    const { error } = await createClient()
      .from("places")
      .delete()
      .eq("id", place.id);
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <Field label="Foto">
        <div className="flex items-center gap-3">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-24 w-36 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-24 w-36 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
              belum ada
            </div>
          )}
          <label className={`${btnSecondaryCls} cursor-pointer`}>
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
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={busy || uploading || !city.trim() || !name.trim()}
          className={`${btnCls} disabled:opacity-50`}
        >
          {busy ? "Menyimpan…" : place ? "Simpan" : "Tambah tempat"}
        </button>
        {place && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="text-sm text-red-500 hover:underline disabled:opacity-50"
          >
            Hapus
          </button>
        )}
      </div>
    </form>
  );
}
