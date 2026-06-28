# Itinerary Closing Contact Layout

## Goal

Make the contact information on the itinerary's closing page easier to scan and prevent names or telephone numbers from wrapping awkwardly in the generated A4 document.

## Design

- Render each named contact on its own full-width row.
- Keep the contact name and telephone number on one line when the A4 layout has its normal printable width.
- Use a consistent label column and tabular numerals for telephone numbers.
- Keep Instagram and Facebook as a compact two-column pair.
- Keep email and website as full-width rows because their values are longer.
- Preserve the current typography, colors, dividers, QR code, and company data.

## Scope

Only the closing-page contact grid and its row presentation in `components/admin/ItineraryDoc.tsx` will change. No contact values, itinerary-builder controls, other document pages, or unrelated styles will change.

## Verification

- Run the relevant automated checks and linting for the modified component.
- Render or inspect the itinerary closing page at its A4 preview width.
- Confirm both named contacts and their telephone numbers remain visually aligned and do not wrap unnecessarily.
