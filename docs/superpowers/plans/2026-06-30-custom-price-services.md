# Custom Price Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins create, edit, and delete custom transport routes in Daftar Harga and use those routes from the invoice service catalog.

**Architecture:** Store each custom route as one Supabase row containing its group, label, and six fleet price values. A focused domain module converts and merges these rows into the existing `ServiceGroup` model; both Daftar Harga and the invoice catalog consume that same adapter. Existing hotel, ticket, add-on, and built-in transport behavior stays intact.

**Tech Stack:** Next.js 16.2 App Router, React 19 client components, TypeScript, Supabase/Postgres, Tailwind CSS 4, Node test runner.

---

## File Map and Working-Tree Constraint

- Create `scripts/migrations/016-custom-transport-routes.sql`: table, validation checks, indexes, and authenticated RLS policy.
- Create `lib/admin/customTransportRoutes.ts`: custom route type, field helpers, and pure merge adapter.
- Create `lib/admin/customTransportRoutes.test.mjs`: domain and migration tests.
- Create `lib/admin/invoiceCatalog.ts`: pure route-to-catalog conversion.
- Create `lib/admin/invoiceCatalog.test.mjs`: catalog conversion tests.
- Create `components/admin/AddTransportRouteForm.tsx`: controlled add-route form with failure-safe clearing.
- Modify `components/admin/views/PriceListView.tsx`: fetch, create, edit, save, delete, and render custom routes.
- Modify `components/admin/invoice/useCatalog.ts`: fetch custom routes and merge them into route catalog sections.

`PriceListView.tsx`, `useCatalog.ts`, and `priceBook.ts` already contain uncommitted user work. Do not overwrite it, stage it wholesale, or revert it. Keep the new domain logic in new files; apply narrow integration patches to existing files. Commit new files independently, but leave overlapping pre-existing dirty files uncommitted unless the user explicitly authorizes including their earlier changes.

### Task 1: Add the persistent custom-route schema

**Files:**
- Create: `scripts/migrations/016-custom-transport-routes.sql`
- Create: `lib/admin/customTransportRoutes.test.mjs`

- [ ] **Step 1: Write a failing schema contract test**

Create the test file with a source-level migration contract before the migration exists:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../scripts/migrations/016-custom-transport-routes.sql",
  import.meta.url
);

