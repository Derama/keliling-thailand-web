"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import type { Customer, SocialPost } from "@/lib/admin/types";
import {
  KIND_LABELS,
  POST_KINDS,
  type BrandColors,
  type PostKind,
} from "@/lib/admin/instagram";
import { loadBrandColors } from "@/lib/admin/settings";
import { listSocialPosts, deleteSocialPost } from "@/lib/admin/socialPosts";
import ReviewEditor from "@/components/admin/instagram/ReviewEditor";
import AttractionEditor from "@/components/admin/instagram/AttractionEditor";
import JourneyEditor from "@/components/admin/instagram/JourneyEditor";
import { errMsg } from "@/components/admin/instagram/util";
import Modal from "@/components/admin/Modal";

/** Journey posts keep their carousel slide URLs in payload.slideUrls. */
function slideUrls(p: SocialPost): string[] {
  const urls = p.payload?.slideUrls;
  return Array.isArray(urls) ? urls.map(String) : [];
}

export default function InstagramStudioView() {
  const [kind, setKind] = useState<PostKind>("review");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [brandColors, setBrandColors] = useState<BrandColors>({
    navy: "#1B2A4A",
    yellow: "#F5C518",
  });
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"make" | "gallery">("make");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [preview, setPreview] = useState<SocialPost | null>(null);

  // Load brand colors + customers once; editors receive them as props.
  useEffect(() => {
    (async () => {
      setBrandColors(await loadBrandColors());
      const { data: cust } = await createClient().from("customers").select("*").order("name");
      setCustomers(cust ?? []);
    })();
  }, []);

  async function openGallery() {
    setTab("gallery");
    setError(null);
    try {
      setPosts(await listSocialPosts());
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function removePost(id: string) {
    if (!confirm("Hapus post ini dari galeri?")) return;
    setError(null);
    try {
      await deleteSocialPost(id);
      setPosts((ps) => ps.filter((p) => p.id !== id));
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Instagram Studio</h1>
        <div className="flex shrink-0 gap-2">
          <button className={tab === "make" ? btnCls : btnSecondaryCls} onClick={() => setTab("make")}>Editor</button>
          <button className={tab === "gallery" ? btnCls : btnSecondaryCls} onClick={openGallery}>Galeri</button>
        </div>
      </div>

      <ErrorNote message={error} />

      {tab === "gallery" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {posts.map((p) => {
            const slides = slideUrls(p);
            return (
              <div key={p.id} className="relative overflow-hidden rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => removePost(p.id)}
                  title="Hapus"
                  className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-sm text-white hover:bg-red-600"
                >
                  ✕
                </button>
                <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
                  {KIND_LABELS[p.kind ?? "review"]}
                  {slides.length > 1 ? ` · ${slides.length} slide` : ""}
                </span>
                <button type="button" onClick={() => setPreview(p)} className="block w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt="" className="aspect-[4/5] w-full cursor-pointer object-cover" />
                </button>
                {p.caption && (
                  <p className="line-clamp-3 p-2 text-xs text-gray-600">{p.caption}</p>
                )}
              </div>
            );
          })}
          {posts.length === 0 && <p className="text-sm text-gray-500">Belum ada post.</p>}
        </div>
      ) : (
        <>
          {/* Purpose picker: what is this post for? */}
          <div className="flex flex-wrap gap-1.5">
            {POST_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  kind === k
                    ? "bg-[#1B2A4A] text-white"
                    : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>

          {kind === "review" && <ReviewEditor customers={customers} brandColors={brandColors} />}
          {kind === "attraction" && <AttractionEditor brandColors={brandColors} />}
          {kind === "journey" && <JourneyEditor customers={customers} brandColors={brandColors} />}
        </>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Pratinjau post">
        {preview && (
          <div className="space-y-4">
            {slideUrls(preview).length > 1 ? (
              <div className="no-scrollbar -mx-2 flex snap-x gap-3 overflow-x-auto px-2">
                {slideUrls(preview).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`Slide ${i + 1}`}
                    className="max-h-[55vh] w-auto shrink-0 snap-center rounded-lg"
                  />
                ))}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.image_url}
                alt=""
                className="mx-auto max-h-[60vh] w-auto rounded-lg"
              />
            )}
            {preview.caption && (
              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">Caption</p>
                <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {preview.caption}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <a href={preview.image_url} download target="_blank" rel="noreferrer" className={btnCls}>
                Download PNG
              </a>
              {preview.caption && (
                <button
                  type="button"
                  className={btnSecondaryCls}
                  onClick={() => navigator.clipboard?.writeText(preview.caption ?? "")}
                >
                  Salin caption
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
