import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/admin/role";
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

  const role = getRole(user);

  return (
    <RoleProvider role={role}>
      <AdminShell role={role}>{children}</AdminShell>
    </RoleProvider>
  );
}
