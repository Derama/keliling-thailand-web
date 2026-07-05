# Video Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin "Video Studio" tab: upload a short reel, trim / caption / add music / burn brand overlay in-browser via ffmpeg.wasm, and export a branded MP4 plus a branded thumbnail PNG — download-only, no database.

**Architecture:** The brand template (logo, website, Facebook, phone, caption) is a single React component (`BrandOverlay`) shown live over the `<video>` preview. On export it is captured as a transparent PNG at video resolution with the existing `captureNodePng` helper, then ffmpeg.wasm burns it with one `overlay` filter alongside trim and audio options. Thumbnail = chosen video frame drawn to canvas + same overlay, captured to PNG.

**Tech Stack:** Next.js 16 App Router client components, `@ffmpeg/ffmpeg` + `@ffmpeg/util` (single-thread core from CDN — no COOP/COEP headers needed), existing `html-to-image` wrapper `captureNodePng` from `lib/admin/pdfDownload.ts`.

**Testing note:** This repo has no test suite (per CLAUDE.md). Verification per task = `npm run lint`; final task runs `npm run build` and a manual dev-server checklist.

**Spec:** `docs/superpowers/specs/2026-07-05-video-studio-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `lib/admin/video/ffmpeg.ts` (create) | Lazy ffmpeg.wasm loader, export command build, progress/log plumbing |
| `components/admin/video/BrandOverlay.tsx` (create) | Brand template component + `BrandFields` types/defaults; used for live preview AND capture |
| `components/admin/video/ThumbnailMaker.tsx` (create) | Frame scrubber + branded thumbnail PNG export |
| `components/admin/views/marketing/VideoStudioView.tsx` (create) | Main view: upload, preview, edit controls, export |
| `app/admin/(panel)/page.tsx` (modify, TABS array ~line 35-50) | Register `video` tab after `instagram` |

---

### Task 1: Install dependencies

**Files:** Modify: `package.json` (via npm)

- [ ] **Step 1: Install ffmpeg packages**

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

Expected: both added to `dependencies`, no peer warnings that break install.

- [ ] **Step 2: Verify lint/build still clean**

Run: `npm run lint`
Expected: passes (no code changed yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add ffmpeg.wasm for admin video studio

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 2: ffmpeg helper (`lib/admin/video/ffmpeg.ts`)

**Files:** Create: `lib/admin/video/ffmpeg.ts`

- [ ] **Step 1: Write the file**

```ts
// In-browser video export via ffmpeg.wasm. Uses the single-threaded core from
// a CDN (no COOP/COEP headers required); ~31MB fetched once then cached.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

/** Lazy-load and cache the ffmpeg core. Reset on failure so retry works. */
export function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return Promise.resolve(instance);
  loading ??= (async () => {
    const ff = new FFmpeg();
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    instance = ff;
    return ff;
  })().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

export type MusicMode = "replace" | "mix";

export interface VideoExportInput {
  video: File;
  /** Transparent PNG data URL at the video's exact pixel dimensions. */
  overlayPng: string;
  /** Trim window in seconds. */
  trimStart: number;
  trimEnd: number;
  music: File | null;
  musicMode: MusicMode;
  /** Music loudness relative to original audio, 0..1 (mix mode only). */
  musicVolume: number;
  onProgress?: (ratio: number) => void;
}

/**
 * Burn the overlay and apply trim/audio, returning the MP4 blob. On ffmpeg
 * failure the thrown Error message includes the log tail for diagnosis.
 */
