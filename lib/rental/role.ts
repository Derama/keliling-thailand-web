import type { User } from "@supabase/supabase-js";

// Roles live server-side in user.app_metadata.role (carried in the JWT, not
// user-editable): "rental" = rental staff only, "owner" = both panels.
export function isRentalUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "rental";
}

export function isOwner(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "owner";
}

/** Rental panel entry: rental staff or the owner. */
export function canAccessRental(user: User | null | undefined): boolean {
  return isRentalUser(user) || isOwner(user);
}
