"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import type { Customer, SocialPost } from "@/lib/admin/types";
import {
  defaultPostData,
  FORMAT_LABELS,
  FORMAT_SIZES,
  TEMPLATE_IDS,
  type PostData,
  type PostFormat,
  type TemplateId,
} from "@/lib/admin/instagram";
import { loadBrandColors, loadBrandLogo, saveBrandLogo } from "@/lib/admin/settings";
import { uploadPostImage, saveSocialPost, listSocialPosts } from "@/lib/admin/socialPosts";
import { TEMPLATES } from "@/components/admin/instagram/templates";
import PostPreview from "@/components/admin/instagram/PostPreview";

export default function InstagramStudioView() {
  const [data, setData] = useState<PostData>(defaultPostData());
  const [format, setFormat] = useState<PostFormat>("4x5");
  const [templateId, setTemplateId] = useState<TemplateId>("A");
  const [caption, setCaption] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"make" | "gallery">("make");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Load brand assets + customers once.
  useEffect(() => {
    (async () => {
      const [logo, colors] = await Promise.all([loadBrandLogo(), loadBrandColors()]);
      // Fall back to the repo's bundled brand logo when none has been uploaded yet.
      setData((d) => ({ ...d, logoUrl: logo ?? "/brand-logo.png", brandColors: colors }));
      const { data: cust } = await createClient().from("customers").select("*").order("name");
      setCustomers(cust ?? []);
    })();
  }, []);

  function patch(p: Partial<PostData>) {
    setData((d) => ({ ...d, ...p }));
  }

  async function onPhoto(file: File) {
    setBusy("photo");
    setError(null);
    try {
      const url = await uploadPostImage(file, "photo", file.name.split(".").pop() || "jpg");
      patch({ photoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload foto gagal");
    } finally {
      setBusy(null);
    }
  }

  async function onLogo(file: File) {
    setBusy("logo");
    setError(null);
    try {
      const url = await uploadPostImage(file, "logo", file.name.split(".").pop() || "png");
      await saveBrandLogo(url);
      patch({ logoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload logo gagal");
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
      setError(e instanceof Error ? e.message : "AI gagal");
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
          reviewText: data.reviewText,
          customerName: data.customerName,
          destination: data.destination,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI gagal");
      setCaption(json.caption);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI gagal");
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
      const dataUrl = await toPng(nodeRef.current, { width: w, height: h, pixelRatio: 1, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const imageUrl = await uploadPostImage(blob, "post", "png");
      await saveSocialPost({
        image_url: imageUrl,
        photo_url: data.photoUrl,
        review_text: data.reviewText,
        customer_name: data.customerName,
        city: data.city,
        destination: data.destination,
        rating: data.rating,
        caption,
        template: templateId,
        format,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `post-${Date.now()}.png`;
      a.click();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export gagal");
    } finally {
      setBusy(null);
    }
  }

  async function openGallery() {
    setTab("gallery");
    setError(null);
    try {
      setPosts(await listSocialPosts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat galeri");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Instagram Studio</h1>
        <div className="flex gap-2">
          <button className={tab === "make" ? btnCls : btnSecondaryCls} onClick={() => setTab("make")}>Buat Post</button>
          <button className={tab === "gallery" ? btnCls : btnSecondaryCls} onClick={openGallery}>Galeri</button>
        </div>
      </div>

      <ErrorNote message={error} />

      {tab === "gallery" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {posts.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border border-gray-200">
              <a href={p.image_url} download target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt="" className="aspect-[4/5] w-full object-cover" />
              </a>
              {p.caption && (
                <p className="line-clamp-3 p-2 text-xs text-gray-600">{p.caption}</p>
              )}
            </div>
          ))}
          {posts.length === 0 && <p className="text-sm text-gray-500">Belum ada post.</p>}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
          {/* Input panel */}
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <Field label="Foto tamu">
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} className="text-sm" />
            </Field>

            <Field label="Pilih customer (opsional)">
              <select
                className={inputCls}
                onChange={(e) => {
                  const c = customers.find((x) => x.id === e.target.value);
                  if (c) patch({ customerName: c.name, city: c.origin_city ?? "" });
                }}
                defaultValue=""
              >
                <option value="">— manual —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
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
              <select className={inputCls} value={data.rating} onChange={(e) => patch({ rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </Field>

            <Field label="Format">
              <select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value as PostFormat)}>
                {(Object.keys(FORMAT_LABELS) as PostFormat[]).map((f) => (
                  <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                ))}
              </select>
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

            <Field label="Logo brand">
              <input type="file" accept="image/png" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} className="text-sm" />
            </Field>

            <div className="flex gap-2 pt-2">
              <button className={btnSecondaryCls} onClick={genCaption} disabled={busy === "caption"}>
                {busy === "caption" ? "Membuat…" : "Buat caption"}
              </button>
              <button className={btnCls} onClick={exportPost} disabled={busy === "export"}>
                {busy === "export" ? "Mengekspor…" : "Export PNG"}
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
            <PostPreview ref={nodeRef} data={data} format={format} templateId={templateId} maxWidth={360} />
          </section>
        </div>
      )}
    </div>
  );
}