export async function exportBrandedVideo(input: VideoExportInput): Promise<Blob> {
  const ff = await getFFmpeg();
  const logs: string[] = [];
  const onLog = ({ message }: { message: string }) => {
    logs.push(message);
    if (logs.length > 40) logs.shift();
  };
  const onProgress = ({ progress }: { progress: number }) => {
    input.onProgress?.(Math.max(0, Math.min(1, progress)));
  };
  ff.on("log", onLog);
  ff.on("progress", onProgress);

  const musicExt = input.music?.name.split(".").pop() || "mp3";
  const musicName = input.music ? `music.${musicExt}` : null;

  try {
    await ff.writeFile("input.mp4", await fetchFile(input.video));
    await ff.writeFile("overlay.png", await fetchFile(input.overlayPng));
    if (input.music && musicName) {
      await ff.writeFile(musicName, await fetchFile(input.music));
    }

    const duration = Math.max(0.1, input.trimEnd - input.trimStart);
    let filter = "[0:v][1:v]overlay=0:0[v]";
    const args = [
      "-ss", String(input.trimStart),
      "-t", String(duration),
      "-i", "input.mp4",
      "-i", "overlay.png",
    ];
    if (musicName) args.push("-i", musicName);

    const maps = ["-map", "[v]"];
    if (musicName && input.musicMode === "replace") {
      maps.push("-map", "2:a");
    } else if (musicName) {
      filter += `;[0:a][2:a]amix=inputs=2:duration=first:weights=1 ${input.musicVolume.toFixed(2)}[a]`;
      maps.push("-map", "[a]");
    } else {
      maps.push("-map", "0:a?");
    }

    args.push(
      "-filter_complex", filter,
      ...maps,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-shortest",
      "-movflags", "+faststart",
      "out.mp4"
    );

    const code = await ff.exec(args);
    if (code !== 0) {
      throw new Error(`ffmpeg gagal (kode ${code}):\n${logs.slice(-12).join("\n")}`);
    }
    const data = await ff.readFile("out.mp4");
    return new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
  } finally {
    ff.off("log", onLog);
    ff.off("progress", onProgress);
    for (const f of ["input.mp4", "overlay.png", musicName, "out.mp4"]) {
      if (f) await ff.deleteFile(f).catch(() => {});
    }
  }
}
```

Implementation notes for the engineer:
- `-ss` before `-i` = fast input seeking; timestamps reset, so `-t <duration>` (not `-to`) is correct.
- `amix` `weights=1 <vol>` keeps original at weight 1, music at the slider value.
- `-map 0:a?` — trailing `?` makes source audio optional (silent videos still export).
- Mix mode with a silent source video will fail in ffmpeg; the error path surfaces the log tail and the user can switch to "replace".

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add lib/admin/video/ffmpeg.ts
git commit -m "feat(admin): add ffmpeg.wasm export helper for video studio

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 3: Brand overlay template (`components/admin/video/BrandOverlay.tsx`)

**Files:** Create: `components/admin/video/BrandOverlay.tsx`

The same node is used for the live preview over the `<video>` and for `captureNodePng` at export. All px values scale from a 1080-wide design via `s = width / 1080`, so the component works at any video resolution without CSS transforms (which can confuse capture).

- [ ] **Step 1: Write the file**

```tsx
"use client";

import type { BrandColors } from "@/lib/admin/settings";

export interface BrandFields {
  website: string;
  facebook: string;
  phone: string;
}

export const DEFAULT_BRAND_FIELDS: BrandFields = {
  website: "kelilingthailand.com",
  facebook: "Keliling Thailand",
  phone: "+62 857-5092-3934",
};

export type CaptionPosition = "top" | "middle" | "bottom";

export const CAPTION_POSITIONS: readonly CaptionPosition[] = ["top", "middle", "bottom"];

export const CAPTION_POSITION_LABELS: Record<CaptionPosition, string> = {
  top: "Atas",
  middle: "Tengah",
  bottom: "Bawah",
};

/**
 * Brand watermark template rendered over the video: logo chip top-left,
 * optional caption, contact band along the bottom. Background is transparent
 * so the captured PNG works as an ffmpeg overlay.
 */
