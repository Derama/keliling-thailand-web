import type { User } from "@supabase/supabase-js";

// Admin roles. Role is stored in Supabase `user.app_metadata.role`, which is
// server-set and carried in the JWT — users cannot edit it themselves.
export type AdminRole = "operation" | "marketing";

// Normalize the role off a Supabase user. Anything unrecognized (including a
// missing role on legacy operation accounts) falls back to "operation".
export function getRole(user: User | null | undefined): AdminRole {
  const raw = user?.app_metadata?.role;
  return raw === "marketing" ? "marketing" : "operation";
}
