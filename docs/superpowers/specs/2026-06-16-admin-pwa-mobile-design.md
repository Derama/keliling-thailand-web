# Admin PWA + Mobile UI — Design

Date: 2026-06-16
Status: Approved

## Purpose

Make the existing `/admin` operations fully usable on a phone: installable to the
home screen (PWA) and with phone-friendly navigation and layouts. Desktop stays
as-is.

## Approach

Progressive enhancement of the current Next.js admin (tab-based SPA at
`app/admin/(panel)/page.tsx`). No new framework. Three layers:

1. PWA install (manifest + icons + apple meta).
2. Mobile navigation (bottom bar + "More" sheet) alongside the existing desktop
   top tabs.
3. Responsive table → card layouts for data-heavy views.

No data or Supabase logic changes — purely presentation + static manifest.

## 1. PWA install

- `app/manifest.ts` — Next 16 metadata route returning a `MetadataRoute.Manifest`:
  - `name`: "Keliling Thailand Admin"
  - `short_name`: "KT Admin"
  - `start_url`: "/admin"
  - `display`: "standalone"
  - `theme_color`: "#1B2A4A"
  - `background_color`: "#ffffff"
  - `icons`: 192×192 and 512×512 PNG (`purpose: "any"`), plus a 512 maskable.
- Icons generated from the Keliling brand logo (yellow circular mark) into
  `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- `app/layout.tsx` — add to the existing `metadata`/`viewport` exports:
  - `appleWebApp: { capable: true, statusBarStyle: "default", title: "KT Admin" }`
  - apple touch icon reference (`icons.apple`).
- Manifest is site-wide but `start_url` is `/admin`, so installing while on the
  admin lands back in the admin in standalone mode.

## 2. Mobile navigation

Current `page.tsx` owns `TABS`, `active` state, and `select()` with localStorage
persistence. Refactor so navigation is shared between desktop tabs and a new
mobile bottom bar without duplicating state.

- Extract the tab list to a module constant (e.g. `lib/admin/tabs.ts` exporting
  `TABS` metadata: `{ id, label }` only — Views stay in `page.tsx` to avoid
  importing client components into a shared module unnecessarily; if cleaner,
  keep `TABS` in `page.tsx` and pass `active`/`onSelect` down).
- Desktop (`≥ sm`): existing top tab strip, unchanged (`hidden sm:flex`).
- Phone (`< sm`): new `AdminBottomNav` client component, `fixed bottom-0`,
  `sm:hidden`:
  - 4 primary items: **Dashboard, Order, Job Order, Invoice**.
  - 5th item **"Lainnya" (More)** opens a bottom sheet listing the remaining
    tabs (Daftar Harga, Tempat, Itinerary, Kalender, Customer).
  - Tapping any item calls the same `select(id)` used by desktop.
  - Active item highlighted in brand yellow (`#F5C518`) on navy bar.
- Bottom sheet: simple fixed overlay + slide-up panel, closes on backdrop tap or
  selection. No external library.
- The admin main content (`AdminShell` `<main>`) gets `pb-20 sm:pb-0` plus
  `env(safe-area-inset-bottom)` padding so the bar never covers content. Bottom
  nav and sheet carry `no-print`.

## 3. Responsive views (table → card)

For each table-based view, render a stacked card list on phone and the table on
`≥ sm`:

- Pattern: `<table className="hidden sm:table …">` for desktop, plus a
  `<div className="sm:hidden space-y-2">` card list for phone. Each card shows
  the row's key fields as `label: value` stacked, preserving existing
  row-click/links.
- Views to convert: **OrdersView**, **CustomersView**, **PriceListView**.
  - PriceListView is large (555 lines); convert its main price table only, keep
    edit affordances reachable. If a full card conversion is too heavy, its dense
    grid may use `overflow-x-auto` as a documented fallback for that one view.
- DashboardView stat cards already responsive — verify only.
- Forms/builders (OrderForm, Invoice/Itinerary/JobOrder builders) already use
  `grid sm:grid-cols-2`; verify inputs are full-width and tappable on phone.
- Print docs (JobOrderDoc, InvoiceDoc/BuiltInvoiceDoc, ItineraryDoc): wrap the
  on-screen preview container in `overflow-x-auto` so the A4 width scrolls on a
  phone. Printing / Save-as-PDF already works from mobile browsers.

## Data flow / error handling

Unchanged. No new network calls. Manifest is static. Navigation state stays in
`page.tsx` via existing localStorage key `admin-tab`.

## Testing

No automated suite. Verification:
- `npm run build` passes (TypeScript + lint clean).
- Manual: narrow viewport to ~390px — bottom bar shows, More sheet opens, tabs
  switch; Orders/Customers/Prices show cards not cut-off tables; forms full-width;
  print previews scroll horizontally.
- Install check: open `/admin` on a phone, "Add to Home Screen", confirm it opens
  standalone with the brand icon.

## Out of scope

- Offline support / service worker caching (PWA install only, no offline).
- Push notifications.
- Native app.
- Any change to admin data, auth, or Supabase schema.
- Redesigning desktop layouts.

## Implementation phases (for the plan)

- **Phase A:** PWA (manifest, icons, apple meta) + bottom nav shell + safe-area
  padding.
- **Phase B:** Per-view table→card conversions + print preview scroll wrapper.
