# Admin: Operation / Marketing split login + role routing

Date: 2026-06-14
Branch: admin-dashboard

## Goal

One login page with an `[ Operation Team ] [ Marketing Team ]` tab separator.
After sign-in, route the user to the panel matching their account role.
Operation = existing admin (unchanged). Marketing = new panel skeleton.

## Scope (this task)

- Login page tab separator (Operation / Marketing).
- Role-based auth guard on the admin panel.
- Marketing panel skeleton with empty tab shells.

Out of scope (follow-ups): Blog/SEO editor, Leads view, Instagram
generator / caption generator / content planner logic.

## Design

### 1. Role storage

Role lives in Supabase `user.app_metadata.role`:
- `"operation"` | `"marketing"`.
- `app_metadata` is server-set, carried in the JWT — user cannot edit it,
  no extra DB query needed.
- Missing role => treated as `"operation"` (back-compat for existing accounts).

Helper: `lib/admin/role.ts` exporting `type AdminRole` and
`getRole(user)` returning the normalized role.

### 2. Login page (`/admin/login`)

- Add a tab separator at the top: `[ Operation Team ] [ Marketing Team ]`.
- Tabs are a **UI hint only**. Both submit the same Supabase password
  sign-in. Heading text / accent change per selected tab.
- After successful sign-in, the app reads the real role and routes by it
  (clicked tab is ignored for access). Clicking the "wrong" tab cannot
  grant access.

### 3. Auth + role guard (new)

`app/admin/(panel)/layout.tsx` becomes a server component:
- No user => `redirect("/admin/login")`.
- Has user => read role, pass it to the panel.

This is the first real auth guard on the panel (previously unprotected).

### 4. Two panels, one shell

Reuse `AdminShell`. The tab set is chosen by role:
- **Operation**: existing 7 tabs (Dashboard, Order, Daftar Harga, Invoice,
  Itinerary, Kalender, Customer) — unchanged.
- **Marketing**: new tabs, empty shells this task — Blog/SEO, Leads,
  Instagram Studio.

`(panel)/page.tsx` refactor: split TABS into `OPERATION_TABS` and
`MARKETING_TABS`; the page picks the set by a `role` prop from the layout.

Marketing placeholder views live in `components/admin/views/marketing/`.

## Testing

No test suite configured. Verify by `npm run build` + manual:
- operation account => operation tabs.
- marketing account => marketing tabs.
- logged out => redirect to login.
