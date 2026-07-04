import { toJpeg, toPng } from "html-to-image";
import { PDFDocument } from "pdf-lib";

// A4 in PDF points.
const A4_W = 595.28;
const A4_H = 841.89;

/**
 * True on touch-first devices (phones/tablets), where `window.print()` is the
 * wrong download path: mobile print engines re-lay the document out with their
 * own page metrics, so the "saved PDF" rarely matches the on-screen preview
 * (cut-off sheets, wrong scale, stray blank pages). On those devices the
 * builders rasterize their pre-paginated A4 sheets into a real PDF instead.
 */
export function isCoarsePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

/**
 * WebKit (all iOS browsers + desktop Safari) has a long-standing bug where
 * images inside the SVG `<foreignObject>` html-to-image rasterizes through are
 * not yet decoded on the first draw — logos and photos come out blank in the
 * captured JPEG/PNG even though the on-screen preview is fine.
 */
function isWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iP(hone|od|ad)/.test(ua) ||
    (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  const safari = /Safari/i.test(ua) && !/Chrom|Edg|OPR|SamsungBrowser/i.test(ua);
  return iOS || safari;
}

/** Wait until every <img> under `el` is loaded AND decoded. */
async function waitForImages(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img
        .decode()
        .catch(() => new Promise<void>((r) => {
          if (img.complete) return r();
          img.onload = () => r();
          img.onerror = () => r();
        }))
    )
  );
}

type CaptureOptions = Parameters<typeof toJpeg>[1];

/**
 * Capture `el` with html-to-image, working around the WebKit foreignObject
 * decode race: warm-up passes let Safari decode the embedded images so the
 * final pass paints them. Chrome/Firefox skip the warm-ups.
 */
async function captureWithWarmup(
  fn: typeof toJpeg | typeof toPng,
  el: HTMLElement,
  options: CaptureOptions
): Promise<string> {
  await waitForImages(el);
  if (isWebKit()) {
    // Two throwaway renders — the known workaround for WebKit blank images.
    await fn(el, options);
    await fn(el, options);
  }
  return fn(el, options);
}

/**
 * Capture a node as a PNG data URL (Instagram studio exports). Same WebKit
 * warm-up + CORS-safe fetch behavior as the PDF sheet capture.
 */
export async function captureNodePng(
  el: HTMLElement,
  options: CaptureOptions = {}
): Promise<string> {
  return captureWithWarmup(toPng, el, {
    fetchRequestInit: { cache: "no-cache" },
    ...options,
  });
}

/**
 * Render each pre-paginated A4 sheet element to an image and assemble a real
 * PDF, downloaded directly — no print dialog involved. The capture clones each
 * sheet at its natural (untransformed) size, so the phone preview's
 * `transform: scale()` shrink never leaks into the output.
 *
 * Sheets taller than A4 ratio are cropped to one page, matching what the print
 * CSS does (fixed 296/297mm sheets with `overflow: hidden`).
 */
export async function downloadSheetsAsPdf(
  sheets: HTMLElement[],
  filename: string,
  /** Called before each sheet renders: (pageBeingRendered, totalPages). */
  onProgress?: (page: number, total: number) => void
): Promise<void> {
  if (sheets.length === 0) {
    throw new Error("Dokumen kosong — tidak ada halaman untuk diunduh.");
  }
  const pdf = await PDFDocument.create();
  for (const [i, el] of sheets.entries()) {
    onProgress?.(i + 1, sheets.length);
    // Let React paint the progress label before the capture blocks the thread.
    await new Promise((r) => setTimeout(r, 0));
    const w = el.offsetWidth;
    // One physical page per sheet: never capture past the A4 aspect ratio.
    const h = Math.min(el.offsetHeight, Math.round((w * A4_H) / A4_W));
    const dataUrl = await captureWithWarmup(toJpeg, el, {
      pixelRatio: 2,
      quality: 0.93,
      backgroundColor: "#ffffff",
      width: w,
      height: h,
      // Remote photos (Supabase storage, Unsplash…) were often first loaded by a
      // plain <img>, so the browser cached them WITHOUT CORS headers. The capture
      // re-fetches every image in CORS mode; served from that cache the fetch
      // fails silently and the photo comes out blank. `no-cache` forces a
      // revalidation with the server, which responds with proper CORS headers.
      fetchRequestInit: { cache: "no-cache" },
      style: {
        transform: "none",
        margin: "0",
        boxShadow: "none",
        borderRadius: "0",
      },
    });
    const jpg = await pdf.embedJpg(dataUrl);
    const page = pdf.addPage([A4_W, A4_H]);
    const scale = A4_W / w;
    const dw = w * scale;
    const dh = h * scale;
    // Top-aligned, centered horizontally — short sheets leave paper-white
    // space at the bottom, exactly like the print path.
    page.drawImage(jpg, {
      x: (A4_W - dw) / 2,
      y: A4_H - dh,
      width: dw,
      height: dh,
    });
  }
  const bytes = await pdf.save();
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Strip characters that break the download name on some platforms.
  const safe = filename.replace(/[\\/:*?"<>|]+/g, "-").trim() || "dokumen";
  a.download = safe.endsWith(".pdf") ? safe : `${safe}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
