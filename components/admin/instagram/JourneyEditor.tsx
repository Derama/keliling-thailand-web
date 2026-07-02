"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import type { Customer } from "@/lib/admin/types";
import {
  defaultJourneyData,
  JOURNEY_STYLE_IDS,
  FORMAT_LABELS,
  FORMAT_SIZES,
  type BrandColors,
  type JourneyData,
  type JourneySlide,
  type JourneyStyleId,
  type PostFormat,
} from "@/lib/admin/instagram";
import { uploadPostImage, saveSocialPost } from "@/lib/admin/socialPosts";
import { JOURNEY_STYLES } from "@/components/admin/instagram/templates/journey";
import { errMsg, fileToDataUrl, PhotoDrop, ScaledFrame } from "@/components/admin/instagram/util";
import CustomerSelect from "@/components/admin/CustomerSelect";
import Select from "@/components/admin/Select";

export default function JourneyEditor({
  customers,
  brandColors,
}: {
  customers: Customer[];
  brandColors: BrandColors;
}) {
  const [data, setData] = useState<JourneyData>(defaultJourneyData());
  const [format, setFormat] = useState<PostFormat>("4x5");
  const [styleId, setStyleId] = useState<JourneyStyleId>("J1");
  const [caption, setCaption] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // -1 = cover, otherwise index into data.slides.
  const [previewSlide, setPreviewSlide] = useState(-1);
  // Full-size nodes for export: index 0 = cover, 1..N = day slides.
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setData((d) => ({ ...d, logoUrl: "/brand-logo.png", brandColors }));
  }, [brandColors]);

  function patch(p: Partial<JourneyData>) {
    setData((d) => ({ ...d, ...p }));
  }

  function patchSlide(i: number, p: Partial<JourneySlide>) {
    setData((d) => ({
      ...d,
      slides: d.slides.map((s, j) => (j === i ? { ...s, ...p } : s)),
    }));
  }

  function addSlide() {
    setData((d) => ({
      ...d,
      slides: [...d.slides, { photoUrl: "", label: `Day ${d.slides.length + 1}`, text: "" }],
    }));
    setPreviewSlide(data.slides.length);
  }

  function removeSlide(i: number) {
    setData((d) => ({ ...d, slides: d.slides.filter((_, j) => j !== i) }));
    setPreviewSlide(-1);
  }

  async function onPhoto(file: File, slideIndex: number) {
    setBusy(`photo-${slideIndex}`);
    setError(null);
    try {
      // Render from same-origin data URLs so the export canvas isn't tainted.
      const dataUrl = await fileToDataUrl(file);
      if (slideIndex < 0) patch({ coverPhotoUrl: dataUrl });
      else patchSlide(slideIndex, { photoUrl: dataUrl });
      setPreviewSlide(slideIndex);
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
          kind: "journey",
          title: data.title,
          customerName: data.customerName,
          days: data.slides.map((s) => `${s.label}: ${s.text}`),
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

  async function exportCarousel() {
    if (!data.title.trim()) {
      setError("Isi judul trip dulu.");
      return;
    }
    if (!data.coverPhotoUrl) {
      setError("Upload foto cover dulu.");
      return;
    }
    const missing = data.slides.findIndex((s) => !s.photoUrl);
    if (missing >= 0) {
      setError(`Upload foto untuk ${data.slides[missing].label} dulu (atau hapus slide-nya).`);
      return;
    }
    setBusy("export");
    setError(null);
    try {
      const { w, h } = FORMAT_SIZES[format];
      const slideUrls: string[] = [];
      const stamp = Date.now();
      for (let i = 0; i < data.slides.length + 1; i++) {
        const node = exportRefs.current[i];
        if (!node) throw new Error("Slide belum siap — coba lagi.");
        const dataUrl = await toPng(node, { width: w, height: h, pixelRatio: 1, cacheBust: true });
        const blob = await (await fetch(dataUrl)).blob();
        slideUrls.push(await uploadPostImage(blob, "post", "png"));
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `journey-${stamp}-${i + 1}.png`;
        a.click();
      }
      await saveSocialPost({
        kind: "journey",
        image_url: slideUrls[0],
        photo_url: null,
        review_text: null,
        customer_name: data.customerName || null,
        city: null,
        destination: null,
        rating: null,
        caption,
        template: styleId,
        format,
        payload: {
          title: data.title,
          slideUrls,
          days: data.slides.map((s) => ({ label: s.label, text: s.text })),
        },
      });
    } catch (e) {
      console.error("IG export failed:", e);
      setError(`Export gagal: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  }

  const { Component } = JOURNEY_STYLES[styleId];
  const previewIndex = previewSlide >= data.slides.length ? -1 : previewSlide;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
      {/* Input panel */}
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <ErrorNote message={error} />

        <Field label="Judul trip">
          <input
            className={inputCls}
            value={data.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="5D4N Bangkok & Pattaya"
          />
        </Field>

        <Field label="Pilih customer (opsional)">
          <CustomerSelect
            value={customerId}
            customers={customers}
            onChange={(id) => {
              setCustomerId(id);
              const c = customers.find((x) => x.id === id);
              patch({ customerName: c?.name ?? "" });
            }}
          />
        </Field>
        <Field label="Nama customer">
          <input
            className={inputCls}
            value={data.customerName}
            onChange={(e) => patch({ customerName: e.target.value })}
          />
        </Field>

        <Field label="Foto cover">
          <PhotoDrop
            hasPhoto={!!data.coverPhotoUrl}
            uploading={busy === "photo--1"}
            emptyLabel="📷 Klik untuk upload foto cover"
            onFile={(f) => onPhoto(f, -1)}
          />
        </Field>

        <div className="space-y-3">
          <span className="block text-sm font-medium text-gray-700">Slide per hari</span>
          {data.slides.map((s, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  className={`${inputCls} max-w-28`}
                  value={s.label}
                  onChange={(e) => patchSlide(i, { label: e.target.value })}
                />
                {data.slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlide(i)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <input
                className={inputCls}
                value={s.text}
                onChange={(e) => patchSlide(i, { text: e.target.value })}
                placeholder="Grand Palace & Wat Arun"
              />
              <PhotoDrop
                hasPhoto={!!s.photoUrl}
                uploading={busy === `photo-${i}`}
                emptyLabel={`📷 Foto ${s.label}`}
                onFile={(f) => onPhoto(f, i)}
              />
            </div>
          ))}
          <button type="button" onClick={addSlide} className={btnSecondaryCls}>
            + Tambah hari
          </button>
        </div>

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
          <span className="mb-1 block text-sm font-medium text-gray-700">Gaya</span>
          <div className="flex flex-wrap gap-2">
            {JOURNEY_STYLE_IDS.map((t) => (
              <button
                key={t}
                onClick={() => setStyleId(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${t === styleId ? "border-[#1B2A4A] bg-[#1B2A4A] text-white" : "border-gray-300 text-gray-700"}`}
              >
                {t} · {JOURNEY_STYLES[t].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button className={btnSecondaryCls} onClick={genCaption} disabled={busy === "caption"}>
            {busy === "caption" ? "Membuat…" : "Buat caption"}
          </button>
          <button className={btnCls} onClick={exportCarousel} disabled={busy === "export"}>
            {busy === "export" ? "Memproses…" : `Download ${data.slides.length + 1} slide`}
          </button>
        </div>

        {caption && (
          <Field label="Caption">
            <textarea className={`${inputCls} min-h-32`} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
        )}
      </section>

      {/* Preview */}
      <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex flex-wrap justify-center gap-1.5">
          {[-1, ...data.slides.map((_, i) => i)].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPreviewSlide(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                previewIndex === i
                  ? "bg-[#1B2A4A] text-white"
                  : "bg-white text-gray-500 ring-1 ring-gray-200"
              }`}
            >
              {i < 0 ? "Cover" : data.slides[i].label}
            </button>
          ))}
        </div>
        <div className="flex justify-center">
          <ScaledFrame format={format} maxWidth={360}>
            <Component data={data} format={format} slideIndex={previewIndex} />
          </ScaledFrame>
        </div>
      </section>

      {/* Hidden full-size nodes for carousel export (index 0 = cover). */}
      <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
        {[-1, ...data.slides.map((_, i) => i)].map((slideIndex, pos) => (
          <div
            key={pos}
            ref={(el) => {
              exportRefs.current[pos] = el;
            }}
          >
            <Component data={data} format={format} slideIndex={slideIndex} />
          </div>
        ))}
      </div>
    </div>
  );
}
