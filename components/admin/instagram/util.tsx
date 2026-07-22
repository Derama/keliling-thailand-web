"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { FORMAT_SIZES, type PostFormat } from "@/lib/admin/instagram";

/** Pull a readable message out of Error | Supabase error | anything. */
export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return typeof e === "string" ? e : JSON.stringify(e);
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("Gagal membaca file"));
    r.readAsDataURL(file);
  });
}

/** Dashed-border photo upload target used by all editor panels. */
export function PhotoDrop({
  hasPhoto,
  uploading,
  emptyLabel,
  onFile,
}: {
  hasPhoto: boolean;
  uploading: boolean;
  emptyLabel: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition hover:border-[#1B2A4A] hover:bg-gray-100">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <span className="text-sm font-semibold text-[#1B2A4A]">
        {uploading
          ? "Mengunggah…"
          : hasPhoto
            ? "✓ Foto terpilih — klik untuk ganti"
            : emptyLabel}
      </span>
      <span className="text-xs text-gray-500">JPG atau PNG</span>
    </label>
  );
}

/**
 * Renders children at full 1080px export size inside a scaled wrapper.
 * The forwarded ref points at the FULL-SIZE node so export captures 1080px.
 * Measures its container so it never overflows on narrow screens.
 */
export const ScaledFrame = forwardRef<
  HTMLDivElement,
  { format: PostFormat; maxWidth?: number; children: React.ReactNode }
>(function ScaledFrame({ format, maxWidth = 360, children }, ref) {
  const { w, h } = FORMAT_SIZES[format];
  const outerRef = useRef<HTMLDivElement>(null);
  const [renderWidth, setRenderWidth] = useState(maxWidth);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setRenderWidth(Math.min(maxWidth, el.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxWidth]);

  const scale = renderWidth / w;
  return (
    <div ref={outerRef} style={{ width: "100%", maxWidth: maxWidth, height: h * scale, overflow: "hidden" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: w, height: h }}>
        <div ref={ref}>{children}</div>
      </div>
    </div>
  );
});
