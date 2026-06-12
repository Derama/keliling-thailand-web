"use client";

import { useEffect, useState } from "react";

/** Shows live THB->IDR rate with one-tap fill. Silent when API is down. */
export default function FxRateHint({
  onApply,
}: {
  onApply: (rate: number) => void;
}) {
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/fx")
      .then((r) => (r.ok ? r.json() : { rate: null }))
      .then((d) => setRate(typeof d.rate === "number" ? d.rate : null))
      .catch(() => setRate(null));
  }, []);

  if (rate === null) return null;

  return (
    <button
      type="button"
      onClick={() => onApply(Math.round(rate * 100) / 100)}
      className="mt-1 text-xs text-blue-600 hover:underline"
    >
      Kurs live: 1 THB ≈ {rate.toFixed(2)} IDR — pakai
    </button>
  );
}
