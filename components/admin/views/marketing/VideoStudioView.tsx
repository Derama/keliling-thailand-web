"use client";

import { useEffect, useRef, useState } from "react";
import { btnCls, btnSecondaryCls, inputCls, ErrorNote } from "@/components/admin/ui";
import { loadBrandColors, DEFAULT_BRAND_COLORS, type BrandColors } from "@/lib/admin/settings";
import { captureNodePng } from "@/lib/admin/pdfDownload";
import { errMsg } from "@/components/admin/instagram/util";
import BrandOverlay, {
  DEFAULT_BRAND_FIELDS,
  CAPTION_POSITIONS,
  CAPTION_POSITION_LABELS,
  type BrandFields,
  type CaptionPosition,
} from "@/components/admin/video/BrandOverlay";
import ThumbnailMaker from "@/components/admin/video/ThumbnailMaker";
import { exportBrandedVideo, type MusicMode } from "@/lib/admin/video/ffmpeg";

const FIELDS_KEY = "video-brand-fields";
const PREVIEW_WIDTH = 300;
const MAX_SECONDS = 61;
const MAX_BYTES = 100 * 1024 * 1024;

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

export default function VideoStudioView() {
  const [brandColors, setBrandColors] = useState<BrandColors>(DEFAULT_BRAND_COLORS);
  const [fields, setFields] = useState<BrandFields>(DEFAULT_BRAND_FIELDS);
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [duration, setDuration] = useState(0);
  const [trim, setTrim] = useState({ start: 0, end: 0 });
  const [caption, setCaption] = useState("");
  const [captionPos, setCaptionPos] = useState<CaptionPosition>("bottom");
  const [music, setMusic] = useState<File | null>(null);
  const [musicMode, setMusicMode] = useState<MusicMode>("mix");
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [tab, setTab] = useState<"edit" | "thumbnail">("edit");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exportNodeRef = useRef<HTMLDivElement>(null);

  // Brand colors from settings; contact fields from localStorage.
  useEffect(() => {
    loadBrandColors().then(setBrandColors);
    try {
      const saved = localStorage.getItem(FIELDS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount localStorage sync
      if (saved) setFields({ ...DEFAULT_BRAND_FIELDS, ...JSON.parse(saved) });
    } catch {
      /* corrupt storage — keep defaults */
    }
  }, []);

  function updateField(key: keyof BrandFields, value: string) {
    setFields((f) => {
      const next = { ...f, [key]: value };
      localStorage.setItem(FIELDS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function onVideoFile(file: File) {
    setError(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideo(file);
    setVideoUrl(URL.createObjectURL(file));
    setDims(null);
    setDuration(0);
    setTrim({ start: 0, end: 0 });
    setTab("edit");
  }

  function onMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    setDims({ w: v.videoWidth, h: v.videoHeight });
    setDuration(v.duration);
    setTrim({ start: 0, end: v.duration });
  }

  async function exportVideo() {
    if (!video || !dims || !exportNodeRef.current) return;
    setError(null);
    setProgress(0);
    try {
      const overlayPng = await captureNodePng(exportNodeRef.current, {
        width: dims.w,
        height: dims.h,
        pixelRatio: 1,
        cacheBust: true,
      });
      const blob = await exportBrandedVideo({
        video,
        overlayPng,
        trimStart: trim.start,
        trimEnd: trim.end,
        music,
        musicMode,
        musicVolume,
        onProgress: setProgress,
      });
      downloadBlob(blob, video.name.replace(/\.[^.]+$/, "") + "-branded.mp4");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setProgress(null);
    }
  }

  const tooLong = duration > MAX_SECONDS;
  const tooBig = (video?.size ?? 0) > MAX_BYTES;
  const scale = dims ? PREVIEW_WIDTH / dims.w : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Video Studio</h1>
        {videoUrl && dims && (
          <div className="flex gap-2">
            <button className={tab === "edit" ? btnCls : btnSecondaryCls} onClick={() => setTab("edit")}>Editor</button>
            <button className={tab === "thumbnail" ? btnCls : btnSecondaryCls} onClick={() => setTab("thumbnail")}>Thumbnail</button>
          </div>
        )}
      </div>

      <ErrorNote message={error} />

      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition hover:border-[#1B2A4A] hover:bg-gray-100">
        <input
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onVideoFile(e.target.files[0])}
        />
        <span className="text-sm font-semibold text-[#1B2A4A]">
          {video ? `✓ ${video.name} — klik untuk ganti` : "Upload video reel (MP4, 9:16)"}
        </span>
        <span className="text-xs text-gray-500">Disarankan ≤ 60 detik</span>
      </label>

      {(tooLong || tooBig) && (
        <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          {tooLong && "Video lebih dari 60 detik. "}
          {tooBig && "File lebih dari 100MB. "}
          Proses di browser bisa lambat atau kehabisan memori — tetap bisa dicoba.
        </p>
      )}

      {videoUrl && dims && tab === "thumbnail" && (
        <ThumbnailMaker
          videoUrl={videoUrl}
          width={dims.w}
          height={dims.h}
          duration={duration}
          fields={fields}
          caption={caption}
          captionPosition={captionPos}
          brandColors={brandColors}
        />
      )}

      {videoUrl && tab === "edit" && (
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Preview: video + live overlay */}
          <div className="shrink-0">
            {dims ? (
              <div
                style={{ width: PREVIEW_WIDTH, height: dims.h * scale }}
                className="relative overflow-hidden rounded-lg border border-gray-200 bg-black"
              >
                <video src={videoUrl} controls muted playsInline className="absolute inset-0 h-full w-full" onLoadedMetadata={onMetadata} />
                <div className="pointer-events-none absolute inset-0" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <BrandOverlay
                    width={dims.w}
                    height={dims.h}
                    fields={fields}
                    caption={caption}
                    captionPosition={captionPos}
                    brandColors={brandColors}
                  />
                </div>
              </div>
            ) : (
              <video src={videoUrl} muted playsInline className="w-[300px] rounded-lg" onLoadedMetadata={onMetadata} />
            )}
          </div>

          {/* Controls */}
          <div className="min-w-0 flex-1 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-[#1B2A4A]">Kontak di video</legend>
              <input className={inputCls} value={fields.website} onChange={(e) => updateField("website", e.target.value)} placeholder="Website" />
              <input className={inputCls} value={fields.facebook} onChange={(e) => updateField("facebook", e.target.value)} placeholder="Facebook" />
              <input className={inputCls} value={fields.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Nomor telepon" />
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-[#1B2A4A]">Caption</legend>
              <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Teks di video (opsional)" />
              <div className="flex gap-1.5">
                {CAPTION_POSITIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCaptionPos(p)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      captionPos === p ? "bg-[#1B2A4A] text-white" : "bg-white text-gray-500 ring-1 ring-gray-200"
                    }`}
                  >
                    {CAPTION_POSITION_LABELS[p]}
                  </button>
                ))}
              </div>
            </fieldset>

            {duration > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-[#1B2A4A]">
                  Potong: {trim.start.toFixed(1)}s – {trim.end.toFixed(1)}s
                </legend>
                <label className="block text-xs text-gray-500">
                  Mulai
                  <input type="range" min={0} max={duration} step={0.1} value={trim.start}
                    onChange={(e) => setTrim((t) => ({ ...t, start: Math.min(Number(e.target.value), t.end - 0.1) }))}
                    className="w-full" />
                </label>
                <label className="block text-xs text-gray-500">
                  Selesai
                  <input type="range" min={0} max={duration} step={0.1} value={trim.end}
                    onChange={(e) => setTrim((t) => ({ ...t, end: Math.max(Number(e.target.value), t.start + 0.1) }))}
                    className="w-full" />
                </label>
              </fieldset>
            )}

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-[#1B2A4A]">Musik (opsional)</legend>
              <input
                type="file"
                accept="audio/*"
                className="block w-full text-sm text-gray-600"
                onChange={(e) => setMusic(e.target.files?.[0] ?? null)}
              />
              {music && (
                <>
                  <div className="flex gap-3 text-sm text-gray-700">
                    <label className="flex items-center gap-1.5">
                      <input type="radio" checked={musicMode === "mix"} onChange={() => setMusicMode("mix")} />
                      Campur dengan audio asli
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" checked={musicMode === "replace"} onChange={() => setMusicMode("replace")} />
                      Ganti audio asli
                    </label>
                  </div>
                  {musicMode === "mix" && (
                    <label className="block text-xs text-gray-500">
                      Volume musik: {Math.round(musicVolume * 100)}%
                      <input type="range" min={0.05} max={1} step={0.05} value={musicVolume}
                        onChange={(e) => setMusicVolume(Number(e.target.value))} className="w-full" />
                    </label>
                  )}
                </>
              )}
            </fieldset>

            <div className="space-y-2">
              <button type="button" className={btnCls} disabled={!dims || progress !== null} onClick={exportVideo}>
                {progress !== null ? `Memproses… ${Math.round(progress * 100)}%` : "Export MP4"}
              </button>
              {progress !== null && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-[#F5C518] transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              )}
              <p className="text-xs text-gray-500">
                Proses berjalan di browser — pertama kali akan mengunduh mesin video (~31MB).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Offscreen full-size overlay node captured at export time. */}
      {dims && (
        <div style={{ position: "fixed", left: -100000, top: 0 }} aria-hidden>
          <div ref={exportNodeRef}>
            <BrandOverlay
              width={dims.w}
              height={dims.h}
              fields={fields}
              caption={caption}
              captionPosition={captionPos}
              brandColors={brandColors}
            />
          </div>
        </div>
      )}
    </div>
  );
}
