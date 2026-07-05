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
