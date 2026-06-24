"use client";

import { createClient } from "@/lib/supabase/client";

// Public bucket holding attraction photos (shared with the Places admin).
//   Storage → New bucket → name "place-images", Public = on.
export const PLACE_BUCKET = "place-images";

/** Upload a file to the public bucket; return its public URL. */
export async function uploadPlaceImage(
  file: File,
  city: string
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const slug = (city || "misc").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = `${slug}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(PLACE_BUCKET).upload(path, file);
  if (error) throw error;
  return supabase.storage.from(PLACE_BUCKET).getPublicUrl(path).data.publicUrl;
}
