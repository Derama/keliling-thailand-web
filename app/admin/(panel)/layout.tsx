import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return <AdminShell>{children}</AdminShell>;
}
