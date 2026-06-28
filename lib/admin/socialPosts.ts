"use client";

import { createClient } from "@/lib/supabase/client";
import type { SocialPost } from "@/lib/admin/types";

// Public bucket holding source photos + exported posts.
//   Storage → New bucket → name "social-posts", Public = on.
export const SOCIAL_BUCKET = "social-posts";

/** Upload a file (photo or exported PNG) and return its public URL. */
export async function uploadPostImage(
  file: Blob,
  prefix: "photo" | "post",
  ext = "png"
): Promise<string> {
  const supabase = createClient();
  const path = `${prefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(SOCIAL_BUCKET).upload(path, file);
  if (error) throw error;
  return supabase.storage.from(SOCIAL_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function saveSocialPost(
  row: Omit<SocialPost, "id" | "created_at">
): Promise<void> {
  const { error } = await createClient().from("social_posts").insert(row);
  if (error) throw error;
}

export async function listSocialPosts(): Promise<SocialPost[]> {
  const { data, error } = await createClient()
    .from("social_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
