import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRentalUser } from "@/lib/rental/role";
import AdminShell from "@/components/admin/AdminShell";

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  // Rental staff must use /rental — they should not land in the tour admin.
  if (isRentalUser(user)) redirect("/rental");

  return <AdminShell>{children}</AdminShell>;
}
