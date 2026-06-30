"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { formatPrintedAt } from "@/lib/admin/utils";

/**
 * "Printed <datetime>" stamp captured at print time. Updates the moment the
 * user prints — works for both the in-app Print button and the browser's
 * Cmd+P, because `beforeprint` fires for both. `flushSync` forces the new
 * timestamp into the DOM before the browser snapshots the page for printing.
 *
 * Initialised on mount (not during render) to avoid SSR hydration mismatch.
 */
export default function PrintedStamp({ className }: { className?: string }) {
  const [ts, setTs] = useState<Date | null>(null);

  useEffect(() => {
    // Set on mount (not during render) so SSR + first client render match;
    // the resulting extra render is intentional, hence the rule is disabled.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTs(new Date());
    const onBefore = () => flushSync(() => setTs(new Date()));
    window.addEventListener("beforeprint", onBefore);
    return () => window.removeEventListener("beforeprint", onBefore);
  }, []);

  if (!ts) return null;
  return <span className={className}>Printed {formatPrintedAt(ts)}</span>;
}
