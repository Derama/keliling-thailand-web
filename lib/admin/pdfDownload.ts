import { toJpeg } from "html-to-image";
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
  filename: string
): Promise<void> {
  if (sheets.length === 0) {
    throw new Error("Dokumen kosong — tidak ada halaman untuk diunduh.");
  }
  const pdf = await PDFDocument.create();
  for (const el of sheets) {
    const w = el.offsetWidth;
    // One physical page per sheet: never capture past the A4 aspect ratio.
    const h = Math.min(el.offsetHeight, Math.round((w * A4_H) / A4_W));
    const dataUrl = await toJpeg(el, {
      pixelRatio: 2,
      quality: 0.93,
      backgroundColor: "#ffffff",
      width: w,
      height: h,
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
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
