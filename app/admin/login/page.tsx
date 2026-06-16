"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";

type Team = "operation" | "marketing";

const TEAMS: { id: Team; label: string }[] = [
  { id: "operation", label: "Tim Operasional" },
  { id: "marketing", label: "Tim Marketing" },
];

export default function LoginPage() {
  const router = useRouter();
  const [team, setTeam] = useState<Team>("operation");
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
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          {TEAMS.map((tm) => (
            <button
              key={tm.id}
              type="button"
              onClick={() => setTeam(tm.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                team === tm.id
                  ? "bg-white text-[#1B2A4A] shadow-sm"
                  : "text-gray-500 hover:text-[#1B2A4A]"
              }`}
            >
              {tm.label}
            </button>
          ))}
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
