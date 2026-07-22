"use client";

import { useEffect, useRef, useState } from "react";
import { captureNodePng } from "@/lib/admin/pdfDownload";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import type { Customer } from "@/lib/admin/types";
import {
  defaultPostData,
  FORMAT_LABELS,
  FORMAT_SIZES,
  TEMPLATE_IDS,
  type BrandColors,
  type PostData,
  type PostFormat,
  type TemplateId,
} from "@/lib/admin/instagram";
import { uploadPostImage, saveSocialPost } from "@/lib/admin/socialPosts";
import { TEMPLATES } from "@/components/admin/instagram/templates";
import { errMsg, fileToDataUrl, PhotoDrop, ScaledFrame } from "@/components/admin/instagram/util";
import CustomerSelect from "@/components/admin/CustomerSelect";
import Select from "@/components/admin/Select";

export default function ReviewEditor({
  customers,
  brandColors,
}: {
  customers: Customer[];
  brandColors: BrandColors;
}) {
  const [data, setData] = useState<PostData>(defaultPostData());
  const [format, setFormat] = useState<PostFormat>("4x5");
  const [templateId, setTemplateId] = useState<TemplateId>("A");
  const [caption, setCaption] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Public Supabase URL of the source photo, recorded on the saved post.
  // (Rendering uses a local data URL instead — see onPhoto — so html-to-image
  // never taints the canvas with a cross-origin image.)
  const [photoPublicUrl, setPhotoPublicUrl] = useState<string | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Logo is the bundled company brand asset — no upload needed.
    setData((d) => ({ ...d, logoUrl: "/brand-logo.png", brandColors }));
  }, [brandColors]);

  function patch(p: Partial<PostData>) {
    setData((d) => ({ ...d, ...p }));
  }

  async function onPhoto(file: File) {
    setBusy("photo");
    setError(null);
    try {
      // Render from a same-origin data URL so the export canvas isn't tainted.
      patch({ photoUrl: await fileToDataUrl(file) });
      // Upload the original to Supabase for the saved record (non-blocking).
      const url = await uploadPostImage(file, "photo", file.name.split(".").pop() || "jpg");
      setPhotoPublicUrl(url);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function polish() {
    if (!data.reviewText.trim()) return;
    setBusy("polish");
    setError(null);
    try {
      const res = await fetch("/api/instagram/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.reviewText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI gagal");
      patch({ reviewText: json.text });
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
          kind: "review",
          reviewText: data.reviewText,
          customerName: data.customerName,
          destination: data.destination,
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

  function shuffle() {
    const others = TEMPLATE_IDS.filter((t) => t !== templateId);
    setTemplateId(others[Math.floor(Math.random() * others.length)]);
  }

  async function exportPost() {
    if (!nodeRef.current) return;
    if (!data.photoUrl) {
      setError("Upload foto tamu dulu.");
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
        kind: "review",
        image_url: imageUrl,
        photo_url: photoPublicUrl,
        review_text: data.reviewText,
        customer_name: data.customerName,
        city: data.city,
        destination: data.destination,
        rating: data.rating,
        caption,
        template: templateId,
        format,
        payload: null,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `post-${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error("IG export failed:", e);
      setError(`Export gagal: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  }

  const { Component } = TEMPLATES[templateId];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
      {/* Input panel */}
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <ErrorNote message={error} />
        <Field label="Foto tamu">
          <PhotoDrop
            hasPhoto={!!data.photoUrl}
            uploading={busy === "photo"}
            emptyLabel="📷 Klik untuk upload foto tamu"
            onFile={onPhoto}
          />
        </Field>

        <Field label="Pilih customer (opsional)">
          <CustomerSelect
            value={customerId}
            customers={customers}
            onChange={(id) => {
              setCustomerId(id);
              const c = customers.find((x) => x.id === id);
              if (c) patch({ customerName: c.name, city: c.origin_city ?? "" });
            }}
          />
        </Field>

        <Field label="Nama customer">
          <input className={inputCls} value={data.customerName} onChange={(e) => patch({ customerName: e.target.value })} />
        </Field>
        <Field label="Kota">
          <input className={inputCls} value={data.city} onChange={(e) => patch({ city: e.target.value })} />
        </Field>
        <Field label="Destinasi">
          <input className={inputCls} value={data.destination} onChange={(e) => patch({ destination: e.target.value })} placeholder="Bangkok" />
        </Field>

        <Field label="Ulasan">
          <textarea className={`${inputCls} min-h-24`} value={data.reviewText} onChange={(e) => patch({ reviewText: e.target.value })} />
        </Field>
        <button className={btnSecondaryCls} onClick={polish} disabled={busy === "polish" || !data.reviewText.trim()}>
          {busy === "polish" ? "Merapikan…" : "Rapikan dengan AI"}
        </button>

        <Field label="Rating">
          <Select
            value={String(data.rating)}
            onChange={(v) => patch({ rating: Number(v) })}
            options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ★` }))}
          />
        </Field>

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
            {TEMPLATE_IDS.map((t) => (
              <button
                key={t}
                onClick={() => setTemplateId(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${t === templateId ? "border-[#1B2A4A] bg-[#1B2A4A] text-white" : "border-gray-300 text-gray-700"}`}
              >
                {t} · {TEMPLATES[t].label}
              </button>
            ))}
            <button onClick={shuffle} className={btnSecondaryCls}>Acak</button>
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
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex justify-center">
        <ScaledFrame ref={nodeRef} format={format} maxWidth={360}>
          <Component data={data} format={format} />
        </ScaledFrame>
        </div>
      </section>
    </div>
  );
}
