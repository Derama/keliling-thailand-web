# Admin Operational Dashboard — Design

Date: 2026-06-13
Status: Approved

## Goal

Private operational dashboard for the Keliling Thailand team at `/admin`: manage orders, generate job orders and invoices, track payments, quick margin calculations, and see business statistics. Lives inside the existing Next.js 16 app, backed by Supabase (Postgres + Auth).

## Scope decisions (from brainstorming)

- **Backend:** Supabase (free tier). Postgres + Supabase Auth.
- **Users:** small team, equal access. Email+password accounts created manually in the Supabase dashboard; public signup disabled. No roles.
- **Order entry:** manual, by admins, after deals close on WhatsApp. No customer-facing booking.
- **Margin calculator:** standalone scratchpad tool; saves nothing.
- **Profit data:** each order stores `price_idr`, `cost_thb` (single total, no breakdown), and `fx_rate`. Profit is computed.
- **Documents:** job orders and invoices are print-friendly branded pages; PDF via browser print. No PDF generation library.
- **Currency:** customers pay IDR; costs are THB. Each order stores a manual `fx_rate` (IDR per 1 THB), pre-fillable from a live rate API.
- **Extras in v1:** payment tracking, trip calendar, customer list, exchange-rate helper.
- **Architecture:** `/admin` route group inside this repo (approach A). One deploy, shared brand styling.

## Auth + Routing

- Packages: `@supabase/supabase-js`, `@supabase/ssr`.
- `app/admin/login/page.tsx` — email+password login form, brand-styled, no marketing navbar.
- Next.js middleware (`proxy.ts` in Next 16) protects `/admin/*` server-side: no Supabase session cookie → redirect to `/admin/login`.
- `app/admin/layout.tsx` — admin-only layout: sidebar nav (Dashboard, Orders, Calculator, Calendar, Customers) + logout. Marketing `Navbar`/`Footer` excluded.
- Row Level Security on every table: `authenticated` role only, full read/write (team has equal rights). The public anon key ships in the client; RLS is the security boundary.
- All `/admin` pages: `noindex`, excluded from sitemap.
- Admin UI language: single language (Indonesian), not wired into `lib/translations.ts` — admin strings are not user-facing site content.

## Data Model

### customers
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | required |
| phone | text | WhatsApp number |
| origin_city | text | optional |
| notes | text | optional |
| created_at | timestamptz | default now |

### orders
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| order_number | text unique | auto `KT-YYMM-NN`, app-generated |
| customer_id | uuid fk → customers | required |
| status | enum | `inquiry`, `confirmed`, `ongoing`, `completed`, `cancelled` |
| trip_start | date | |
| trip_end | date | |
| pax | int | |
| pickup_location | text | |
| vehicle | text | free text |
| driver_name | text | free text |
| itinerary | text | multiline, appears on job order |
| price_idr | numeric | what customer pays |
| cost_thb | numeric | total operating cost, single number |
| fx_rate | numeric | IDR per 1 THB, manual, pre-fillable from live rate |
| notes | text | |
| created_at / updated_at | timestamptz | |

Profit computed in app (not stored): `profit_thb = price_idr / fx_rate − cost_thb`; `profit_idr = profit_thb × fx_rate`.

### payments
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| order_id | uuid fk → orders | |
| amount_idr | numeric | |
| paid_at | date | |
| method | text | e.g. transfer BCA, cash |
| note | text | |

Multiple rows per order (deposit, balance, installments). Paid status derived: `sum(amount_idr)` vs `price_idr`. Outstanding = confirmed/ongoing/completed orders where paid < price.

### invoices
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| invoice_number | text unique | `KT-INV-YYMM-NN` |
| order_id | uuid fk → orders | |
| type | enum | `deposit`, `balance`, `full` |
| amount_idr | numeric | |
| line_items | jsonb | snapshot: `[{description, amount_idr}]` |
| issued_at | date | |

Invoices snapshot data at issue time — later order edits don't change issued invoices.

No tables for job-order docs (rendered live from order), margin calculator (ephemeral), or stats (computed queries).

## Pages

| Route | Content |
|---|---|
| `/admin` | Dashboard: stat cards (trips, revenue IDR, cost THB, profit THB+IDR; this month vs last month), upcoming trips, outstanding payments |
| `/admin/login` | Login form |
| `/admin/orders` | Orders table; filter by status + month; search by customer name |
| `/admin/orders/new` | Order form. Customer: pick existing or create inline. FX helper next to `fx_rate` |
| `/admin/orders/[id]` | Order detail: edit form, payments log (add/delete), buttons → job order, create invoice |
| `/admin/orders/[id]/job-order` | Print-friendly branded doc: driver, vehicle, pickup, itinerary, pax, dates, customer name + phone. Print button |
| `/admin/orders/[id]/invoice/[invoiceId]` | Print-friendly invoice: number, line items, amount IDR, payments so far, balance, bank details. Print button |
| `/admin/calculator` | Standalone margin calculator: dynamic cost rows (label + THB), selling price IDR, fx rate with one-tap live fill; outputs margin in THB, IDR, % — nothing persisted |
| `/admin/calendar` | Month grid; trips as bars colored by status; click → order detail |
| `/admin/customers` | Customer list + detail (order history, total spent, `wa.me` link) |

### Exchange-rate helper
Server-fetched THB→IDR rate from a free API (e.g. `open.er-api.com`), cached ~1 hour. Shown beside `fx_rate` inputs with one-tap fill. If the API fails, the field stays manually editable — no hard dependency.

### Print documents
Branded with site colors (`#F5C518` / `#1B2A4A`), logo, `@media print` styles hide nav/buttons. PDF via browser print dialog (works on phone too).

## Error handling

- Supabase errors → inline form messages; no silent failures.
- FX API failure → manual rate entry unaffected.
- Middleware failure-closed: no valid session → redirect to login.

## Testing / verification

Repo has no test suite (project convention — keep). Verify with `npm run build`, `npm run lint`, and manual preview pass of every page (login, CRUD round-trip, doc printing, calculator math, calendar rendering).

## Out of scope (v1)

- Roles/permissions
- Customer-facing booking or payment
- Cost line-item breakdown per order
- Generated PDF files (server-side)
- Email/WhatsApp sending automation
- Multi-language admin UI
