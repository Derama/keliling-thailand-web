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
import Modal from "@/components/admin/Modal";
import { exportBrandedVideo, type MusicMode } from "@/lib/admin/video/ffmpeg";

const FIELDS_KEY = "video-brand-fields";
const PREVIEW_WIDTH = 400;
const MAX_SECONDS = 61;
const MAX_BYTES = 100 * 1024 * 1024;

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
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exportNodeRef = useRef<HTMLDivElement>(null);

  // Revoke object URLs when replaced or on unmount.
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);
  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  // Brand colors from settings; contact fields from localStorage.
  useEffect(() => {
    loadBrandColors().then(setBrandColors);
    try {
      const saved = localStorage.getItem(FIELDS_KEY);
      if (saved) setFields({ ...DEFAULT_BRAND_FIELDS, ...JSON.parse(saved) });
    } catch {
      /* corrupt storage — keep defaults */
    }
  }, []);

  function updateField(key: keyof BrandFields, value: string) {
    const next = { ...fields, [key]: value };
    setFields(next);
    try {
      localStorage.setItem(FIELDS_KEY, JSON.stringify(next));
    } catch {
      /* quota/private mode — keep in-memory value only */
    }
  }

  function onVideoFile(file: File) {
    setError(null);
    setVideo(file);
    setVideoUrl(URL.createObjectURL(file));
    setDims(null);
    setDuration(0);
    setTrim({ start: 0, end: 0 });
    setTab("edit");
  }

  // Keep the looping preview inside the trim window so cuts are visible live.
  function onTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (trim.end <= 0) return;
    const v = e.currentTarget;
    if (v.currentTime < trim.start - 0.05 || v.currentTime > trim.end + 0.05) {
      v.currentTime = trim.start;
    }
  }

  function onMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    // Some sources report Infinity until fully buffered — treat as unknown.
    const d = Number.isFinite(v.duration) ? v.duration : 0;
    setDims({ w: v.videoWidth, h: v.videoHeight });
    setDuration(d);
    setTrim({ start: 0, end: d });
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
      setResult({
        url: URL.createObjectURL(blob),
        name: video.name.replace(/\.[^.]+$/, "") + "-branded.mp4",
      });
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

      {tab === "edit" && (
        // DOM order = preview, controls; row-reverse puts controls left and the
        // big preview pane right on desktop (Instagram Studio layout), while
        // mobile keeps the preview on top.
        <div className="flex flex-col gap-6 md:flex-row-reverse">
          {/* Preview pane: video + live overlay, sticky beside the controls */}
          <div className="flex min-w-0 flex-1 items-start justify-center rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6 md:sticky md:top-20 md:self-start">
            {videoUrl && dims ? (
              <div
                style={{ width: PREVIEW_WIDTH, height: dims.h * scale, maxWidth: "100%" }}
                className="relative overflow-hidden rounded-lg bg-black shadow-lg"
              >
                {/* autoPlay: WebKit leaves non-playing videos blank, so loop a muted preview. */}
                <video
                  src={videoUrl}
                  controls
                  muted
                  playsInline
                  autoPlay
                  loop
                  preload="auto"
                  className="absolute inset-0 h-full w-full"
                  onLoadedMetadata={onMetadata}
                  onTimeUpdate={onTimeUpdate}
                />
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
            ) : videoUrl ? (
              <video src={videoUrl} muted playsInline autoPlay loop preload="auto" className="w-[300px] rounded-lg" onLoadedMetadata={onMetadata} />
            ) : (
              // No video yet: show the brand template on a 9:16 placeholder so
              // the pane is alive before upload, like Instagram Studio.
              <div
                style={{ width: PREVIEW_WIDTH, height: (PREVIEW_WIDTH * 16) / 9, maxWidth: "100%" }}
                className="relative overflow-hidden rounded-lg bg-[#1B2A4A] shadow-lg"
              >
                <div className="pointer-events-none absolute inset-0" style={{ transform: `scale(${PREVIEW_WIDTH / 1080})`, transformOrigin: "top left" }}>
                  <BrandOverlay
                    width={1080}
                    height={1920}
                    fields={fields}
                    caption={caption}
                    captionPosition={captionPos}
                    brandColors={brandColors}
                  />
                </div>
                <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-sm text-white/60">
                  Upload video untuk melihat pratinjau
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="min-w-0 space-y-4 md:w-[360px] md:shrink-0">
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

      <Modal open={!!result} onClose={() => setResult(null)} title="Pratinjau video">
        {result && (
          <div className="space-y-4">
            <video
              src={result.url}
              controls
              playsInline
              className="mx-auto max-h-[60vh] w-auto rounded-lg bg-black"
            />
            <a href={result.url} download={result.name} className={btnCls}>
              Download MP4
            </a>
          </div>
        )}
      </Modal>

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
