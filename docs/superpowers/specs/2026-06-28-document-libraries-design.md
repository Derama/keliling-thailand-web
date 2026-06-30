# Invoice, Brochure, and Job Order Libraries

## Goal

Give Invoice, Brochure, and Job Order the same visible saved-document workflow as Itinerary: a dedicated library list with New, Open, Duplicate, and Delete actions, while keeping order-created documents synchronized into those libraries.

## User Experience

The existing admin tabs for Invoice, Brochure, and Job Order open a library list instead of opening a blank builder immediately. Each list shows the document title, useful document metadata, associated order number when present, and last-saved time.

Users can:

- create a new standalone document;
- open and continue editing a saved document;
- duplicate a saved document into an independent copy;
- delete a saved document after confirmation;
- return from the builder to the refreshed library list.

Documents edited inside an Order continue saving to `order_documents` and automatically mirror into the corresponding library. Selecting a saved document from an order copies its content into the order but preserves the order's own mirror identity.

## Architecture

### Shared storage

Reuse `document_templates` for all three document kinds. A migration extends its `kind` constraint from `invoice | joborder` to `invoice | joborder | brochure`. The existing `order_number` field remains optional metadata for order-created rows.

`lib/admin/docLibrary.ts` extends `TemplateKind` with `brochure` and remains the single CRUD boundary for these libraries.

### Shared library view

Create a reusable document-library view responsible for:

- loading rows for one document kind;
- rendering consistent list, empty, loading, and error states;
- creating, opening, duplicating, and deleting rows;
- handing the selected row to the appropriate builder;
- reloading the list when the builder exits.

Thin Invoice, Brochure, and Job Order wrappers provide labels, row metadata, empty draft factories, and their builder component. The existing Itinerary library remains unchanged because it uses the dedicated `itineraries` table.

### Builder library mode

Invoice, Brochure, and Job Order builders accept an optional library row id and exit callback.

In library mode, a builder:

- loads the selected `document_templates` row;
- edits the row's title and document draft;
- saves changes back to the same row;
- does not create or update an accounting invoice or order document;
- shows a back-to-library action.

In order mode, current order persistence remains intact. Invoice and Job Order retain their existing mirror logic. Brochure gains equivalent mirror logic so each order brochure creates one library row and subsequently updates it.

## Data Integrity

- Library duplicates receive new ids and no inherited order number.
- Loading a library document inside an order preserves the order's existing library mirror id.
- Deleting a library row does not delete an order or its `order_documents` draft.
- A missing or deleted library row shows an actionable error and returns safely to the list.
- Existing Invoice and Job Order template rows remain valid after the migration.

## Admin Navigation

The existing tab labels remain unchanged:

- Buat Invoice
- Brosur
- Job Order

Each tab now renders its library wrapper. The selected builder temporarily replaces the list until the user returns.

## Verification

- Migration accepts brochure rows and preserves existing rows.
- CRUD helper lists, creates, loads, saves, and deletes each supported kind.
- Each library supports New, Open, Duplicate, Delete, and return-to-list.
- Standalone library editing updates the selected row only.
- Order-created Invoice, Brochure, and Job Order rows appear automatically.
- Loading a saved row into an order preserves that order's mirror identity.
- Existing PDF/print behavior remains unchanged.
- Relevant tests, lint, and production build pass.
