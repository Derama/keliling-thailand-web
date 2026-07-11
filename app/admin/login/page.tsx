"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("Email atau password salah.");
      setBusy(false);
      return;
    }
    // Fresh login always lands on the Dashboard tab, not the last-opened one.
    localStorage.setItem("admin-tab", "dashboard");
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-lg"
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-[#1B2A4A]">
            Keliling Thailand
          </p>
          <p className="text-sm text-gray-500">Admin Dashboard</p>
        </div>
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            autoComplete="current-password"
          />
        </Field>
        <ErrorNote message={error} />
        <button
          type="submit"
          disabled={busy}
          className={`${btnCls} w-full justify-center`}
        >
          {busy ? "Masuk…" : "Masuk"}
        </button>
      </form>
    </main>
  );
}
