# Admin Operational Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Private `/admin` dashboard (Supabase-backed) for the Keliling Thailand team: orders, payments, job-order + invoice printing, margin calculator, calendar, customers, stats.

**Architecture:** All admin pages are client components using the Supabase browser client (`@supabase/ssr`); a root `proxy.ts` (Next 16 middleware) does the server-side session gate on `/admin/*`; Row Level Security (authenticated-only) is the data security boundary. Marketing pages move into an `app/(site)/` route group so admin pages don't inherit the marketing Navbar/Footer.

**Tech Stack:** Next.js 16 (App Router, webpack), React 19, TypeScript, Tailwind v4, Supabase (Postgres + Auth), `@supabase/supabase-js` + `@supabase/ssr`. No other new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-13-admin-dashboard-design.md`

**Conventions that differ from CLAUDE.md defaults (sanctioned by spec):**
- Admin UI strings are hardcoded Indonesian — NOT added to `lib/translations.ts`. The translations rule applies to the public site only.
- No test suite exists and none is added. Verification = `npm run build` + `npm run lint` + manual preview checks listed per task.
- Next 16 quirks: middleware file is `proxy.ts` (exports `proxy` function, not `middleware`); in client components, route `params` is a Promise unwrapped with React's `use()`.

**Money convention:** `price_idr`, `amount_idr` are IDR; `cost_thb` is THB; `fx_rate` is IDR per 1 THB. `profit_thb = price_idr / fx_rate − cost_thb`. Never store computed profit.

---

## Prerequisites (human, one-time — do before Task 1 verification)

1. Create a Supabase project at https://supabase.com (free tier), region Singapore.
2. In **Authentication → Sign In / Up**, disable "Allow new users to sign up".
3. In **Authentication → Users**, create team accounts (email + password).
4. Copy Project URL and anon/publishable key from **Settings → API** into `.env.local` (Task 1 creates the template).
5. After Task 1: paste `scripts/supabase-schema.sql` into the Supabase **SQL Editor** and run it.

Tasks 1–3 build and commit fine without a live Supabase project; from Task 4 onward, manual preview verification needs the project live.

---

### Task 1: Dependencies, env template, database schema

**Files:**
- Create: `scripts/supabase-schema.sql`
- Create: `.env.example`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install Supabase packages**

Run: `npm install @supabase/supabase-js @supabase/ssr`
Expected: both added to `dependencies`, no peer warnings blocking install.

- [ ] **Step 2: Create env template**

Create `.env.example`:

```bash
# Supabase — copy to .env.local and fill in from Supabase Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Verify `.gitignore` already ignores `.env*` files except `.env.example` (Next.js default `.gitignore` ignores `.env*`; if it uses a blanket `.env*` pattern, add `!.env.example`).

- [ ] **Step 3: Write schema SQL**

Create `scripts/supabase-schema.sql`:

```sql
-- Keliling Thailand admin dashboard schema.
-- Run once in the Supabase SQL Editor.

create type order_status as enum
  ('inquiry', 'confirmed', 'ongoing', 'completed', 'cancelled');
create type invoice_type as enum ('deposit', 'balance', 'full');

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  origin_city text,
  notes text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references customers (id),
  status order_status not null default 'inquiry',
  trip_start date,
  trip_end date,
  pax int,
  pickup_location text,
  vehicle text,
  driver_name text,
  itinerary text,
  price_idr numeric not null default 0,
  cost_thb numeric not null default 0,
  fx_rate numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  amount_idr numeric not null,
  paid_at date not null,
  method text,
  note text
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  order_id uuid not null references orders (id) on delete cascade,
  type invoice_type not null,
  amount_idr numeric not null,
  line_items jsonb not null default '[]',
  issued_at date not null default current_date
);

create index orders_trip_start_idx on orders (trip_start);
create index payments_order_id_idx on payments (order_id);
create index invoices_order_id_idx on invoices (order_id);

-- Keep updated_at fresh.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- RLS: full access for any authenticated team member, nothing for anon.
alter table customers enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table invoices enable row level security;

create policy "team full access" on customers
  for all to authenticated using (true) with check (true);
create policy "team full access" on orders
  for all to authenticated using (true) with check (true);
create policy "team full access" on payments
  for all to authenticated using (true) with check (true);
create policy "team full access" on invoices
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 4: Verify build still passes**

Run: `npm run build`
Expected: success (nothing imports the new packages yet).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/supabase-schema.sql .env.example .gitignore
git commit -m "Add Supabase dependencies, env template, and admin schema"
```

---

### Task 2: Route group restructure — marketing chrome out of root layout

The root layout currently renders Navbar/Footer/FloatingWhatsApp/providers for every route; admin pages must not inherit them. Move marketing pages into `app/(site)/` (URLs unchanged) and slim the root layout.

**Files:**
- Create: `app/(site)/layout.tsx`
- Modify: `app/layout.tsx`
- Move (git mv): `app/page.tsx`, `app/about/`, `app/contact/`, `app/fleet/`, `app/tours/`, `app/testimony/` → into `app/(site)/`
- Do NOT move: `app/robots.txt/`, `app/sitemap.xml/` (route handlers), `app/globals.css`

- [ ] **Step 1: Move marketing pages into the route group**

```bash
cd "/Users/devaadithyarama/Deva's workspace/keliling-thailand-web"
mkdir -p "app/(site)"
git mv app/page.tsx "app/(site)/page.tsx"
git mv app/about "app/(site)/about"
git mv app/contact "app/(site)/contact"
git mv app/fleet "app/(site)/fleet"
git mv app/tours "app/(site)/tours"
git mv app/testimony "app/(site)/testimony"
```

- [ ] **Step 2: Create `app/(site)/layout.tsx` with the marketing chrome**

Move everything below out of the root layout into this file: the three JSON-LD constants (`organizationLd`, `websiteLd`, `serviceLd`) and the `productionUrl`/`metadataBase`/`siteUrl` derivation they depend on, plus the providers and chrome. Result:

```tsx
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import JsonLd from "@/components/JsonLd";
import { LanguageProvider } from "@/components/LanguageContext";
import { PlanBuilderProvider } from "@/components/PlanBuilderContext";

// ... paste organizationLd, websiteLd, serviceLd and their siteUrl
// derivation here verbatim from the current app/layout.tsx ...

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <JsonLd data={[organizationLd, websiteLd, serviceLd]} />
      <LanguageProvider>
        <PlanBuilderProvider>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
          <FloatingWhatsApp />
        </PlanBuilderProvider>
      </LanguageProvider>
    </>
  );
}
```

- [ ] **Step 3: Slim the root layout**

`app/layout.tsx` keeps: the `metadata` export (with `metadataBase`), `viewport` export, `globals.css` import, and `<html>`/`<body>`. Remove the JSON-LD constants, providers, Navbar/Footer/FloatingWhatsApp imports and rendering. Body becomes:

