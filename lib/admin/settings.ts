"use client";

import { createClient } from "@/lib/supabase/client";

/** Global admin settings keys (single source of truth). */
export type SettingKey = "itinerary_travel_tips" | "lead_templates";

/** Load a global setting value, or null if unset. */
export async function loadSetting<T>(key: SettingKey): Promise<T | null> {
  const { data } = await createClient()
    .from("app_settings")
    .select("data")
    .eq("key", key)
    .maybeSingle();
  return (data?.data as T | undefined) ?? null;
}

/** Upsert a global setting value. */
export async function saveSetting<T>(key: SettingKey, data: T): Promise<void> {
  await createClient()
    .from("app_settings")
    .upsert(
      { key, data, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
}
