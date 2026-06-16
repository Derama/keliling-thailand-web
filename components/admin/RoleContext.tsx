"use client";

import { createContext, useContext } from "react";
import type { AdminRole } from "@/lib/admin/role";

// Carries the signed-in user's role from the server layout (which reads it from
// the Supabase session) down to client views without a re-fetch.
const RoleContext = createContext<AdminRole>("operation");

export function RoleProvider({
  role,
  children,
}: {
  role: AdminRole;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): AdminRole {
  return useContext(RoleContext);
}