```tsx
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-black">
        {children}
      </body>
    </html>
  );
}
```

Note: `siteUrl` is still needed in the root layout only if `metadata` references it — `metadataBase` derivation stays; the JSON-LD `siteUrl` usage moves with the constants. Keep the `productionUrl`/`metadataBase` block in BOTH files (or import `siteUrl` from `@/lib/site` in the site layout, which already exports it — preferred, DRY).

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: success; route list unchanged (`/`, `/about`, `/tours`, `/tours/[city]` etc. — route groups don't affect URLs).
Preview check: home page renders with navbar + footer; `/tours` works.

- [ ] **Step 5: Commit**

```bash
git add -A app
git commit -m "Move marketing pages into (site) route group, slim root layout"
```

---

### Task 3: Supabase client, admin types, shared utils + UI helpers

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/admin/types.ts`
- Create: `lib/admin/utils.ts`
- Create: `components/admin/ui.tsx`

- [ ] **Step 1: Browser client**

Create `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

(`createBrowserClient` stores the session in cookies, which `proxy.ts` reads server-side.)

- [ ] **Step 2: Types**

Create `lib/admin/types.ts`:

```ts
export type OrderStatus =
  | "inquiry"
  | "confirmed"
  | "ongoing"
  | "completed"
  | "cancelled";

export type InvoiceType = "deposit" | "balance" | "full";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  origin_city: string | null;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  trip_start: string | null;
  trip_end: string | null;
  pax: number | null;
  pickup_location: string | null;
  vehicle: string | null;
  driver_name: string | null;
  itinerary: string | null;
  price_idr: number;
  cost_thb: number;
  fx_rate: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Order row joined with its customer (select("*, customers(*)")). */
export interface OrderWithCustomer extends Order {
  customers: Customer;
}

export interface Payment {
  id: string;
  order_id: string;
  amount_idr: number;
  paid_at: string;
  method: string | null;
  note: string | null;
}

export interface InvoiceLineItem {
  description: string;
  amount_idr: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  type: InvoiceType;
  amount_idr: number;
  line_items: InvoiceLineItem[];
  issued_at: string;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "inquiry",
  "confirmed",
  "ongoing",
  "completed",
  "cancelled",
];

/** Admin UI is Indonesian-only (see spec). */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  inquiry: "Inquiry",
  confirmed: "Confirmed",
  ongoing: "Jalan",
  completed: "Selesai",
  cancelled: "Batal",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  inquiry: "bg-gray-200 text-gray-700",
  confirmed: "bg-blue-100 text-blue-800",
  ongoing: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const INVOICE_TYPES: InvoiceType[] = ["deposit", "balance", "full"];

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  deposit: "Deposit / DP",
  balance: "Pelunasan",
  full: "Full Payment",
};
```

- [ ] **Step 3: Utils**

Create `lib/admin/utils.ts`:

```ts
import type { Order } from "./types";

export function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatTHB(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Profit in THB, or null when fx_rate is missing/zero. */
export function profitTHB(
  o: Pick<Order, "price_idr" | "cost_thb" | "fx_rate">
): number | null {
  if (!o.fx_rate) return null;
  return o.price_idr / o.fx_rate - o.cost_thb;
}

export function profitIDR(
  o: Pick<Order, "price_idr" | "cost_thb" | "fx_rate">
): number | null {
  const thb = profitTHB(o);
  return thb === null ? null : thb * o.fx_rate;
}

/**
 * Document number like KT-2606-03 / KT-INV-2606-03.
 * `count` = how many numbers with this prefix+month already exist.
 */
export function buildDocNumber(
  prefix: "KT" | "KT-INV",
  count: number,
  date: Date = new Date()
): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${prefix}-${yy}${mm}-${String(count + 1).padStart(2, "0")}`;
}

/** Local-time YYYY-MM-DD. Never use toISOString() for calendar dates — UTC+7 shifts the day. */
export function isoLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-06-13" -> "13 Jun 2026"; null-safe. */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
```

- [ ] **Step 4: Shared admin UI helpers**

Create `components/admin/ui.tsx`:

```tsx
export const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B2A4A] focus:outline-none focus:ring-1 focus:ring-[#1B2A4A]";

export const btnCls =
  "inline-flex items-center gap-2 rounded-lg bg-[#1B2A4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#27375c] disabled:opacity-50";

export const btnSecondaryCls =
  "inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}
```

- [ ] **Step 5: Verify and commit**

Run: `npm run build && npm run lint`
Expected: both pass.

```bash
git add lib/supabase lib/admin components/admin
git commit -m "Add Supabase client, admin types, and shared admin utils"
```

---

### Task 4: Auth — proxy guard, login page, admin layouts, logout

**Files:**
- Create: `proxy.ts` (project root)
- Create: `app/admin/layout.tsx`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/(panel)/layout.tsx`
- Create: `components/admin/AdminShell.tsx`
- Create: `app/admin/(panel)/page.tsx` (placeholder, replaced in Task 11)

Layout structure: `app/admin/layout.tsx` is a thin server component carrying `noindex` metadata for ALL admin pages. Login lives outside the `(panel)` group so it gets no sidebar; everything else lives inside `(panel)` whose layout renders `AdminShell`.

- [ ] **Step 1: Proxy (Next 16 middleware)**

Create `proxy.ts` at the project root (same level as `app/`):

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname.startsWith("/admin/login");

  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};
