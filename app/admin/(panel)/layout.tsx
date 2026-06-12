import AdminShell from "@/components/admin/AdminShell";

export default function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
