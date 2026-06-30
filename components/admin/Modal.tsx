"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Centered modal dialog. On phones it docks to the bottom as a sheet.
 * Closes on backdrop click and Escape; locks body scroll while open.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  expanded = false,
  printIsolate = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Near-fullscreen panel for large editors (builders). */
  wide?: boolean;
  /** Large centered panel with a visible margin around dense workspaces. */
  expanded?: boolean;
  /** Strip modal chrome and hide the rest of the page when printing. */
  printIsolate?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Modals only open on client interaction (open=false during SSR), so this is
  // null on the server and never causes a hydration mismatch.
  if (!open || typeof document === "undefined") return null;

  // Render at <body> so the backdrop is a direct body child. That lets the
  // print path hide every *other* body child with display:none (removing their
  // layout entirely) — visibility:hidden alone leaves their layout in the print
  // flow and emits stray blank pages.
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/40 ${
        expanded ? "items-center p-4" : "items-end sm:items-center sm:p-4"
      } ${
        printIsolate ? "builder-modal-backdrop" : ""
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`flex flex-col overflow-hidden bg-white shadow-xl ${
          expanded
            ? "h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1600px] rounded-2xl"
            : `max-h-[90vh] w-full rounded-t-2xl sm:rounded-2xl ${
                wide
                  ? "max-w-6xl h-[90vh] sm:h-[92vh] sm:max-h-[92vh]"
                  : "max-w-3xl"
              }`
        } ${printIsolate ? "builder-modal" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between border-b border-gray-200 px-5 py-4 ${
            printIsolate ? "builder-modal-header" : ""
          }`}
        >
          <h2 className="text-lg font-bold text-[#1B2A4A]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
