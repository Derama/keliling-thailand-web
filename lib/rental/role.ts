import type { User } from "@supabase/supabase-js";

// Rental staff role, stored server-side in user.app_metadata.role = "rental"
// (carried in the JWT, not user-editable). Separate from tour admin roles.
export function isRentalUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "rental";
}
