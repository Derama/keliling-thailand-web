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
  // Monotonic token so rapid scrubbing only draws the latest requested frame.
  const seekToken = useRef(0);

  async function pickFrame(t: number) {
    setTime(t);
    const v = videoRef.current;
    if (!v) return;
    setError(null);
    const token = ++seekToken.current;
    try {
      v.currentTime = t;
      await new Promise<void>((res, rej) => {
        const onSeeked = () => {
          cleanup();
          res();
        };
        const onError = () => {
          cleanup();
          rej(new Error("Gagal memuat frame video"));
        };
        const cleanup = () => {
          v.removeEventListener("seeked", onSeeked);
          v.removeEventListener("error", onError);
        };
        v.addEventListener("seeked", onSeeked);
        v.addEventListener("error", onError);
      });
      if (token !== seekToken.current) return; // stale seek — newer scrub in flight
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