export default function BrandOverlay({
  width,
  height,
  fields,
  caption,
  captionPosition,
  brandColors,
}: {
  width: number;
  height: number;
  fields: BrandFields;
  caption: string;
  captionPosition: CaptionPosition;
  brandColors: BrandColors;
}) {
  const s = width / 1080;
  const captionTop =
    captionPosition === "top"
      ? height * 0.14
      : captionPosition === "middle"
        ? height * 0.45
        : height * 0.66;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        background: "transparent",
        color: "#fff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 36 * s,
          left: 36 * s,
          display: "flex",
          alignItems: "center",
          gap: 14 * s,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo.png"
          alt=""
          crossOrigin="anonymous"
          style={{ height: 72 * s, width: "auto", objectFit: "contain" }}
        />
        <span
          style={{
            fontSize: 34 * s,
            fontWeight: 700,
            textShadow: "0 2px 8px rgba(0,0,0,.6)",
            lineHeight: 1.1,
          }}
        >
          Keliling Thailand
        </span>
      </div>

      {caption && (
        <div
          style={{
            position: "absolute",
            top: captionTop,
            left: 48 * s,
            right: 48 * s,
            textAlign: "center",
            fontSize: 52 * s,
            fontWeight: 800,
            lineHeight: 1.25,
            textShadow: "0 3px 14px rgba(0,0,0,.75)",
          }}
        >
          {caption}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: `${90 * s}px ${36 * s}px ${30 * s}px`,
          background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.65) 70%)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: `${8 * s}px ${28 * s}px`,
          fontSize: 26 * s,
          fontWeight: 600,
        }}
      >
        <span>🌐 {fields.website}</span>
        <span>📘 {fields.facebook}</span>
        <span style={{ color: brandColors.yellow }}>📞 {fields.phone}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/admin/video/BrandOverlay.tsx
git commit -m "feat(admin): add video brand overlay template

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 4: Thumbnail maker (`components/admin/video/ThumbnailMaker.tsx`)

**Files:** Create: `components/admin/video/ThumbnailMaker.tsx`

Scrub a hidden `<video>` to a chosen time, draw the frame to a canvas, show it under `BrandOverlay` in a scaled preview, export full-res PNG via `captureNodePng`.

- [ ] **Step 1: Write the file**

```tsx
"use client";

import { useRef, useState } from "react";
import { btnCls, ErrorNote } from "@/components/admin/ui";
import { captureNodePng } from "@/lib/admin/pdfDownload";
import { errMsg } from "@/components/admin/instagram/util";
import type { BrandColors } from "@/lib/admin/settings";
import BrandOverlay, {
  type BrandFields,
  type CaptionPosition,
} from "@/components/admin/video/BrandOverlay";

const PREVIEW_WIDTH = 270;

/** Frame picker + branded thumbnail PNG export for the video studio. */
export default function ThumbnailMaker({
  videoUrl,
  width,
  height,
  duration,
  fields,
  caption,
  captionPosition,
  brandColors,
}: {
  videoUrl: string;
  width: number;
  height: number;
  duration: number;
  fields: BrandFields;
  caption: string;
  captionPosition: CaptionPosition;
  brandColors: BrandColors;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickFrame(t: number) {
    setTime(t);
    const v = videoRef.current;
    if (!v) return;
    setError(null);
    try {
      v.currentTime = t;
      await new Promise<void>((res, rej) => {
        v.addEventListener("seeked", () => res(), { once: true });
        v.addEventListener("error", () => rej(new Error("Gagal memuat frame video")), { once: true });
      });
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(v, 0, 0, width, height);
      setFrameUrl(canvas.toDataURL("image/png"));
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function downloadThumbnail() {
    if (!nodeRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await captureNodePng(nodeRef.current, {
        width,
        height,
        pixelRatio: 1,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "thumbnail.png";
      a.click();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const scale = PREVIEW_WIDTH / width;

  return (
    <div className="space-y-3">
      {/* Hidden decode video used only for frame grabs. */}
      <video ref={videoRef} src={videoUrl} muted playsInline preload="auto" style={{ display: "none" }} />

      <ErrorNote message={error} />

      <label className="block text-sm font-medium text-gray-700">
        Pilih frame ({time.toFixed(1)}s)
        <input
          type="range"
          min={0}
          max={Math.max(0.1, duration)}
          step={0.1}
          value={time}
          onChange={(e) => pickFrame(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>

      {frameUrl ? (
        <div style={{ width: PREVIEW_WIDTH, height: height * scale }} className="overflow-hidden rounded-lg border border-gray-200">
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width, height }}>
            <div ref={nodeRef} style={{ position: "relative", width, height }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frameUrl} alt="" style={{ position: "absolute", inset: 0, width, height, objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0 }}>
                <BrandOverlay
                  width={width}
                  height={height}
                  fields={fields}
                  caption={caption}
                  captionPosition={captionPosition}
                  brandColors={brandColors}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Geser slider untuk memilih frame thumbnail.</p>
      )}

      <button type="button" className={btnCls} disabled={!frameUrl || busy} onClick={downloadThumbnail}>
        {busy ? "Menyimpan…" : "Download Thumbnail PNG"}
      </button>
    </div>
  );
}
```

