"use client";

import { createClient } from "@/lib/supabase/client";

/** The rich builder documents that can be attached to an order. */
export type DocKind = "itinerary" | "invoice" | "brochure" | "joborder";

/** Load an order's saved builder draft, or null if none exists yet. */
export async function loadOrderDoc<T>(
  orderId: string,
  kind: DocKind
): Promise<T | null> {
  const { data } = await createClient()
    .from("order_documents")
    .select("data")
    .eq("order_id", orderId)
    .eq("kind", kind)
    .maybeSingle();
  return (data?.data as T | undefined) ?? null;
}

/** Upsert an order's builder draft. */
export async function saveOrderDoc<T>(
  orderId: string,
  kind: DocKind,
  data: T
): Promise<void> {
  await createClient()
    .from("order_documents")
    .upsert(
      { order_id: orderId, kind, data, updated_at: new Date().toISOString() },
      { onConflict: "order_id,kind" }
    );
}

/** Delete an order's builder draft (used by the builder's reset). */
export async function clearOrderDoc(
  orderId: string,
  kind: DocKind
): Promise<void> {
  await createClient()
    .from("order_documents")
    .delete()
    .eq("order_id", orderId)
    .eq("kind", kind);
}
