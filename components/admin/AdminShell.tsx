"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen print:min-h-0">
      <header className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-[#1B2A4A] px-4 py-3 text-white sm:px-6">
        <Link href="/admin" className="leading-tight">
          <p className="font-bold">Keliling Thailand</p>
          <p className="text-xs text-white/60">Admin</p>
        </Link>
        <button
          onClick={logout}
          className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Keluar
        </button>
      </header>
      <main className="mx-auto max-w-7xl overflow-x-clip p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-6 lg:p-8 print:max-w-none print:m-0! print:p-0! print:overflow-x-visible print:pb-0!">
        {children}
      </main>
    </div>
  );
}
