import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRentalUser } from "@/lib/rental/role";
import RentalShell from "@/components/rental/RentalShell";

export default async function RentalPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rental/login");
  if (!isRentalUser(user)) redirect("/rental/login");

  return <RentalShell>{children}</RentalShell>;
}
