# Fleet Complete Price Table Design

## Summary

Add a complete, brochure-inspired price list to the public **Armada & Harga**
page. The section appears directly below the four existing vehicle cards and
before the airport-transfer callout.

The approved direction is a set of compact grouped tables with dark navy
headers, warm cream surfaces, and gold accents. It should resemble the supplied
2026 brochure without copying its print layout literally.

## Goals

- Let customers compare all published route prices without contacting the team
  first.
- Show four vehicle types: Altis, SUV, Van, and Mini Bus.
- Group services into Airport Transfer, Daily Return Tours, and Drop-off /
  Northern Thailand.
- Replace missing prices with a concise contact-team message.
- Preserve the existing multilingual experience in Indonesian, English, and
  Thai.

## Non-Goals

- Do not expose supplier cost, capital, or margin values from the admin price
  book.
- Do not make prices editable from the public page.
- Do not add booking controls inside individual table cells.
- Do not redesign the existing vehicle cards or the rest of the fleet page.

## Information Architecture

The fleet page order becomes:

1. Page title and pricing inclusion note.
2. Four existing vehicle cards.
3. New complete price-list section.
4. Existing airport-transfer WhatsApp callout.

The price-list section contains:

- A section heading and a short note that prices are in THB per vehicle.
- Three independently labeled service-group tables.
- Columns for route, Altis, SUV, Van, and Mini Bus.

The route groups and public selling prices follow the supplied brochure:

### Airport Transfer

- DMK to Bangkok: 800 / 1,000 / 1,300 THB.
- DMK to Pattaya: 2,000 / 2,200 / 2,500 THB.
- DMK to Khao Yai: 2,700 / 3,000 / 4,000 THB.
- DMK to Hua Hin: 2,700 / 3,200 / 3,700 THB.

### Daily Return Tours

- Bangkok City Tour: 3,200 / 3,700 / 4,200 THB.
- Bangkok to Pattaya: 3,700 / 4,300 / 5,300 THB.
- Bangkok to Khao Yai: 4,200 / 4,700 / 5,500 THB.
- Bangkok to Hua Hin: 4,300 / 4,800 / 5,500 THB.
- Bangkok to Ayutthaya: 3,400 / 4,000 / 4,500 THB.
- Bangkok to Kanchanaburi: 4,200 / 4,700 / 5,300 THB.

### Drop-off and Northern Thailand

- Pattaya to Khao Yai: 3,500 / 3,800 / 4,200 THB.
- Chiang Mai to Chiang Rai: contact team.
- Chiang Mai Trip: contact team.
- Chiang Rai Trip: contact team.

The brochure does not publish Mini Bus prices for these routes. Every Mini Bus
cell therefore uses the contact-team fallback.

## Data Design

Create a public-facing price-list data structure containing only customer
selling prices and availability. It must support four vehicle columns and
contact-only rows or cells.

Do not import the admin price book directly into the public client component.
That module includes capital prices that should remain an internal concern.
The public data can reuse values from the existing tour catalog where those
routes already exist, but airport and drop-off entries need their own public
records.

Each service record should include:

- Stable service ID.
- Translation key or localized display label.
- Service group.
- Optional route detail such as duration or trip type.
- A partial map of final customer prices by vehicle.
- Optional contact-only flag.

Missing vehicle prices and contact-only services render the same translated
contact-team message.

## Visual Design

- Use the existing navy, cream, and gold brand palette.
- Give each service group a compact navy header with cream text.
- Use warm cream or lightly tinted neutral table surfaces.
- Keep row separators subtle and avoid card-like treatment for every row.
- Right-align prices and use tabular numerals for easy comparison.
- Use the existing page typography rather than introducing new web fonts.
- Keep the section visually denser than the vehicle cards, reflecting the
  brochure's price-sheet character.

## Responsive Behavior

- Desktop and tablet show all five columns in a conventional table.
- Mobile keeps the route column readable and allows horizontal scrolling for
  the vehicle columns.
- The scroll container must not create page-level horizontal overflow.
- Headers remain visually distinct while scrolling.
- Touch targets are not required inside cells because the table is read-only.

## Localization

Add translated labels for:

- Complete price-list title and subtitle.
- Three service-group names.
- Route labels and optional details.
- Vehicle-column labels.
- Contact-team fallback.
- Currency and inclusion note where the existing common labels are
  insufficient.

Indonesian remains the default language. English and Thai must render the same
data and table structure.

## Accessibility

- Use semantic `section`, `table`, `thead`, `tbody`, `th`, and `td` elements.
- Provide a descriptive table caption or accessible heading association.
- Mark route cells as row headers.
- Preserve adequate text and border contrast.
- Do not communicate unavailable pricing through color alone.

## Verification

- Confirm all brochure values route by route and vehicle by vehicle.
- Confirm Mini Bus and contact-only entries show the contact-team fallback.
- Test Indonesian, English, and Thai rendering.
- Inspect desktop and mobile layouts in the browser.
- Run ESLint and the production Next.js build.