test("custom routes use one validated row with authenticated RLS", async () => {
  const sql = await readFile(migrationUrl, "utf8").catch(() => "");

  assert.match(sql, /create table if not exists custom_transport_routes/i);
  for (const column of [
    "group_name",
    "name",
    "altis_cost",
    "altis_sell",
    "suv_cost",
    "suv_sell",
    "van_cost",
    "van_sell",
    "sort",
  ]) {
    assert.match(sql, new RegExp(`\\b${column}\\b`, "i"));
  }
  assert.match(sql, /check \(char_length\(trim\(group_name\)\) > 0\)/i);
  assert.match(sql, /check \(char_length\(trim\(name\)\) > 0\)/i);
  assert.match(sql, /alter table custom_transport_routes enable row level security/i);
  assert.match(sql, /for all to authenticated using \(true\) with check \(true\)/i);
  assert.doesNotMatch(sql, /drop table/i);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
rtk node --test lib/admin/customTransportRoutes.test.mjs
```

Expected: FAIL because the migration file is absent and the SQL string is empty.

- [ ] **Step 3: Add the migration**

Create `scripts/migrations/016-custom-transport-routes.sql`:

```sql
-- Migration: user-defined transport routes and per-fleet prices.
-- Run once in the Supabase SQL Editor.

create table if not exists custom_transport_routes (
  id uuid primary key,
  group_name text not null check (char_length(trim(group_name)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  altis_cost numeric not null default 0 check (altis_cost >= 0),
  altis_sell numeric not null default 0 check (altis_sell >= 0),
  suv_cost numeric not null default 0 check (suv_cost >= 0),
  suv_sell numeric not null default 0 check (suv_sell >= 0),
  van_cost numeric not null default 0 check (van_cost >= 0),
  van_sell numeric not null default 0 check (van_sell >= 0),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_transport_routes_sort_idx
  on custom_transport_routes (sort, created_at);

alter table custom_transport_routes enable row level security;

drop policy if exists "team full access" on custom_transport_routes;
create policy "team full access" on custom_transport_routes
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 4: Run the schema test and verify GREEN**

Run:

```bash
rtk node --test lib/admin/customTransportRoutes.test.mjs
```

Expected: 1 test passes.

- [ ] **Step 5: Commit only the new schema contract**

```bash
rtk git add scripts/migrations/016-custom-transport-routes.sql lib/admin/customTransportRoutes.test.mjs
rtk git commit -m "feat: add custom transport route schema"
```

### Task 2: Merge custom routes into the existing price-book model

**Files:**
- Create: `lib/admin/customTransportRoutes.ts`
- Modify: `lib/admin/customTransportRoutes.test.mjs`
- Read before editing: `lib/admin/priceBook.ts`

- [ ] **Step 1: Add failing adapter tests**

Append these imports and cases to `lib/admin/customTransportRoutes.test.mjs`:

```js
import {
  customRouteToService,
  mergeCustomTransportRoutes,
} from "./customTransportRoutes.ts";

const rayong = {
  id: "11111111-1111-4111-8111-111111111111",
  group_name: "Airport Pickup",
  name: "BKK → Rayong",
  altis_cost: 1500,
  altis_sell: 2100,
  suv_cost: 1800,
  suv_sell: 2400,
  van_cost: 2200,
  van_sell: 2900,
  sort: 20,
};

test("converts one custom route into the existing fleet price shape", () => {
  const service = customRouteToService(rayong);
  assert.equal(service.id, rayong.id);
  assert.equal(service.name, "BKK → Rayong");
  assert.deepEqual(service.prices, {
    altis: { cost: 1500, sell: 2100 },
    suv: { cost: 1800, sell: 2400 },
    van: { cost: 2200, sell: 2900 },
  });
  assert.deepEqual(service.customRoute, rayong);
});

test("joins an exact existing group without changing built-in services", () => {
  const builtIn = [
    {
      group: "Airport Pickup",
      services: [
        {
          id: "base",
          name: "DMK → Bangkok",
          prices: {
            altis: { cost: 901, sell: 1301 },
            suv: { cost: 1001, sell: 1501 },
            van: { cost: 1201, sell: 1801 },
          },
        },
      ],
    },
  ];
  const merged = mergeCustomTransportRoutes(builtIn, [rayong]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].services[0].id, "base");
  assert.deepEqual(merged[0].services[0].prices.altis, {
    cost: 901,
    sell: 1301,
  });
  assert.equal(merged[0].services[1].id, rayong.id);
});

test("creates new groups and preserves custom route sort order", () => {
  const later = { ...rayong, id: "later", group_name: "Private Transfer", sort: 30 };
  const earlier = { ...rayong, id: "earlier", group_name: "Private Transfer", sort: 10 };
  const merged = mergeCustomTransportRoutes([], [later, earlier]);
  assert.deepEqual(merged, [
    {
      group: "Private Transfer",
      services: [
        customRouteToService(earlier),
        customRouteToService(later),
      ],
    },
  ]);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
rtk node --test lib/admin/customTransportRoutes.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `customTransportRoutes.ts`.

- [ ] **Step 3: Implement the focused domain module**

Create `lib/admin/customTransportRoutes.ts`:

```ts
import type {
  FleetKey,
  Service,
  ServiceGroup,
  VehiclePrice,
} from "@/lib/admin/priceBook";

export interface CustomTransportRoute {
  id: string;
  group_name: string;
  name: string;
  altis_cost: number;
  altis_sell: number;
  suv_cost: number;
  suv_sell: number;
  van_cost: number;
  van_sell: number;
  sort: number;
  created_at?: string;
  updated_at?: string;
}

export type CustomRouteNumericField =
  | "altis_cost"
  | "altis_sell"
  | "suv_cost"
  | "suv_sell"
  | "van_cost"
  | "van_sell";

export type CustomRoutePatch = Partial<
  Pick<
    CustomTransportRoute,
    "group_name" | "name" | CustomRouteNumericField
  >
>;

export function customRoutePrice(
  route: CustomTransportRoute,
  fleet: FleetKey
): VehiclePrice {
  return {
    cost: Number(route[`${fleet}_cost` as CustomRouteNumericField]),
    sell: Number(route[`${fleet}_sell` as CustomRouteNumericField]),
  };
}

export function customRouteToService(route: CustomTransportRoute): Service {
  return {
    id: route.id,
    name: route.name,
    customRoute: route,
    prices: {
      altis: customRoutePrice(route, "altis"),
      suv: customRoutePrice(route, "suv"),
      van: customRoutePrice(route, "van"),
    },
  };
}

export function mergeCustomTransportRoutes(
  groups: ServiceGroup[],
  customRoutes: CustomTransportRoute[]
): ServiceGroup[] {
  const merged = groups.map((group) => ({
    ...group,
    services: [...group.services],
  }));
  const byName = new Map(merged.map((group) => [group.group, group]));

  for (const route of [...customRoutes].sort((a, b) => a.sort - b.sort)) {
    let group = byName.get(route.group_name);
    if (!group) {
      group = { group: route.group_name, services: [] };
      merged.push(group);
      byName.set(route.group_name, group);
    }
    group.services.push(customRouteToService(route));
  }

  return merged;
}
```

Add the optional domain marker to `Service` in `lib/admin/priceBook.ts` using a type-only import to avoid runtime coupling:

```ts
import type { CustomTransportRoute } from "@/lib/admin/customTransportRoutes";

export interface Service {
  id: string;
  name: string;
  contact?: boolean;
  prices?: Record<FleetKey, VehiclePrice>;
  customRoute?: CustomTransportRoute;
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run:

```bash
rtk node --test lib/admin/customTransportRoutes.test.mjs
```

Expected: all custom-route tests pass.

- [ ] **Step 5: Commit only safely isolated files**

Commit `customTransportRoutes.ts` and the tests. Do not stage the already-dirty `priceBook.ts`; keep its small type integration visible in the working tree for user review.

```bash
rtk git add lib/admin/customTransportRoutes.ts lib/admin/customTransportRoutes.test.mjs
rtk git commit -m "feat: merge custom routes into price book"
```

### Task 3: Build testable route catalog sections

**Files:**
- Create: `lib/admin/invoiceCatalog.ts`
- Create: `lib/admin/invoiceCatalog.test.mjs`
- Modify: `components/admin/invoice/useCatalog.ts`

- [ ] **Step 1: Write the failing catalog test**

Create `lib/admin/invoiceCatalog.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { buildRouteCatalogSections } from "./invoiceCatalog.ts";

test("expands a priced route into Altis, SUV, and Van catalog items", () => {
  const sections = buildRouteCatalogSections([
    {
      group: "Private Transfer",
      services: [
        {
          id: "rayong",
          name: "BKK → Rayong",
          prices: {
            altis: { cost: 1500, sell: 2100 },
            suv: { cost: 1800, sell: 2400 },
            van: { cost: 2200, sell: 2900 },
          },
        },
      ],
    },
  ]);

  assert.deepEqual(
    sections[0].items.map(({ key, label, capital, sell }) => ({
      key,
      label,
      capital,
      sell,
    })),
    [
      { key: "route-rayong-altis", label: "BKK → Rayong · Altis", capital: 1500, sell: 2100 },
      { key: "route-rayong-suv", label: "BKK → Rayong · SUV", capital: 1800, sell: 2400 },
      { key: "route-rayong-van", label: "BKK → Rayong · Van", capital: 2200, sell: 2900 },
    ]
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
rtk node --test lib/admin/invoiceCatalog.test.mjs
```

Expected: FAIL because `invoiceCatalog.ts` does not exist.

- [ ] **Step 3: Extract the pure route catalog conversion**

Create `lib/admin/invoiceCatalog.ts` with `CatalogItem`, `CatalogSection`, and `buildRouteCatalogSections(groups)`. Move the exact current route-expansion behavior from `useCatalog.ts` into this function:

```ts
import {
  type ServiceGroup,
} from "@/lib/admin/priceBook";

const FLEETS = [
  ["altis", "Altis"],
  ["suv", "SUV"],
  ["van", "Van"],
] as const;

export interface CatalogItem {
  key: string;
  group: string;
  label: string;
  capital: number;
  sell: number;
  serviceType: string;
  unit?: string;
}

export interface CatalogSection {
  group: string;
  items: CatalogItem[];
}

export function buildRouteCatalogSections(
  routeGroups: ServiceGroup[]
): CatalogSection[] {
  const sections: CatalogSection[] = [];
  for (const group of routeGroups) {
    const items: CatalogItem[] = [];
    for (const service of group.services) {
      if (service.contact === true || !service.prices) continue;
      for (const [fleet, fleetLabel] of FLEETS) {
        const price = service.prices[fleet];
        items.push({
          key: `route-${service.id}-${fleet}`,
          group: group.group,
          label: `${service.name} · ${fleetLabel}`,
          capital: price.cost,
          sell: price.sell,
          serviceType: fleetLabel,
        });
      }
    }
    if (items.length) sections.push({ group: group.group, items });
  }
  return sections;
}
```

In `useCatalog.ts`, import the types and helper, remove the duplicate interfaces and route loop, then initialize the catalog with:

```ts
const out: CatalogSection[] = buildRouteCatalogSections(routeGroups);
```

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
rtk node --test lib/admin/invoiceCatalog.test.mjs lib/admin/customTransportRoutes.test.mjs
```

Expected: all tests pass.

- [ ] **Step 5: Commit the isolated catalog module and test**

Do not stage the already-dirty `useCatalog.ts`.

```bash
rtk git add lib/admin/invoiceCatalog.ts lib/admin/invoiceCatalog.test.mjs
rtk git commit -m "refactor: isolate route catalog conversion"
```

### Task 4: Add the failure-safe new-route form

**Files:**
- Create: `components/admin/AddTransportRouteForm.tsx`
- Read before editing: `components/admin/AddPriceRowForm.tsx`

- [ ] **Step 1: Define the form contract**

The component accepts existing group suggestions and an async callback that reports persistence success. Use this exact public shape:

```ts
export interface NewTransportRouteInput {
  group_name: string;
  name: string;
  altis_cost: number;
  altis_sell: number;
  suv_cost: number;
  suv_sell: number;
  van_cost: number;
  van_sell: number;
}

export interface AddTransportRouteFormProps {
  groups: string[];
  onAdd: (input: NewTransportRouteInput) => Promise<boolean>;
}
```

- [ ] **Step 2: Implement the client form**

Create a client component using `Field`, `inputCls`, and `btnCls`. Keep state as strings while editing, require trimmed group/name values, set every number input to `min="0"`, and convert blank prices to zero at submission. The submit sequence must be:

```ts
setBusy(true);
const saved = await onAdd({
  group_name: groupName.trim(),
  name: name.trim(),
  altis_cost: Number(altisCost) || 0,
  altis_sell: Number(altisSell) || 0,
  suv_cost: Number(suvCost) || 0,
  suv_sell: Number(suvSell) || 0,
  van_cost: Number(vanCost) || 0,
  van_sell: Number(vanSell) || 0,
});
setBusy(false);
if (!saved) return;
setGroupName("");
setName("");
setAltisCost("");
setAltisSell("");
setSuvCost("");
setSuvSell("");
setVanCost("");
setVanSell("");
```

Lay the fields out as a compact responsive section: group and route name first, then three fleet pairs, then the submit button. Reuse the yellow add-form treatment already established by `AddPriceRowForm` rather than introducing a new modal.

- [ ] **Step 3: Run lint on the component**

```bash
rtk npx eslint components/admin/AddTransportRouteForm.tsx
```

Expected: exit code 0.

- [ ] **Step 4: Commit the isolated form**

```bash
rtk git add components/admin/AddTransportRouteForm.tsx
rtk git commit -m "feat: add custom route price form"
```

### Task 5: Integrate custom routes into Daftar Harga

**Files:**
- Modify: `components/admin/views/PriceListView.tsx`
- Modify: `lib/admin/priceBook.ts` only for the optional `customRoute` marker described in Task 2.

- [ ] **Step 1: Add imports and lifted state**

Import `AddTransportRouteForm` plus the custom route adapter/types. In `PriceListView`, add:

```ts
const [customRoutes, setCustomRoutes] = useState<CustomTransportRoute[]>([]);
const transportGroups = mergeCustomTransportRoutes(
  applyTransportRates(transportRows),
  customRoutes
);
```

Pass `customRoutes` and `setCustomRoutes` into `TransportRatesSection`.

- [ ] **Step 2: Fetch persisted custom routes**

Inside `TransportRatesSection`'s existing load effect, fetch both tables with `Promise.all`. Preserve built-in routes even if the custom table returns no data:

```ts
Promise.all([
  supabase.from("transport_rates").select("*").order("sort", { ascending: true }),
  supabase.from("custom_transport_routes").select("*").order("sort", { ascending: true }),
]).then(([ratesResult, customResult]) => {
  if (ratesResult.error) setError(ratesResult.error.message);
  else setRows(mergeTransportRates((ratesResult.data as TransportRate[]) ?? []));

  if (customResult.error) setError(customResult.error.message);
  else setCustomRoutes((customResult.data as CustomTransportRoute[]) ?? []);
});
```

- [ ] **Step 3: Add local custom-route patching**

Use one patch function for metadata and fleet prices:

```ts
function patchCustomRoute(id: string, patch: CustomRoutePatch) {
  setCustomRoutes((routes) =>
    routes.map((route) => (route.id === id ? { ...route, ...patch } : route))
  );
  setDirty(true);
  setSaved(false);
}
```

For price cells, derive the field names from the fleet:

```ts
onCostChange={(raw) =>
  patchCustomRoute(service.id, {
    [`${fleet}_cost`]: Number(raw) || 0,
  } as CustomRoutePatch)
}
```

Use the corresponding `${fleet}_sell` field for selling price.

- [ ] **Step 4: Save both built-in overrides and custom rows**

Extend `save()` with two explicit upserts and show the first failure:

```ts
const [ratesResult, customResult] = await Promise.all([
  supabase.from("transport_rates").upsert(transportPayload),
  supabase.from("custom_transport_routes").upsert(
    customRoutes.map((route) => ({
      ...route,
      group_name: route.group_name.trim(),
      name: route.name.trim(),
      updated_at: new Date().toISOString(),
    }))
  ),
]);
const saveError = ratesResult.error ?? customResult.error;
```

Only clear `dirty` and show `Tersimpan ✓` when `saveError` is null.

- [ ] **Step 5: Add a custom route and retain input on failure**

Implement the callback passed to the add form:

```ts
async function addCustomRoute(input: NewTransportRouteInput) {
  const row: CustomTransportRoute = {
    id: crypto.randomUUID(),
    ...input,
    sort: customRoutes.reduce((max, route) => Math.max(max, route.sort), 0) + 10,
  };
  setError(null);
  const { error } = await createClient()
    .from("custom_transport_routes")
    .insert(row);
  if (error) {
    setError(error.message);
    return false;
  }
  setCustomRoutes((routes) => [...routes, row]);
  return true;
}
```

Render `<AddTransportRouteForm>` after the grouped tables with unique existing group names.

- [ ] **Step 6: Delete only custom routes**

Add a confirmation and database delete:

```ts
async function deleteCustomRoute(id: string) {
  if (!confirm("Hapus rute custom ini?")) return;
  const { error } = await createClient()
    .from("custom_transport_routes")
    .delete()
    .eq("id", id);
  if (error) setError(error.message);
  else setCustomRoutes((routes) => routes.filter((route) => route.id !== id));
}
```

In `RoutePriceTable`, show group/name inputs and a `Hapus` action only when `service.customRoute` exists. Built-in routes keep static labels and no delete action.

- [ ] **Step 7: Run focused tests and lint**

```bash
rtk node --test lib/admin/customTransportRoutes.test.mjs lib/admin/invoiceCatalog.test.mjs
rtk npx eslint components/admin/views/PriceListView.tsx components/admin/AddTransportRouteForm.tsx lib/admin/customTransportRoutes.ts lib/admin/priceBook.ts
```

Expected: all tests pass and ESLint exits 0.

- [ ] **Step 8: Preserve overlapping user work**

Inspect the integration diff without staging the already-dirty files:

```bash
rtk git diff -- components/admin/views/PriceListView.tsx lib/admin/priceBook.ts
```

Expected: the custom-route integration appears alongside the user's existing responsive-price-list work. Leave these files uncommitted pending explicit approval.

### Task 6: Load custom routes into the invoice catalog

**Files:**
- Modify: `components/admin/invoice/useCatalog.ts`

- [ ] **Step 1: Add custom-route state and fetch**

Import `CustomTransportRoute` and `mergeCustomTransportRoutes`, then add:

```ts
const [customRoutes, setCustomRoutes] = useState<CustomTransportRoute[]>([]);
```

Add this query next to the existing transport query:

```ts
supabase
  .from("custom_transport_routes")
  .select("*")
  .order("sort", { ascending: true })
```

Update the Promise result positions explicitly and set custom data with an empty fallback:

```ts
setCustomRoutes((custom.data as CustomTransportRoute[]) ?? []);
```

This ensures a missing/failed custom result cannot erase built-in route state.

- [ ] **Step 2: Merge before catalog conversion**

Replace the route-group initialization with:

```ts
const routeGroups = mergeCustomTransportRoutes(
  applyTransportRates(transportRates),
  customRoutes
);
const out: CatalogSection[] = buildRouteCatalogSections(routeGroups);
```

Include `customRoutes` in the `useMemo` dependency array.

- [ ] **Step 3: Run catalog tests and lint**

```bash
rtk node --test lib/admin/invoiceCatalog.test.mjs lib/admin/customTransportRoutes.test.mjs
rtk npx eslint components/admin/invoice/useCatalog.ts lib/admin/invoiceCatalog.ts
```

Expected: all tests pass and ESLint exits 0.

- [ ] **Step 4: Preserve the overlapping hook changes**

```bash
rtk git diff -- components/admin/invoice/useCatalog.ts
```

Expected: the query and merge integration are present. Leave the already-dirty hook uncommitted pending explicit approval.

### Task 7: Full verification and UI evidence

**Files:**
- Verify all files listed above.

- [ ] **Step 1: Run all Node tests**

```bash
rtk node --test lib/admin/*.test.mjs components/admin/*.test.mjs
```

Expected: all discovered tests pass.

- [ ] **Step 2: Run repository lint**

```bash
rtk npm run lint
```

Expected: exit code 0 with no new errors.

- [ ] **Step 3: Run the production build**

```bash
rtk npm run build
```

Expected: Next.js production build succeeds.

- [ ] **Step 4: Apply the migration in the configured Supabase project**

Use the project's established migration workflow. If no authenticated database tooling is configured locally, report `016-custom-transport-routes.sql` as a required deployment step rather than claiming end-to-end persistence is live.

- [ ] **Step 5: Verify Daftar Harga in a browser**

Run the approved local dev command and inspect `/admin` → `Daftar Harga` at desktop and narrow widths. Verify:

- The add form requires group and route name.
- A saved route appears in the selected group with three fleet prices.
- Editing group/name/prices survives refresh after save.
- Renaming the group moves the route to that group.
- Delete removes the route after confirmation.
- Built-in routes cannot be renamed or deleted.
- Existing hotel, ticket, and additional-charge creation still works.
- Horizontal table scrolling and touch targets remain usable on narrow screens.

- [ ] **Step 6: Verify invoice availability**

Open an invoice builder, search the catalog for the custom route name, and verify Altis, SUV, and Van entries use the saved cost and selling prices.

- [ ] **Step 7: Review the final diff and status**

```bash
rtk git diff --check
rtk git status --short
```

Expected: no whitespace errors; all unrelated pre-existing changes remain preserved. Report which feature files remain uncommitted because they overlap earlier user work.
