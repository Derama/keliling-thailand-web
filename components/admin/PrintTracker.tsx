"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Stamps `orders.last_printed_at` whenever the order's document is printed or
 * saved to PDF. Listens for `beforeprint`, so it fires for both the in-app
 * Print button and the browser's Cmd+P. Renders nothing.
 */
export default function PrintTracker({ orderId }: { orderId: string }) {
  useEffect(() => {
    const stamp = () => {
      createClient()
        .from("orders")
        .update({ last_printed_at: new Date().toISOString() })
        .eq("id", orderId)
        .then(() => {});
    };
    window.addEventListener("beforeprint", stamp);
    return () => window.removeEventListener("beforeprint", stamp);
  }, [orderId]);

  return null;
}
