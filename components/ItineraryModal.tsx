"use client";

import { useEffect } from "react";
import CityItineraryDetail from "@/components/CityItineraryDetail";

interface ItineraryModalProps {
  cityId: string | null;
  onClose: () => void;
}

export default function ItineraryModal({ cityId, onClose }: ItineraryModalProps) {
  const open = cityId !== null;

  // Close on Escape + lock body scroll while open. (DOM side effects only.)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!cityId) return null;

  return (
    <div
      className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="modal-card relative z-10 w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border-2 border-[#050505] bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#050505] bg-white text-lg font-bold text-[#050505] transition active:scale-95 hover:bg-[#FAE7B8]"
        >
          ✕
        </button>
        <CityItineraryDetail cityId={cityId} />
      </div>
    </div>
  );
}
