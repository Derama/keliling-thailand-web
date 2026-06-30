# Custom Price Services Design

## Goal

Allow an authenticated admin to add, edit, and delete custom transport routes from **Daftar Harga**, matching the existing create flows for hotels, tickets, and additional charges. A saved custom route must also appear in the invoice service catalog.

## Current State

- Hotels are persisted in `hotel_rates` and can already be added and deleted.
- Tickets are persisted in `attraction_rates` and can already be added and deleted.
- Additional charges are persisted in `add_ons` and custom rows can already be added and deleted.
- Transport prices are persisted in `transport_rates`, but route definitions come from the static `PRICE_BOOK`. The table therefore stores overrides for built-in routes but cannot define a new route.

## Data Model

Add a `custom_transport_routes` table with one row per custom route:

- `id`: UUID primary key.
- `group_name`: required display group, such as `Airport Pickup`.
- `name`: required route name, such as `BKK → Rayong`.
- `altis_cost`, `altis_sell`: non-negative numeric prices.
- `suv_cost`, `suv_sell`: non-negative numeric prices.
- `van_cost`, `van_sell`: non-negative numeric prices.
- `sort`: integer used for stable display ordering.
- `created_at` and `updated_at`: timestamps.

Row-level security grants authenticated team members full access, consistent with the existing price tables. Keeping all six prices on the route row makes create, rename, price editing, and deletion single-row operations.

## Domain Integration

Introduce a `CustomTransportRoute` type and pure adapters in `lib/admin/priceBook.ts`:

- Convert a custom database row into the existing `Service` price shape.
- Merge custom routes into existing `ServiceGroup[]`, matching `group_name` to an existing group when possible and appending new groups in stable sort order.
- Keep built-in route lookup and transport price overrides unchanged.

The adapter is the shared boundary for Daftar Harga and the invoice catalog. This prevents the UI and catalog from implementing different grouping or price rules.

## Daftar Harga UI

The Transport tab continues to show built-in routes and their editable overrides. Custom routes appear in the same grouped route tables.

Add a **Tambah rute baru** form below the transport tables with:

- Group/category name, with suggestions from existing groups.
- Route name.
- Cost and selling price for Altis.
- Cost and selling price for SUV.
- Cost and selling price for Van.
- Submit button with a busy state.

Group and route names are required. Price fields default to zero and reject negative values. The form is cleared only after a successful insert; on failure it retains the entered values and displays the database error.

Custom route rows support:

- Inline editing of group name, route name, and all six prices.
- Saving changes through the existing Transport save action.
- Deletion after confirmation.

Built-in routes remain non-deletable and retain their static names and groups. If a custom route group is renamed, the route moves to the matching/new group after a successful save.

## Invoice Catalog

`useCatalog` loads `custom_transport_routes` alongside transport price overrides. It merges custom routes into the existing route groups before building vehicle-specific catalog items. Each custom route therefore produces Altis, SUV, and Van catalog entries with the same labels and customer/cost prices as built-in routes.

Database errors while loading custom routes must not remove built-in catalog items. The hook keeps its existing loading/error behavior and treats absent custom rows as an empty list.

## Existing Service Types

The hotel, ticket, and additional-charge add flows remain in place. No generic cross-category service table is introduced because their pricing structures differ and the current dedicated tables already support the requested behavior.

## Testing

Use test-first coverage for pure domain behavior:

- A custom route converts into the expected three vehicle prices.
- A custom route joins an existing group by exact group name.
- A custom route with a new group creates a new service group.
- Multiple custom routes preserve stable sort order.
- Built-in route overrides remain intact when custom routes are merged.
- Catalog conversion exposes each custom route for Altis, SUV, and Van.

Run the focused tests first, then lint and the production build. Manually verify Daftar Harga at desktop and narrow viewport widths if the local authenticated admin environment is available.

## Out of Scope

- Replacing the separate hotel, ticket, and add-on tables with a generic services table.
- Deleting or renaming built-in routes.
- Reordering routes with drag and drop.
- Public website changes.
