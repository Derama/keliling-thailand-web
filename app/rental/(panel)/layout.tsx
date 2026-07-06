import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessRental } from "@/lib/rental/role";
import RentalShell from "@/components/rental/RentalShell";

export default async function RentalPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rental/login");
  if (!canAccessRental(user)) redirect("/rental/login");

  return <RentalShell>{children}</RentalShell>;
}