Note: the capture ref (`nodeRef`) points at the FULL-SIZE node inside the scaled wrapper — same pattern as `ScaledFrame` in `components/admin/instagram/util.tsx`, so the export is full resolution regardless of the shrunk preview.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/admin/video/ThumbnailMaker.tsx
git commit -m "feat(admin): add branded thumbnail maker

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 5: Main view (`components/admin/views/marketing/VideoStudioView.tsx`)

**Files:** Create: `components/admin/views/marketing/VideoStudioView.tsx`

- [ ] **Step 1: Write the file**

```tsx
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
```

Implementation notes:
- `onLoadedMetadata` fires on the fallback `<video>` first (no `dims` yet), then the component re-renders into the overlay layout.
- The preview overlay uses `transform: scale()` for display only; the export capture targets the untransformed offscreen node (per PDF capture scale memory — transforms must never leak into captured output).
- `ErrorNote`, `btnCls`, `btnSecondaryCls`, `inputCls` come from `components/admin/ui.tsx`.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/admin/views/marketing/VideoStudioView.tsx
git commit -m "feat(admin): add video studio view

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 6: Register the tab

**Files:** Modify: `app/admin/(panel)/page.tsx` (imports ~line 18, `TABS` array ~line 49)

- [ ] **Step 1: Add import**

After the `InstagramStudioView` import:

```tsx
import VideoStudioView from "@/components/admin/views/marketing/VideoStudioView";
```

- [ ] **Step 2: Add tab entry**

In `TABS`, directly after the `instagram` entry:

```tsx
  { id: "video", label: "Video Studio", View: VideoStudioView },
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(panel)/page.tsx"
git commit -m "feat(admin): register video studio tab

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 7: Build + manual verification

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 2: Manual checklist on dev server**

Run: `npm run dev`, open `http://localhost:3000/admin`, log in, open "Video Studio" tab. Verify:

1. Upload short MP4 → preview shows video with logo/contact overlay on top.
2. Edit website/facebook/phone → overlay updates live; reload page → values persist (localStorage).
3. Type caption, switch Atas/Tengah/Bawah → position moves.
4. Move trim sliders → values clamp (start < end).
5. Add audio file → mode radios appear; mix shows volume slider.
6. Export MP4 → progress bar runs, file downloads, plays with overlay burned in, trim + audio applied.
7. Thumbnail tab → scrub frame, preview shows frame + overlay, PNG downloads at full video resolution.
8. Upload >60s video → yellow warning shows but export still allowed.

- [ ] **Step 3: Fix anything found, commit fixes**

```bash
git add -A
git commit -m "fix(admin): video studio polish after manual verification

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

(Skip if nothing to fix.)