```

- [ ] **Step 2: Admin root layout (metadata only)**

Create `app/admin/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin Keliling Thailand" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen w-full bg-gray-50">{children}</div>;
}
```

- [ ] **Step 3: Login page**

Create `app/admin/login/page.tsx`:

```tsx
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
        <button type="submit" disabled={busy} className={`${btnCls} w-full justify-center`}>
          {busy ? "Masuk…" : "Masuk"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Admin shell (sidebar + logout)**

Create `components/admin/AdminShell.tsx`:

```tsx
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
```

- [ ] **Step 5: Panel layout + placeholder dashboard**

Create `app/admin/(panel)/layout.tsx`:

```tsx
import AdminShell from "@/components/admin/AdminShell";

export default function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
```

Create `app/admin/(panel)/page.tsx` (replaced in Task 11):

```tsx
export default function AdminDashboardPage() {
  return <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>;
}
```

- [ ] **Step 6: Print helper CSS**

Add to the end of `app/globals.css`:

```css
@media print {
  .no-print {
    display: none !important;
  }
}
```

- [ ] **Step 7: Verify**

Requires live Supabase project + `.env.local` (see Prerequisites).
Run: `npm run build` — expected: success, routes `/admin`, `/admin/login` listed, `proxy` detected.
Preview checks:
1. Visit `/admin` logged out → redirected to `/admin/login`.
2. Wrong password → inline error.
3. Correct login → lands on dashboard with sidebar.
4. Visit `/admin/login` while logged in → redirected to `/admin`.
5. "Keluar" → back to login; `/admin` redirects again.

- [ ] **Step 8: Commit**

```bash
git add proxy.ts app/admin components/admin/AdminShell.tsx app/globals.css
git commit -m "Add admin auth: proxy session guard, login page, admin shell"
```

---

### Task 5: Customers — list and detail

**Files:**
- Create: `app/admin/(panel)/customers/page.tsx`
- Create: `app/admin/(panel)/customers/[id]/page.tsx`

- [ ] **Step 1: Customers list page**

Create `app/admin/(panel)/customers/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/admin/types";
import { inputCls, ErrorNote } from "@/components/admin/ui";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCustomers(data ?? []);
      });
  }, []);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Customer</h1>
      <input
        placeholder="Cari nama…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${inputCls} max-w-sm`}
      />
      <ErrorNote message={error} />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Kota asal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {c.phone ? (
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#25D366] hover:underline"
                    >
                      {c.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{c.origin_city ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Belum ada customer. Customer dibuat dari form order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Customer detail page**

Create `app/admin/(panel)/customers/[id]/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Customer, Order } from "@/lib/admin/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/admin/types";
import { formatIDR, formatDate } from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCustomer(data);
      });
    supabase
      .from("orders")
      .select("*")
      .eq("customer_id", id)
      .order("trip_start", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!customer) return <p className="text-gray-400">Memuat…</p>;

  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.price_idr), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2A4A]">{customer.name}</h1>
        <p className="text-sm text-gray-500">
          {customer.origin_city ?? "—"} ·{" "}
          {customer.phone ? (
            <a
              href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#25D366] hover:underline"
            >
              {customer.phone}
            </a>
          ) : (
            "tanpa nomor"
          )}
        </p>
        {customer.notes && (
          <p className="mt-2 text-sm text-gray-600">{customer.notes}</p>
        )}
      </div>
      <p className="text-sm text-gray-600">
        {orders.length} order · total {formatIDR(totalSpent)}
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Tanggal trip</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Harga</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatDate(o.trip_start)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {formatIDR(Number(o.price_idr))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

Run: `npm run build && npm run lint` — expected: pass.
Preview: `/admin/customers` shows empty state.

```bash
git add "app/admin/(panel)/customers"
git commit -m "Add admin customers list and detail pages"
```

---

### Task 6: FX rate API route + rate helper component

**Files:**
- Create: `app/api/fx/route.ts`
- Create: `components/admin/FxRateHint.tsx`

- [ ] **Step 1: FX route**

Create `app/api/fx/route.ts`:

```ts
// THB -> IDR rate from a free, keyless API. Cached ~1h server-side.
export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/THB", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.IDR;
    if (typeof rate !== "number") throw new Error("no IDR rate in response");
    return Response.json({ rate });
  } catch {
    return Response.json({ rate: null }, { status: 502 });
  }
}
```

- [ ] **Step 2: Rate hint component**

Create `components/admin/FxRateHint.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

/** Shows live THB->IDR rate with one-tap fill. Silent when API is down. */
export default function FxRateHint({
  onApply,
}: {
  onApply: (rate: number) => void;
}) {
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/fx")
      .then((r) => (r.ok ? r.json() : { rate: null }))
      .then((d) => setRate(typeof d.rate === "number" ? d.rate : null))
      .catch(() => setRate(null));
  }, []);

  if (rate === null) return null;

  return (
    <button
      type="button"
      onClick={() => onApply(Math.round(rate * 100) / 100)}
      className="mt-1 text-xs text-blue-600 hover:underline"
    >
      Kurs live: 1 THB ≈ {rate.toFixed(2)} IDR — pakai
    </button>
  );
}
```

- [ ] **Step 3: Verify and commit**

Run: `npm run build` — expected: pass, `/api/fx` in route list.
Preview: `curl localhost:3000/api/fx` returns `{"rate":<number>}`.

```bash
git add app/api/fx components/admin/FxRateHint.tsx
git commit -m "Add FX rate API route and one-tap rate hint component"
```

---

### Task 7: Orders — form component, list, new, detail with payments

**Files:**
- Create: `components/admin/OrderForm.tsx`
- Create: `app/admin/(panel)/orders/page.tsx`
- Create: `app/admin/(panel)/orders/new/page.tsx`
- Create: `app/admin/(panel)/orders/[id]/page.tsx`
- Create: `components/admin/PaymentsCard.tsx`

- [ ] **Step 1: Order form component (shared by new + edit)**

Create `components/admin/OrderForm.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Customer, Order, OrderStatus } from "@/lib/admin/types";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/admin/types";
import {
  buildDocNumber,
  formatIDR,
  formatTHB,
  profitTHB,
  profitIDR,
} from "@/lib/admin/utils";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import FxRateHint from "@/components/admin/FxRateHint";

interface Draft {
  customer_id: string;
  status: OrderStatus;
  trip_start: string;
  trip_end: string;
  pax: string;
  pickup_location: string;
  vehicle: string;
  driver_name: string;
  itinerary: string;
  price_idr: string;
  cost_thb: string;
  fx_rate: string;
  notes: string;
}

function toDraft(o: Order | null): Draft {
  return {
    customer_id: o?.customer_id ?? "",
    status: o?.status ?? "inquiry",
    trip_start: o?.trip_start ?? "",
    trip_end: o?.trip_end ?? "",
    pax: o?.pax != null ? String(o.pax) : "",
    pickup_location: o?.pickup_location ?? "",
    vehicle: o?.vehicle ?? "",
    driver_name: o?.driver_name ?? "",
    itinerary: o?.itinerary ?? "",
    price_idr: o ? String(o.price_idr) : "",
    cost_thb: o ? String(o.cost_thb) : "",
    fx_rate: o ? String(o.fx_rate) : "",
    notes: o?.notes ?? "",
  };
}

