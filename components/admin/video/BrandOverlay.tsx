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

const ICON_PATHS = {
  globe:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  facebook:
    "M17 2v4h-2c-.69 0-1 .81-1 1.5V10h3l-.5 3H14v9h-3v-9H8v-3h3V6a4 4 0 0 1 4-4h2z",
  phone:
    "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
} as const;

/** Contact line: brand-yellow round icon chip + white text. */
function ContactChip({
  icon,
  text,
  s,
  brandColors,
}: {
  icon: keyof typeof ICON_PATHS;
  text: string;
  s: number;
  brandColors: BrandColors;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 10 * s }}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 42 * s,
          height: 42 * s,
          borderRadius: "50%",
          background: brandColors.yellow,
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" width={24 * s} height={24 * s} fill={brandColors.navy} aria-hidden>
          <path d={ICON_PATHS[icon]} />
        </svg>
      </span>
      <span>{text}</span>
    </span>
  );
}

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
          padding: `${100 * s}px ${36 * s}px ${30 * s}px`,
          background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${brandColors.navy}E6 70%)`,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: `${12 * s}px ${28 * s}px`,
          fontSize: 26 * s,
          fontWeight: 600,
        }}
      >
        <ContactChip icon="globe" text={fields.website} s={s} brandColors={brandColors} />
        <ContactChip icon="facebook" text={fields.facebook} s={s} brandColors={brandColors} />
        <ContactChip icon="phone" text={fields.phone} s={s} brandColors={brandColors} />
      </div>
    </div>
  );
}
