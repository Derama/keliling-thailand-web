"use client";

import { createClient } from "@/lib/supabase/client";

/** Global admin settings keys (single source of truth). */
export type SettingKey =
  | "itinerary_travel_tips"
  | "lead_templates"
  | "brand_logo"
  | "brand_colors";

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

export interface BrandColors {
  navy: string;
  yellow: string;
}

export const DEFAULT_BRAND_COLORS: BrandColors = {
  navy: "#1B2A4A",
  yellow: "#F5C518",
};

/** Logo URL stored under the brand_logo key, or null. */
export async function loadBrandLogo(): Promise<string | null> {
  return loadSetting<string>("brand_logo");
}

export async function saveBrandLogo(url: string): Promise<void> {
  return saveSetting<string>("brand_logo", url);
}

export async function loadBrandColors(): Promise<BrandColors> {
  return (await loadSetting<BrandColors>("brand_colors")) ?? DEFAULT_BRAND_COLORS;
}

export async function saveBrandColors(colors: BrandColors): Promise<void> {
  return saveSetting<BrandColors>("brand_colors", colors);
}
