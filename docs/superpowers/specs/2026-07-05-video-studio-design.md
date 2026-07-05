# Video Studio — Design

Date: 2026-07-05

## Purpose

New admin tab "Video Studio" next to Instagram Studio. The owner uploads a short
vertical reel (Instagram/TikTok, ≤~60s), edits it in the browser, and downloads:

1. An MP4 with the company brand template burned into the video (logo, keliling
   thailand website, Facebook, phone number, plus optional captions).
2. A branded thumbnail PNG made from a chosen video frame.

Everything runs client-side. No database rows, no Supabase storage — output is
download-only.

## Editing capabilities

- **Brand overlay** — logo (`/Logo.png`), website, Facebook, phone number
  rendered as a watermark template over the video. Text fields editable in the
  UI; defaults persisted in `localStorage`. Brand colors come from the existing
  `loadBrandColors()` in `lib/admin/settings`.
- **Trim** — start/end sliders on a timeline; cuts video length.
- **Text captions** — custom text (title/promo line) with a position picker;
  rendered as part of the same overlay template.
- **Music/audio** — upload an audio file; either replace the original audio or
  mix with it (volume slider).

## Thumbnail maker

- Scrub the video, pick a frame.
- Frame drawn to a canvas, brand template overlaid on top.
- Export PNG via `html-to-image` (same capture pipeline as Instagram Studio
  templates).

## Processing approach: ffmpeg.wasm

`@ffmpeg/ffmpeg` + `@ffmpeg/util` run ffmpeg in the browser (lazy-loaded on
first export; ~31MB core, cached afterwards).

Key trick: the entire brand template — logo, contact lines, captions — is one
React component (`BrandOverlay`). For live preview it sits absolutely
positioned over the `<video>` element. For export, `html-to-image` captures it
as a transparent PNG at video resolution, and a single ffmpeg `overlay` filter
burns it in. Preview and burned result are pixel-identical, and there is no
ffmpeg `drawtext`/font handling.

Export command combines: `-ss`/`-to` (trim), `overlay` (template PNG), and
audio graph (`amix` or replace) when music is added. A progress bar reads
ffmpeg progress events during encode.

Rejected alternatives: WebCodecs + muxer (faster encode but heavy custom
audio/trim code, browser quirks); MediaRecorder canvas capture (WebM only,
realtime-only, quality loss).

## Components and files

- `components/admin/views/marketing/VideoStudioView.tsx` — main view: upload,
  player + live overlay, edit controls, thumbnail tab, export.
- `components/admin/video/BrandOverlay.tsx` — brand template component; used
  for both live preview and `html-to-image` capture.
- `components/admin/video/ThumbnailMaker.tsx` — frame picker + branded
  thumbnail export.
- `lib/admin/video/ffmpeg.ts` — lazy ffmpeg load, filter command construction,
  export functions, progress reporting.
- Tab registration in `app/admin/(panel)/page.tsx`:
  `{ id: "video", label: "Video Studio", View: VideoStudioView }` after the
  Instagram Studio entry.
- New dependencies: `@ffmpeg/ffmpeg`, `@ffmpeg/util`.

## Error handling

- ffmpeg core fails to load → error note with retry button.
- Encode failure → surface the tail of the ffmpeg log.
- Soft warning when the source video exceeds ~60s or ~100MB (memory limits of
  in-browser processing); the user may proceed anyway.

## Testing

No test suite in this repo. Verify with `npm run lint && npm run build` and a
manual run on the dev server (upload sample reel, trim, caption, music, export
MP4 + thumbnail).
