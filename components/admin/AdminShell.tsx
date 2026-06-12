"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Order" },
  { href: "/admin/calculator", label: "Kalkulator Margin" },
  { href: "/admin/calendar", label: "Kalender" },
  { href: "/admin/customers", label: "Customer" },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="no-print flex w-56 shrink-0 flex-col bg-[#1B2A4A] text-white">
        <div className="px-5 py-6">
          <p className="font-bold">Keliling Thailand</p>
          <p className="text-xs text-white/60">Admin</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "bg-[#F5C518] font-semibold text-[#1B2A4A]"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="m-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
        >
          Keluar
        </button>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
