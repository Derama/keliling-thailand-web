"use client";

import type { BrandColors } from "@/lib/admin/settings";

export interface BrandFields {
  website: string;
  instagram: string;
  facebook: string;
  phone: string;
}

export const DEFAULT_BRAND_FIELDS: BrandFields = {
  website: "kelilingthailand.com",
  instagram: "@kelilingthailand",
  facebook: "Keliling Thailand",
  phone: "+62 857-5092-3934",
};

/** Word-by-word caption type-in timing, shared by CSS preview and ffmpeg burn. */
export const CAPTION_STEP_SECONDS = 0.28;
export const MAX_CAPTION_STEPS = 8;

export function captionWords(caption: string): string[] {
  return caption.split(/\s+/).filter(Boolean);
}

/** Cumulative visible-word counts per animation step (≤ MAX_CAPTION_STEPS). */
export function captionStepCounts(caption: string): number[] {
  const n = captionWords(caption).length;
  const steps = Math.min(n, MAX_CAPTION_STEPS);
  return Array.from({ length: steps }, (_, k) => Math.ceil(((k + 1) * n) / steps));
}

export type CaptionPosition = "top" | "middle" | "bottom";

const ICON_PATHS = {
  globe:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  facebook:
    "M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z",
  instagram:
    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  phone:
    "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
} as const;

/** Official brand chip colors; other icons use the brand-yellow chip. */
const CHIP_STYLES: Partial<Record<keyof typeof ICON_PATHS, { background: string; glyph: string }>> = {
  instagram: {
    background:
      "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
    glyph: "#fff",
  },
  facebook: { background: "#1877F2", glyph: "#fff" },
};

/** Contact line: round icon chip + white text. */
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
  const chip = CHIP_STYLES[icon] ?? { background: brandColors.yellow, glyph: brandColors.navy };
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 7 * s, whiteSpace: "nowrap" }}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32 * s,
          height: 32 * s,
          borderRadius: "50%",
          background: chip.background,
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" width={19 * s} height={19 * s} fill={chip.glyph} aria-hidden>
          <path d={ICON_PATHS[icon]} />
        </svg>
      </span>
      {/* lineHeight 1 so the text box centers exactly against the chip. */}
      <span style={{ lineHeight: 1 }}>{text}</span>
    </span>
  );
}

export const CAPTION_POSITIONS: readonly CaptionPosition[] = ["top", "middle", "bottom"];

export const CAPTION_POSITION_LABELS: Record<CaptionPosition, string> = {
  top: "Atas",
  middle: "Tengah",
  bottom: "Bawah",
};

/** Which parts to render — export burns brand and caption as separate
 * ffmpeg inputs so the caption can animate in. */
export type OverlayLayer = "full" | "brand" | "caption";

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
  layer = "full",
  animateCaption = false,
  visibleWords,
}: {
  width: number;
  height: number;
  fields: BrandFields;
  caption: string;
  captionPosition: CaptionPosition;
  brandColors: BrandColors;
  layer?: OverlayLayer;
  animateCaption?: boolean;
  /** Export stepping: words at index ≥ this are rendered invisible (layout kept). */
  visibleWords?: number;
}) {
  const s = width / 1080;
  const words = captionWords(caption);
  const steps = Math.min(words.length, MAX_CAPTION_STEPS);
  // Keep all four contacts on one uncropped line: budget the 1080 design
  // width (padding + band gaps + icon chips) and shrink the font for long
  // text. 0.58em/char over-estimates so wider system fonts (iOS SF Pro)
  // still fit.
  const contactChars = [fields.website, fields.instagram, fields.facebook, fields.phone].join("").length;
  const contactFont = Math.min(24, (1080 - 2 * 16 - 3 * 12 - 4 * (32 + 7)) / Math.max(1, contactChars * 0.58));
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
      {layer !== "caption" && (
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
        {/* Same brand mark as the site navbar: navy car in a yellow circle. */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 84 * s,
            height: 84 * s,
            borderRadius: "50%",
            background: brandColors.yellow,
            boxShadow: "0 0 0 2px rgba(255,255,255,.28)",
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Logo.png"
            alt=""
            crossOrigin="anonymous"
            style={{ height: 48 * s, width: "auto", objectFit: "contain" }}
          />
        </span>
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
      )}

      {layer !== "brand" && caption && (
        <div
          key={`${caption}-${captionPosition}`}
          style={{
            position: "absolute",
            top: captionTop,
            left: 48 * s,
            right: 48 * s,
            textAlign: "center",
            fontSize: 52 * s,
            fontWeight: 800,
            lineHeight: 1.25,
            color: brandColors.yellow,
            textShadow: "0 3px 14px rgba(0,0,0,.75)",
          }}
        >
          {/* Each word pops in on its own step, Instagram Reels caption style. */}
          {words.map((word, i) => {
            const step = Math.floor((i * steps) / words.length);
            return (
              <span
                key={`${word}-${i}`}
                style={{
                  display: "inline-block",
                  marginRight: i < words.length - 1 ? "0.28em" : 0,
                  opacity: visibleWords !== undefined && i >= visibleWords ? 0 : undefined,
                  animation: animateCaption
                    ? `video-caption-word-in .4s cubic-bezier(.34,1.56,.64,1) ${(step * CAPTION_STEP_SECONDS).toFixed(2)}s both`
                    : undefined,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      )}

      {layer !== "caption" && (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: `${100 * s}px ${16 * s}px ${30 * s}px`,
          background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${brandColors.navy}E6 70%)`,
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 12 * s,
          fontSize: contactFont * s,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        <ContactChip icon="globe" text={fields.website} s={s} brandColors={brandColors} />
        <ContactChip icon="instagram" text={fields.instagram} s={s} brandColors={brandColors} />
        <ContactChip icon="facebook" text={fields.facebook} s={s} brandColors={brandColors} />
        <ContactChip icon="phone" text={fields.phone} s={s} brandColors={brandColors} />
      </div>
      )}
    </div>
  );
}
