import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/admin/role";
import { isRentalUser } from "@/lib/rental/role";
import AdminShell from "@/components/admin/AdminShell";
import { RoleProvider } from "@/components/admin/RoleContext";

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  // Rental staff must use /rental — getRole() would otherwise treat any
  // unknown role as "operation" and hand them the full tour admin.
  if (isRentalUser(user)) redirect("/rental");

  const role = getRole(user);

  return (
    <RoleProvider role={role}>
      <AdminShell role={role}>{children}</AdminShell>
    </RoleProvider>
  );
}
