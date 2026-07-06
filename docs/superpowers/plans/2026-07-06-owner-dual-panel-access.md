# Owner Dual-Panel Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow one Supabase user with the `owner` role to access both `/admin` and `/rental` without cross-panel redirects.

**Architecture:** Centralize role decisions in two pure predicates in `lib/rental/role.ts`. Each server layout checks only its own predicate and redirects failures to that panel's login page.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase Auth, Node test runner

---

### Task 1: Define and test the access matrix

**Files:**
- Create: `lib/rental/role.test.mjs`
- Modify: `lib/rental/role.ts`

- [ ] **Step 1: Write the failing role-matrix test**

```js
import assert from "node:assert";
import { test } from "node:test";
import { canAccessAdmin, canAccessRental } from "./role.ts";

const user = (role) => ({ app_metadata: { role } });

test("owner can access both panels", () => {
  assert.strictEqual(canAccessAdmin(user("owner")), true);
  assert.strictEqual(canAccessRental(user("owner")), true);
});

test("admin can access only the admin panel", () => {
  assert.strictEqual(canAccessAdmin(user("admin")), true);
  assert.strictEqual(canAccessRental(user("admin")), false);
});

test("rental can access only the rental panel", () => {
  assert.strictEqual(canAccessAdmin(user("rental")), false);
  assert.strictEqual(canAccessRental(user("rental")), true);
});

test("missing and unknown roles cannot access either panel", () => {
  for (const candidate of [null, undefined, user(undefined), user("unknown")]) {
    assert.strictEqual(canAccessAdmin(candidate), false);
    assert.strictEqual(canAccessRental(candidate), false);
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test lib/rental/role.test.mjs`

Expected: FAIL because `canAccessAdmin` and `canAccessRental` are not exported.

- [ ] **Step 3: Implement the minimal predicates**

```ts
import type { User } from "@supabase/supabase-js";

export function canAccessAdmin(user: User | null | undefined): boolean {
  const role = user?.app_metadata?.role;
  return role === "admin" || role === "owner";
}

export function canAccessRental(user: User | null | undefined): boolean {
  const role = user?.app_metadata?.role;
  return role === "rental" || role === "owner";
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test lib/rental/role.test.mjs`

Expected: four tests pass and zero fail.

### Task 2: Apply independent panel guards

**Files:**
- Modify: `app/admin/(panel)/layout.tsx`
- Modify: `app/rental/(panel)/layout.tsx`

- [ ] **Step 1: Update the admin layout**

Import `canAccessAdmin`, keep unauthenticated users on `/admin/login`, and replace the `/rental` redirect with:

```ts
if (!canAccessAdmin(user)) redirect("/admin/login");
```

- [ ] **Step 2: Update the rental layout**

Import `canAccessRental`, keep unauthenticated users on `/rental/login`, and use:

```ts
if (!canAccessRental(user)) redirect("/rental/login");
```

- [ ] **Step 3: Verify all repository tests**

Run: `node --test $(find . -name '*.test.mjs' -not -path './node_modules/*')`

Expected: all tests pass and zero fail.

- [ ] **Step 4: Verify lint and production build**

Run: `npm run lint`

Expected: exit 0.

Run: `NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run build`

Expected: exit 0.

### Task 3: Activate the owner claim

**Files:**
- No repository files

- [ ] **Step 1: Set the account's server-controlled metadata**

Use the Supabase Admin API with the existing project URL, service-role key, and user ID:

```bash
curl -X PUT "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"app_metadata":{"role":"owner"}}'
```

Expected: the returned user has `app_metadata.role` equal to `owner`.

- [ ] **Step 2: Refresh and verify the session**

Sign out, sign in again with the one email account, open `/admin`, then open `/rental`.

Expected: both panels load and neither URL redirects to the other panel.