export default function OrderForm({
  order,
  onSaved,
}: {
  order: Order | null;
  /** Called after a successful update so the parent page can refetch. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(order));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custCity, setCustCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient()
      .from("customers")
      .select("*")
      .order("name")
      .then(({ data }) => setCustomers(data ?? []));
  }, []);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const numbers = {
    price_idr: Number(draft.price_idr) || 0,
    cost_thb: Number(draft.cost_thb) || 0,
    fx_rate: Number(draft.fx_rate) || 0,
  };
  const pThb = profitTHB(numbers);
  const pIdr = profitIDR(numbers);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    let customerId = draft.customer_id;
    if (newCustomer) {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: custName,
          phone: custPhone || null,
          origin_city: custCity || null,
        })
        .select("id")
        .single();
      if (error) {
        setError(`Gagal membuat customer: ${error.message}`);
        setBusy(false);
        return;
      }
      customerId = data.id;
    }
    if (!customerId) {
      setError("Pilih customer atau buat baru.");
      setBusy(false);
      return;
    }

    const row = {
      customer_id: customerId,
      status: draft.status,
      trip_start: draft.trip_start || null,
      trip_end: draft.trip_end || null,
      pax: draft.pax ? Number(draft.pax) : null,
      pickup_location: draft.pickup_location || null,
      vehicle: draft.vehicle || null,
      driver_name: draft.driver_name || null,
      itinerary: draft.itinerary || null,
      price_idr: numbers.price_idr,
      cost_thb: numbers.cost_thb,
      fx_rate: numbers.fx_rate,
      notes: draft.notes || null,
    };

    if (order) {
      const { error } = await supabase
        .from("orders")
        .update(row)
        .eq("id", order.id);
      if (error) {
        setError(`Gagal menyimpan: ${error.message}`);
        setBusy(false);
        return;
      }
      onSaved?.();
      setBusy(false);
    } else {
      const prefix = `KT-${buildDocNumber("KT", 0).split("-")[1]}-`;
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .like("order_number", `${prefix}%`);
      const orderNumber = buildDocNumber("KT", count ?? 0);
      const { data, error } = await supabase
        .from("orders")
        .insert({ ...row, order_number: orderNumber })
        .select("id")
        .single();
      if (error) {
        setError(`Gagal membuat order: ${error.message}`);
        setBusy(false);
        return;
      }
      router.push(`/admin/orders/${data.id}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Customer</h2>
        {!newCustomer ? (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Field label="Customer">
                <select
                  value={draft.customer_id}
                  onChange={(e) => set("customer_id", e.target.value)}
                  className={inputCls}
                >
                  <option value="">— pilih —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.origin_city ? `(${c.origin_city})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <button
              type="button"
              onClick={() => setNewCustomer(true)}
              className="pb-2 text-sm text-blue-600 hover:underline"
            >
              + Customer baru
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nama">
              <input
                required
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="WhatsApp">
              <input
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                className={inputCls}
                placeholder="628…"
              />
            </Field>
            <Field label="Kota asal">
              <input
                value={custCity}
                onChange={(e) => setCustCity(e.target.value)}
                className={inputCls}
              />
            </Field>
            <button
              type="button"
              onClick={() => setNewCustomer(false)}
              className="text-left text-sm text-gray-500 hover:underline"
            >
              ← pilih customer lama
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Trip</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) => set("status", e.target.value as OrderStatus)}
              className={inputCls}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mulai">
            <input
              type="date"
              value={draft.trip_start}
              onChange={(e) => set("trip_start", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Selesai">
            <input
              type="date"
              value={draft.trip_end}
              onChange={(e) => set("trip_end", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Jumlah pax">
            <input
              type="number"
              min="1"
              value={draft.pax}
              onChange={(e) => set("pax", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Lokasi jemput">
            <input
              value={draft.pickup_location}
              onChange={(e) => set("pickup_location", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Kendaraan">
            <input
              value={draft.vehicle}
              onChange={(e) => set("vehicle", e.target.value)}
              className={inputCls}
              placeholder="Van Commuter, dst."
            />
          </Field>
          <Field label="Nama sopir">
            <input
              value={draft.driver_name}
              onChange={(e) => set("driver_name", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Itinerary (muncul di job order)">
          <textarea
            rows={5}
            value={draft.itinerary}
            onChange={(e) => set("itinerary", e.target.value)}
            className={inputCls}
            placeholder={"Hari 1: Bangkok city tour\nHari 2: Pattaya…"}
          />
        </Field>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Harga &amp; biaya</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Harga jual (IDR)">
            <input
              type="number"
              min="0"
              value={draft.price_idr}
              onChange={(e) => set("price_idr", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Total biaya (THB)">
            <input
              type="number"
              min="0"
              value={draft.cost_thb}
              onChange={(e) => set("cost_thb", e.target.value)}
              className={inputCls}
            />
          </Field>
          <div>
            <Field label="Kurs (IDR per 1 THB)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.fx_rate}
                onChange={(e) => set("fx_rate", e.target.value)}
                className={inputCls}
              />
            </Field>
            <FxRateHint onApply={(r) => set("fx_rate", String(r))} />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Profit:{" "}
          {pThb === null ? (
            <span className="text-gray-400">isi kurs dulu</span>
          ) : (
            <span className={pThb >= 0 ? "text-green-700" : "text-red-700"}>
              {formatTHB(pThb)} ≈ {formatIDR(pIdr ?? 0)}
            </span>
          )}
        </p>
        <Field label="Catatan internal">
          <textarea
            rows={2}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={inputCls}
          />
        </Field>
      </section>

      <ErrorNote message={error} />
      <button type="submit" disabled={busy} className={btnCls}>
        {busy ? "Menyimpan…" : order ? "Simpan perubahan" : "Buat order"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Orders list page**

Create `app/admin/(panel)/orders/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer, OrderStatus } from "@/lib/admin/types";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/admin/types";
import { formatIDR, formatDate } from "@/lib/admin/utils";
import { inputCls, btnCls, ErrorNote } from "@/components/admin/ui";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("orders")
      .select("*, customers(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders((data as OrderWithCustomer[]) ?? []);
      });
  }, []);

  const filtered = orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (query === "" ||
        o.customers.name.toLowerCase().includes(query.toLowerCase()) ||
        o.order_number.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Order</h1>
        <Link href="/admin/orders/new" className={btnCls}>
          + Order baru
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
          className={`${inputCls} w-auto`}
        >
          <option value="all">Semua status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          placeholder="Cari customer / nomor order…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} max-w-xs`}
        />
      </div>
      <ErrorNote message={error} />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Harga</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.customers.name}</td>
                <td className="px-4 py-3">
                  {formatDate(o.trip_start)}
                  {o.trip_end && o.trip_end !== o.trip_start
                    ? ` – ${formatDate(o.trip_end)}`
                    : ""}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {formatIDR(Number(o.price_idr))}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Tidak ada order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: New order page**

Create `app/admin/(panel)/orders/new/page.tsx`:

```tsx
import OrderForm from "@/components/admin/OrderForm";

export default function NewOrderPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Order baru</h1>
      <OrderForm order={null} />
    </div>
  );
}
```

- [ ] **Step 4: Payments card component**

Create `components/admin/PaymentsCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Payment } from "@/lib/admin/types";
import { formatIDR, formatDate, isoLocal } from "@/lib/admin/utils";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";

export default function PaymentsCard({
  orderId,
  priceIdr,
  payments,
  onChanged,
}: {
  orderId: string;
  priceIdr: number;
  payments: Payment[];
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => isoLocal());
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const paid = payments.reduce((sum, p) => sum + Number(p.amount_idr), 0);
  const balance = priceIdr - paid;

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("payments").insert({
      order_id: orderId,
      amount_idr: Number(amount),
      paid_at: paidAt,
      method: method || null,
    });
    if (error) setError(error.message);
    else {
      setAmount("");
      setMethod("");
      onChanged();
    }
    setBusy(false);
  }

  async function removePayment(id: string) {
    if (!confirm("Hapus pembayaran ini?")) return;
    const { error } = await createClient()
      .from("payments")
      .delete()
      .eq("id", id);
    if (error) setError(error.message);
    else onChanged();
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-[#1B2A4A]">Pembayaran</h2>
      <p className="text-sm">
        Dibayar <strong>{formatIDR(paid)}</strong> dari{" "}
        {formatIDR(priceIdr)} —{" "}
        {balance <= 0 ? (
          <span className="font-semibold text-green-700">LUNAS</span>
        ) : (
          <span className="font-semibold text-red-700">
            sisa {formatIDR(balance)}
          </span>
        )}
      </p>
      <ul className="divide-y divide-gray-100 text-sm">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2">
            <span>
              {formatDate(p.paid_at)} · {formatIDR(Number(p.amount_idr))}
              {p.method ? ` · ${p.method}` : ""}
            </span>
            <button
              onClick={() => removePayment(p.id)}
              className="text-xs text-red-500 hover:underline"
            >
              hapus
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addPayment} className="flex flex-wrap items-end gap-3">
        <Field label="Jumlah (IDR)">
          <input
            type="number"
            min="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Tanggal">
          <input
            type="date"
            required
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Metode">
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputCls}
            placeholder="Transfer BCA"
          />
        </Field>
        <button type="submit" disabled={busy} className={btnCls}>
          Catat
        </button>
      </form>
      <ErrorNote message={error} />
    </section>
  );
}
```

- [ ] **Step 5: Order detail page**

Create `app/admin/(panel)/orders/[id]/page.tsx`:

```tsx
"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Order, Payment, Invoice } from "@/lib/admin/types";
import OrderForm from "@/components/admin/OrderForm";
import PaymentsCard from "@/components/admin/PaymentsCard";
import { formatDate } from "@/lib/admin/utils";
import { btnSecondaryCls, ErrorNote } from "@/components/admin/ui";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrder(data);
      });
    supabase
      .from("payments")
      .select("*")
      .eq("order_id", id)
      .order("paid_at")
      .then(({ data }) => setPayments(data ?? []));
    supabase
      .from("invoices")
      .select("*")
      .eq("order_id", id)
      .order("issued_at")
      .then(({ data }) => setInvoices(data ?? []));
  }, [id]);

  useEffect(load, [load]);

  if (error) return <ErrorNote message={error} />;
  if (!order) return <p className="text-gray-400">Memuat…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">
          {order.order_number}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/orders/${order.id}/job-order`}
            className={btnSecondaryCls}
          >
            Job Order
          </Link>
          <Link
            href={`/admin/orders/${order.id}/invoice/new`}
            className={btnSecondaryCls}
          >
            + Invoice
          </Link>
        </div>
      </div>

      <PaymentsCard
        orderId={order.id}
        priceIdr={Number(order.price_idr)}
        payments={payments}
        onChanged={load}
      />

      {invoices.length > 0 && (
        <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-[#1B2A4A]">Invoice</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {invoices.map((inv) => (
              <li key={inv.id} className="py-2">
                <Link
                  href={`/admin/orders/${order.id}/invoice/${inv.id}`}
                  className="font-medium text-[#1B2A4A] hover:underline"
                >
                  {inv.invoice_number}
                </Link>{" "}
                <span className="text-gray-500">
                  · {formatDate(inv.issued_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OrderForm order={order} onSaved={load} />
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npm run build && npm run lint` — expected: pass (the `/admin/orders/[id]/invoice/new` link 404s until Task 9; acceptable mid-plan).
Preview round-trip:
1. `/admin/orders/new` → create order with new customer → lands on detail.
2. Order appears in `/admin/orders` and customer in `/admin/customers`.
3. Add a payment → totals update; delete it → confirm dialog, totals revert.
4. Edit a field, save, reload → persisted.
5. Profit preview shows when kurs filled; FX hint fills kurs.

- [ ] **Step 7: Commit**

```bash
git add "app/admin/(panel)/orders" components/admin/OrderForm.tsx components/admin/PaymentsCard.tsx
git commit -m "Add orders CRUD with inline customer creation and payment tracking"
```

---

### Task 8: Job order print page

**Files:**
- Create: `components/admin/PrintDoc.tsx`
- Create: `app/admin/(panel)/orders/[id]/job-order/page.tsx`
- Modify: `app/globals.css` (print page styles)

- [ ] **Step 1: Shared print frame**

Create `components/admin/PrintDoc.tsx`:

```tsx
"use client";

import { btnCls } from "@/components/admin/ui";

/** Branded A4-ish frame for printable docs with a no-print print button. */
export default function PrintDoc({
  title,
  docNumber,
  children,
}: {
  title: string;
  docNumber: string;
  children: React.ReactNode;
}) {
  return (
    <div className="print-doc mx-auto max-w-3xl space-y-6 rounded-xl bg-white p-8 shadow-sm">
      <div className="flex items-start justify-between border-b-4 border-[#F5C518] pb-4">
        <div>
          <p className="text-xl font-bold text-[#1B2A4A]">Keliling Thailand</p>
          <p className="text-xs text-gray-500">
            Private tours &amp; vehicle charter — kelilingthailand.com
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold uppercase tracking-wide text-[#1B2A4A]">
            {title}
          </p>
          <p className="text-sm text-gray-600">{docNumber}</p>
        </div>
      </div>
      {children}
      <button onClick={() => window.print()} className={`${btnCls} no-print`}>
        Print / Simpan PDF
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Print page CSS**

Extend the `@media print` block in `app/globals.css` to:

```css
@media print {
  .no-print {
    display: none !important;
  }
  .print-doc {
    box-shadow: none !important;
    border-radius: 0 !important;
    max-width: none !important;
    padding: 0 !important;
  }
}
```

- [ ] **Step 3: Job order page**

Create `app/admin/(panel)/orders/[id]/job-order/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer } from "@/lib/admin/types";
import { formatDate } from "@/lib/admin/utils";
import PrintDoc from "@/components/admin/PrintDoc";
import { ErrorNote } from "@/components/admin/ui";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-36 shrink-0 text-gray-500">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

export default function JobOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderWithCustomer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("orders")
      .select("*, customers(*)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrder(data as OrderWithCustomer);
      });
  }, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!order) return <p className="text-gray-400">Memuat…</p>;

  const dates =
    order.trip_end && order.trip_end !== order.trip_start
      ? `${formatDate(order.trip_start)} – ${formatDate(order.trip_end)}`
      : formatDate(order.trip_start);

  return (
    <PrintDoc title="Job Order" docNumber={order.order_number}>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <div>
          <Row label="Customer" value={order.customers.name} />
          <Row label="WhatsApp" value={order.customers.phone ?? ""} />
          <Row label="Jumlah pax" value={order.pax ? String(order.pax) : ""} />
          <Row label="Tanggal" value={dates} />
        </div>
        <div>
          <Row label="Kendaraan" value={order.vehicle ?? ""} />
          <Row label="Sopir" value={order.driver_name ?? ""} />
          <Row label="Lokasi jemput" value={order.pickup_location ?? ""} />
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold text-[#1B2A4A]">Itinerary</p>
        <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
          {order.itinerary || "—"}
        </p>
      </div>
    </PrintDoc>
  );
}
```

Note: the job order intentionally shows NO money fields — it goes to the driver.

- [ ] **Step 4: Verify and commit**

Run: `npm run build && npm run lint` — expected: pass.
Preview: open job order from an order → branded doc, no prices; browser print preview hides sidebar + button.

```bash
git add "app/admin/(panel)/orders" components/admin/PrintDoc.tsx app/globals.css
git commit -m "Add printable job order document"
```

---

### Task 9: Invoices — create form + print page

Route note: `app/admin/(panel)/orders/[id]/invoice/[invoiceId]/page.tsx` serves BOTH the creation form (when `invoiceId === "new"`) and the print view (otherwise). One page, one dynamic segment — matches the `+ Invoice` link from Task 7.

**Files:**
- Create: `app/admin/(panel)/orders/[id]/invoice/[invoiceId]/page.tsx`
- Create: `components/admin/InvoiceForm.tsx`
- Create: `components/admin/InvoiceDoc.tsx`

- [ ] **Step 1: Invoice creation form**

Create `components/admin/InvoiceForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Order, InvoiceType, InvoiceLineItem } from "@/lib/admin/types";
import { INVOICE_TYPES, INVOICE_TYPE_LABELS } from "@/lib/admin/types";
import { buildDocNumber, formatIDR } from "@/lib/admin/utils";
import { Field, inputCls, btnCls, ErrorNote } from "@/components/admin/ui";

export default function InvoiceForm({ order }: { order: Order }) {
  const router = useRouter();
  const [type, setType] = useState<InvoiceType>("deposit");
  const [items, setItems] = useState<InvoiceLineItem[]>([
    { description: `Paket tour ${order.order_number}`, amount_idr: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = items.reduce((sum, it) => sum + (Number(it.amount_idr) || 0), 0);

  function setItem(i: number, patch: Partial<InvoiceLineItem>) {
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const prefix = `KT-INV-${buildDocNumber("KT", 0).split("-")[1]}-`;
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .like("invoice_number", `${prefix}%`);
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: buildDocNumber("KT-INV", count ?? 0),
        order_id: order.id,
        type,
        amount_idr: total,
        line_items: items,
      })
      .select("id")
      .single();
    if (error) {
      setError(`Gagal membuat invoice: ${error.message}`);
      setBusy(false);
      return;
    }
    router.push(`/admin/orders/${order.id}/invoice/${data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">
        Invoice baru — {order.order_number}
      </h1>
      <Field label="Jenis">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as InvoiceType)}
          className={inputCls}
        >
          {INVOICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {INVOICE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Rincian</p>
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input
              required
              value={it.description}
              onChange={(e) => setItem(i, { description: e.target.value })}
              className={inputCls}
              placeholder="Deskripsi"
            />
            <input
              type="number"
              min="0"
              required
              value={it.amount_idr || ""}
              onChange={(e) =>
                setItem(i, { amount_idr: Number(e.target.value) })
              }
              className={`${inputCls} max-w-44`}
              placeholder="Jumlah IDR"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}
                className="text-sm text-red-500"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setItems((arr) => [...arr, { description: "", amount_idr: 0 }])
          }
          className="text-sm text-blue-600 hover:underline"
        >
          + baris
        </button>
      </div>
      <p className="text-sm">
        Total: <strong>{formatIDR(total)}</strong>
      </p>
      <ErrorNote message={error} />
      <button type="submit" disabled={busy || total <= 0} className={btnCls}>
        {busy ? "Membuat…" : "Buat invoice"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Invoice print doc**

Create `components/admin/InvoiceDoc.tsx`:

```tsx
"use client";

import type { Invoice, OrderWithCustomer, Payment } from "@/lib/admin/types";
import { INVOICE_TYPE_LABELS } from "@/lib/admin/types";
import { formatIDR, formatDate } from "@/lib/admin/utils";
import PrintDoc from "@/components/admin/PrintDoc";

// TODO-OPS: replace with the real bank account before first customer invoice.
const BANK_DETAILS = [
  "Transfer ke:",
  "BCA 1234567890",
  "a.n. Keliling Thailand",
];

export default function InvoiceDoc({
  invoice,
  order,
  payments,
}: {
  invoice: Invoice;
  order: OrderWithCustomer;
  payments: Payment[];
}) {
  const paid = payments.reduce((sum, p) => sum + Number(p.amount_idr), 0);
  const balance = Number(order.price_idr) - paid;

  return (
    <PrintDoc title="Invoice" docNumber={invoice.invoice_number}>
      <div className="flex justify-between text-sm">
        <div>
          <p className="text-gray-500">Ditagihkan kepada</p>
          <p className="font-semibold">{order.customers.name}</p>
          {order.customers.phone && <p>{order.customers.phone}</p>}
        </div>
        <div className="text-right">
          <p>
            <span className="text-gray-500">Tanggal: </span>
            {formatDate(invoice.issued_at)}
          </p>
          <p>
            <span className="text-gray-500">Order: </span>
            {order.order_number}
          </p>
          <p>
            <span className="text-gray-500">Jenis: </span>
            {INVOICE_TYPE_LABELS[invoice.type]}
          </p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-[#1B2A4A] text-left">
            <th className="py-2">Deskripsi</th>
            <th className="py-2 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((it, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2">{it.description}</td>
              <td className="py-2 text-right">
                {formatIDR(Number(it.amount_idr))}
              </td>
            </tr>
          ))}
          <tr>
            <td className="py-2 font-bold">Total invoice ini</td>
            <td className="py-2 text-right font-bold">
              {formatIDR(Number(invoice.amount_idr))}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="rounded-lg bg-gray-50 p-4 text-sm">
        <p>
          Total paket: <strong>{formatIDR(Number(order.price_idr))}</strong> ·
          Sudah dibayar: <strong>{formatIDR(paid)}</strong> · Sisa:{" "}
          <strong className={balance <= 0 ? "text-green-700" : ""}>
            {formatIDR(Math.max(balance, 0))}
          </strong>
        </p>
      </div>

      <div className="text-sm">
        {BANK_DETAILS.map((line, i) => (
          <p key={i} className={i === 0 ? "text-gray-500" : "font-medium"}>
            {line}
          </p>
        ))}
      </div>
    </PrintDoc>
  );
}
```

- [ ] **Step 3: Combined invoice page**

Create `app/admin/(panel)/orders/[id]/invoice/[invoiceId]/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Invoice, OrderWithCustomer, Payment } from "@/lib/admin/types";
import InvoiceForm from "@/components/admin/InvoiceForm";
import InvoiceDoc from "@/components/admin/InvoiceDoc";
import { ErrorNote } from "@/components/admin/ui";

export default function InvoicePage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = use(params);
  const isNew = invoiceId === "new";
  const [order, setOrder] = useState<OrderWithCustomer | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, customers(*)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrder(data as OrderWithCustomer);
      });
    if (!isNew) {
      supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single()
        .then(({ data, error }) => {
          if (error) setError(error.message);
          else setInvoice(data);
        });
      supabase
        .from("payments")
        .select("*")
        .eq("order_id", id)
        .order("paid_at")
        .then(({ data }) => setPayments(data ?? []));
    }
  }, [id, invoiceId, isNew]);

  if (error) return <ErrorNote message={error} />;
  if (!order || (!isNew && !invoice))
    return <p className="text-gray-400">Memuat…</p>;

  return isNew ? (
    <InvoiceForm order={order} />
  ) : (
    <InvoiceDoc invoice={invoice!} order={order} payments={payments} />
  );
}
```

- [ ] **Step 4: Verify and commit**

Run: `npm run build && npm run lint` — expected: pass.
Preview: from order detail → `+ Invoice` → create deposit invoice with 2 line items → lands on print view with totals, paid/balance, bank block. Invoice listed on order detail. Print preview clean.

```bash
git add "app/admin/(panel)/orders" components/admin/InvoiceForm.tsx components/admin/InvoiceDoc.tsx
git commit -m "Add invoice creation and printable invoice document"
```

---

### Task 10: Margin calculator (standalone)

**Files:**
- Create: `app/admin/(panel)/calculator/page.tsx`

- [ ] **Step 1: Calculator page**

Create `app/admin/(panel)/calculator/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { formatIDR, formatTHB } from "@/lib/admin/utils";
import { Field, inputCls } from "@/components/admin/ui";
import FxRateHint from "@/components/admin/FxRateHint";

interface CostRow {
  label: string;
  thb: string;
}

export default function CalculatorPage() {
  const [rows, setRows] = useState<CostRow[]>([
    { label: "Sewa van + sopir", thb: "" },
    { label: "Bensin + tol", thb: "" },
  ]);
  const [priceIdr, setPriceIdr] = useState("");
  const [fxRate, setFxRate] = useState("");

  const totalCostThb = rows.reduce((sum, r) => sum + (Number(r.thb) || 0), 0);
  const price = Number(priceIdr) || 0;
  const rate = Number(fxRate) || 0;
  const profitThb = rate ? price / rate - totalCostThb : null;
  const profitIdr = profitThb !== null ? profitThb * rate : null;
  const marginPct =
    profitThb !== null && price > 0 && rate
      ? (profitThb / (price / rate)) * 100
      : null;

  function setRow(i: number, patch: Partial<CostRow>) {
    setRows((arr) => arr.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Kalkulator Margin</h1>
      <p className="text-sm text-gray-500">
        Coret-coretan untuk quotation. Tidak disimpan.
      </p>

      <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Biaya (THB)</h2>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={r.label}
              onChange={(e) => setRow(i, { label: e.target.value })}
              className={inputCls}
              placeholder="Hotel, tiket, guide…"
            />
            <input
              type="number"
              min="0"
              value={r.thb}
              onChange={(e) => setRow(i, { thb: e.target.value })}
              className={`${inputCls} max-w-40`}
              placeholder="THB"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((arr) => arr.filter((_, j) => j !== i))}
                className="text-sm text-red-500"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((arr) => [...arr, { label: "", thb: "" }])}
          className="text-sm text-blue-600 hover:underline"
        >
          + baris biaya
        </button>
        <p className="text-sm">
          Total biaya: <strong>{formatTHB(totalCostThb)}</strong>
        </p>
      </section>

      <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <Field label="Harga jual (IDR)">
          <input
            type="number"
            min="0"
            value={priceIdr}
            onChange={(e) => setPriceIdr(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div>
          <Field label="Kurs (IDR per 1 THB)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <FxRateHint onApply={(r) => setFxRate(String(r))} />
        </div>
      </section>

      <section className="rounded-xl border-2 border-[#F5C518] bg-white p-5">
        {profitThb === null ? (
          <p className="text-sm text-gray-400">
            Isi harga jual dan kurs untuk melihat margin.
          </p>
        ) : (
          <div className="space-y-1">
            <p
              className={`text-2xl font-bold ${
                profitThb >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {formatTHB(profitThb)}
            </p>
            <p className="text-sm text-gray-600">
              ≈ {formatIDR(profitIdr ?? 0)} · margin{" "}
              {marginPct !== null ? `${marginPct.toFixed(1)}%` : "—"}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run build && npm run lint` — expected: pass.
Preview math check: costs 5,000 THB total, price 5,000,000 IDR, kurs 500 → revenue 10,000 THB, profit 5,000 THB ≈ 2,500,000 IDR, margin 50.0%.

```bash
git add "app/admin/(panel)/calculator"
git commit -m "Add standalone margin calculator"
```

---

### Task 11: Dashboard stats + trip calendar

**Files:**
- Create: `app/admin/(panel)/calendar/page.tsx`
- Replace: `app/admin/(panel)/page.tsx` (placeholder from Task 4)

Stats definition (from spec): a trip counts toward a month by its `trip_start`; included statuses are `confirmed`, `ongoing`, `completed` (NOT `inquiry`, NOT `cancelled`). Outstanding payments = same statuses where paid < price.

- [ ] **Step 1: Dashboard page**

Replace `app/admin/(panel)/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer, Payment } from "@/lib/admin/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/admin/types";
import {
  formatIDR,
  formatTHB,
  formatDate,
  profitTHB,
  isoLocal,
} from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

const ACTIVE = ["confirmed", "ongoing", "completed"] as const;

function monthRange(offset: number): [string, string] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return [isoLocal(start), isoLocal(end)];
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1B2A4A]">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, customers(*)")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders((data as OrderWithCustomer[]) ?? []);
      });
    supabase
      .from("payments")
      .select("*")
      .then(({ data }) => setPayments(data ?? []));
  }, []);

  const active = orders.filter((o) =>
    (ACTIVE as readonly string[]).includes(o.status)
  );

  function monthStats(offset: number) {
    const [start, end] = monthRange(offset);
    const inMonth = active.filter(
      (o) => o.trip_start && o.trip_start >= start && o.trip_start < end
    );
    const revenue = inMonth.reduce((s, o) => s + Number(o.price_idr), 0);
    const profit = inMonth.reduce((s, o) => s + (profitTHB(o) ?? 0), 0);
    return { trips: inMonth.length, revenue, profit };
  }

  const thisMonth = monthStats(0);
  const lastMonth = monthStats(-1);

  const today = isoLocal();
  const upcoming = active
    .filter((o) => o.trip_start && o.trip_start >= today)
    .sort((a, b) => (a.trip_start! < b.trip_start! ? -1 : 1))
    .slice(0, 8);

  const paidByOrder = new Map<string, number>();
  for (const p of payments) {
    paidByOrder.set(
      p.order_id,
      (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount_idr)
    );
  }
  const outstanding = active.filter(
    (o) => Number(o.price_idr) > (paidByOrder.get(o.id) ?? 0)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
      <ErrorNote message={error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Trip bulan ini"
          value={String(thisMonth.trips)}
          sub={`bulan lalu: ${lastMonth.trips}`}
        />
        <StatCard
          label="Omzet bulan ini"
          value={formatIDR(thisMonth.revenue)}
          sub={`bulan lalu: ${formatIDR(lastMonth.revenue)}`}
        />
        <StatCard
          label="Profit bulan ini"
          value={formatTHB(thisMonth.profit)}
          sub={`bulan lalu: ${formatTHB(lastMonth.profit)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-[#1B2A4A]">
            Trip mendatang
          </h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {upcoming.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <span>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>{" "}
                  · {o.customers.name}
                </span>
                <span className="text-gray-500">
                  {formatDate(o.trip_start)}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </span>
              </li>
            ))}
            {upcoming.length === 0 && (
              <li className="py-4 text-gray-400">Tidak ada trip mendatang.</li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-[#1B2A4A]">
            Belum lunas
          </h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {outstanding.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <span>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>{" "}
                  · {o.customers.name}
                </span>
                <span className="font-medium text-red-700">
                  sisa{" "}
                  {formatIDR(
                    Number(o.price_idr) - (paidByOrder.get(o.id) ?? 0)
                  )}
                </span>
              </li>
            ))}
            {outstanding.length === 0 && (
              <li className="py-4 text-gray-400">Semua order lunas. 🎉</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Calendar page**

Create `app/admin/(panel)/calendar/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer, OrderStatus } from "@/lib/admin/types";
import { ErrorNote, btnSecondaryCls } from "@/components/admin/ui";
import { isoLocal } from "@/lib/admin/utils";

const BAR_COLORS: Record<OrderStatus, string> = {
  inquiry: "bg-gray-300 text-gray-800",
  confirmed: "bg-blue-500 text-white",
  ongoing: "bg-[#F5C518] text-[#1B2A4A]",
  completed: "bg-green-500 text-white",
  cancelled: "bg-red-200 text-red-700 line-through",
};

export default function CalendarPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("orders")
      .select("*, customers(*)")
      .not("trip_start", "is", null)
      .neq("status", "cancelled")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders((data as OrderWithCustomer[]) ?? []);
      });
  }, []);

  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstWeekday = (new Date(year, mon, 1).getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      isoLocal(new Date(year, mon, i + 1))
    ),
  ];

  function tripsOn(day: string) {
    return orders.filter(
      (o) => o.trip_start! <= day && day <= (o.trip_end ?? o.trip_start!)
    );
  }

  const monthLabel = month.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const todayIso = isoLocal();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Kalender</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(new Date(year, mon - 1, 1))}
            className={btnSecondaryCls}
          >
            ←
          </button>
          <span className="min-w-40 text-center font-semibold">
            {monthLabel}
          </span>
          <button
            onClick={() => setMonth(new Date(year, mon + 1, 1))}
            className={btnSecondaryCls}
          >
            →
          </button>
        </div>
      </div>
      <ErrorNote message={error} />
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 text-sm">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <div
            key={d}
            className="bg-gray-50 px-2 py-2 text-center font-medium text-gray-500"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`min-h-24 bg-white p-1.5 ${
              day === todayIso ? "ring-2 ring-inset ring-[#F5C518]" : ""
            }`}
          >
            {day && (
              <>
                <p className="text-xs text-gray-400">{Number(day.slice(8))}</p>
                <div className="mt-1 space-y-1">
                  {tripsOn(day).map((o) => (
                    <Link
                      key={o.id}
                      href={`/admin/orders/${o.id}`}
                      className={`block truncate rounded px-1.5 py-0.5 text-xs ${BAR_COLORS[o.status]}`}
                      title={`${o.order_number} · ${o.customers.name}`}
                    >
                      {o.customers.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

Run: `npm run build && npm run lint` — expected: pass.
Preview: dashboard shows real stats for seeded orders (check one by hand: revenue = sum of active orders with trip_start this month); calendar shows multi-day trip spanning days, month nav works, today ringed.

```bash
git add "app/admin/(panel)/page.tsx" "app/admin/(panel)/calendar"
git commit -m "Add dashboard stats and trip calendar"
```

---

### Task 12: Robots disallow, final sweep

**Files:**
- Modify: `app/robots.txt/route.ts`

- [ ] **Step 1: Disallow /admin in robots**

In `app/robots.txt/route.ts`, change the body to add one line after `Disallow: /api/`:

```
Disallow: /api/
Disallow: /admin/
```

- [ ] **Step 2: Full verification pass**

Run: `npm run build && npm run lint` — expected: pass, zero warnings introduced by this work.
Preview sweep:
1. Public site unaffected: `/`, `/tours`, `/contact` render with navbar/footer; no admin links anywhere public.
2. Logged out: every `/admin/*` URL redirects to login.
3. Logged in: full happy path — create customer+order → record deposit payment → print job order → create + print invoice → see order on calendar + dashboard → check outstanding list shows the balance.
4. `curl localhost:3000/robots.txt` contains `Disallow: /admin/`.
5. View-source on `/admin/login`: `noindex` robots meta present.

- [ ] **Step 3: Commit**

```bash
git add app/robots.txt/route.ts
git commit -m "Disallow /admin in robots.txt"
```

---

## Known accepted limitations (v1, per spec)

- Order/invoice numbering uses count-then-insert; concurrent creation by two admins in the same instant can collide — the unique constraint rejects the second insert with a visible error. Acceptable for a small team; retry by resubmitting.
- Invoice bank details are a constant in `InvoiceDoc.tsx` (marked `TODO-OPS`) — must be set to the real account before first real invoice.
- Stats computed client-side over all orders; fine for hundreds of orders, revisit if volume grows.
- No order deletion in UI — use status `cancelled`. (Deleting would orphan issued invoice numbers.)
