"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HandoverMedia } from "@/lib/rental/types";
import { btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

const BUCKET = "rental-media";

export default function MediaUpload({
  handoverId,
  type,
  label,
}: {
  handoverId: string;
  type: "photo" | "video";
  label: string;
}) {
  const [items, setItems] = useState<{ media: HandoverMedia; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("handover_media")
      .select("*")
      .eq("handover_id", handoverId)
      .eq("type", type)
      .order("created_at");
    const media = data ?? [];
    const signed = await Promise.all(
      media.map(async (m) => {
        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(m.storage_path, 3600);
        return { media: m, url: s?.signedUrl ?? "" };
      })
    );
    setItems(signed);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoverId, type]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    for (const file of files) {
      const ext = file.name.split(".").pop() || (type === "photo" ? "jpg" : "mp4");
      const path = `${handoverId}/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) {
        setError(`Gagal unggah: ${upErr.message}`);
        setBusy(false);
        return;
      }
      const { error: insErr } = await supabase
        .from("handover_media")
        .insert({ handover_id: handoverId, type, storage_path: path });
      if (insErr) {
        setError(`Gagal simpan: ${insErr.message}`);
        setBusy(false);
        return;
      }
    }
    e.target.value = "";
    setBusy(false);
    load();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <label className={`${btnSecondaryCls} cursor-pointer text-xs`}>
          {busy ? "Mengunggah…" : "+ Tambah"}
          <input
            type="file"
            accept={type === "photo" ? "image/*" : "video/*"}
            capture="environment"
            multiple
            onChange={onPick}
            className="hidden"
          />
        </label>
      </div>
      <ErrorNote message={error} />
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ media, url }) =>
          type === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={media.id} src={url} alt="" className="h-24 w-full rounded-lg object-cover" />
          ) : (
            <video key={media.id} src={url} controls className="h-24 w-full rounded-lg object-cover" />
          )
        )}
        {items.length === 0 && <p className="col-span-3 text-xs text-gray-400">Belum ada {label.toLowerCase()}.</p>}
      </div>
    </div>
  );
}
