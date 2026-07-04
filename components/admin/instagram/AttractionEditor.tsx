"use client";

import { useEffect, useRef, useState } from "react";
import { captureNodePng } from "@/lib/admin/pdfDownload";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import {
  defaultAttractionData,
  ATTRACTION_TEMPLATE_IDS,
  FORMAT_LABELS,
  FORMAT_SIZES,
  type AttractionData,
  type AttractionTemplateId,
  type BrandColors,
  type PostFormat,
} from "@/lib/admin/instagram";
import { uploadPostImage, saveSocialPost } from "@/lib/admin/socialPosts";
import { ATTRACTION_TEMPLATES } from "@/components/admin/instagram/templates/attraction";
import { errMsg, fileToDataUrl, PhotoDrop, ScaledFrame } from "@/components/admin/instagram/util";
import Select from "@/components/admin/Select";

export default function AttractionEditor({ brandColors }: { brandColors: BrandColors }) {
  const [data, setData] = useState<AttractionData>(defaultAttractionData());
  const [format, setFormat] = useState<PostFormat>("4x5");
  const [templateId, setTemplateId] = useState<AttractionTemplateId>("P1");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoPublicUrl, setPhotoPublicUrl] = useState<string | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData((d) => ({ ...d, logoUrl: "/brand-logo.png", brandColors }));
  }, [brandColors]);

  function patch(p: Partial<AttractionData>) {
    setData((d) => ({ ...d, ...p }));
  }

  async function onPhoto(file: File) {
    setBusy("photo");
    setError(null);
    try {
      // Render from a same-origin data URL so the export canvas isn't tainted.
      patch({ photoUrl: await fileToDataUrl(file) });
      const url = await uploadPostImage(file, "photo", file.name.split(".").pop() || "jpg");
      setPhotoPublicUrl(url);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function polishHook() {
    if (!data.hook.trim()) return;
    setBusy("polish");
    setError(null);
    try {
      const res = await fetch("/api/instagram/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.hook }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI gagal");
      patch({ hook: json.text });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function genCaption() {
    setBusy("caption");
    setError(null);
    try {
      const res = await fetch("/api/instagram/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "attraction",
          title: data.title,
          location: data.location,
          date: data.date,
          hook: data.hook,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI gagal");
      setCaption(json.caption);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function exportPost() {
    if (!nodeRef.current) return;
    if (!data.photoUrl) {
      setError("Upload foto atraksi/event dulu.");
      return;
    }
    if (!data.title.trim()) {
      setError("Isi judul event/atraksi dulu.");
      return;
    }
    setBusy("export");
    setError(null);
    try {
      const { w, h } = FORMAT_SIZES[format];
      const dataUrl = await captureNodePng(nodeRef.current, { width: w, height: h, pixelRatio: 1, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const imageUrl = await uploadPostImage(blob, "post", "png");
      await saveSocialPost({
        kind: "attraction",
        image_url: imageUrl,
        photo_url: photoPublicUrl,
        review_text: null,
        customer_name: null,
        city: null,
        destination: data.location || null,
        rating: null,
        caption,
        template: templateId,
        format,
        payload: {
          title: data.title,
          location: data.location,
          date: data.date,
          hook: data.hook,
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `atraksi-${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error("IG export failed:", e);
      setError(`Export gagal: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  }

  const { Component } = ATTRACTION_TEMPLATES[templateId];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
      {/* Input panel */}
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <ErrorNote message={error} />
        <Field label="Foto atraksi / event">
          <PhotoDrop
            hasPhoto={!!data.photoUrl}
            uploading={busy === "photo"}
            emptyLabel="📷 Klik untuk upload foto atraksi"
            onFile={onPhoto}
          />
        </Field>

        <Field label="Judul event / atraksi">
          <input
            className={inputCls}
            value={data.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Songkran Festival 2026"
          />
        </Field>
        <Field label="Lokasi">
          <input
            className={inputCls}
            value={data.location}
            onChange={(e) => patch({ location: e.target.value })}
            placeholder="Bangkok"
          />
        </Field>
        <Field label="Tanggal (opsional)">
          <input
            className={inputCls}
            value={data.date}
            onChange={(e) => patch({ date: e.target.value })}
            placeholder="13–15 April 2026"
          />
        </Field>

        <Field label="Hook / kalimat pemancing">
          <textarea
            className={`${inputCls} min-h-20`}
            value={data.hook}
            onChange={(e) => patch({ hook: e.target.value })}
            placeholder="Perang air terbesar sedunia — sekali seumur hidup wajib coba!"
          />
        </Field>
        <button className={btnSecondaryCls} onClick={polishHook} disabled={busy === "polish" || !data.hook.trim()}>
          {busy === "polish" ? "Merapikan…" : "Rapikan dengan AI"}
        </button>

        <Field label="Format">
          <Select
            value={format}
            onChange={(v) => setFormat(v as PostFormat)}
            options={(Object.keys(FORMAT_LABELS) as PostFormat[]).map((f) => ({
              value: f,
              label: FORMAT_LABELS[f],
            }))}
          />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">Template</span>
          <div className="flex flex-wrap gap-2">
            {ATTRACTION_TEMPLATE_IDS.map((t) => (
              <button
                key={t}
                onClick={() => setTemplateId(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${t === templateId ? "border-[#1B2A4A] bg-[#1B2A4A] text-white" : "border-gray-300 text-gray-700"}`}
              >
                {t} · {ATTRACTION_TEMPLATES[t].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button className={btnSecondaryCls} onClick={genCaption} disabled={busy === "caption"}>
            {busy === "caption" ? "Membuat…" : "Buat caption"}
          </button>
          <button className={btnCls} onClick={exportPost} disabled={busy === "export"}>
            {busy === "export" ? "Memproses…" : "Buat & Download Post"}
          </button>
        </div>

        {caption && (
          <Field label="Caption">
            <textarea className={`${inputCls} min-h-32`} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
        )}
      </section>

      {/* Preview */}
      <section className="flex justify-center rounded-xl border border-gray-200 bg-gray-50 p-5">
        <ScaledFrame ref={nodeRef} format={format} maxWidth={360}>
          <Component data={data} format={format} />
        </ScaledFrame>
      </section>
    </div>
  );
}
