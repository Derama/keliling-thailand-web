import type { createClient } from "@/lib/supabase/client";

/**
 * The order's selling price is derived, not typed: it always equals the sum of
 * the invoices saved against the order. Call this after any invoice insert /
 * update / delete so `orders.price_idr` (read by the dashboard, customer
 * revenue, invoice doc, payments, profit calc) stays in sync.
 */
export async function syncOrderPrice(
  supabase: ReturnType<typeof createClient>,
  orderId: string
): Promise<void> {
  const { data } = await supabase
    .from("invoices")
    .select("amount_idr")
    .eq("order_id", orderId);
  const total = (data ?? []).reduce((s, inv) => s + Number(inv.amount_idr), 0);
  await supabase.from("orders").update({ price_idr: total }).eq("id", orderId);
}
