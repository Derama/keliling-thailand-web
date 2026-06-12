# Popular Destination Preview

**Date:** 2026-06-13  
**Status:** Approved

## Goal

Keep visitors on the homepage when they click a card in the **Destinasi Populer**
section. Instead of navigating immediately to `/tours/[city]`, show a concise
preview dialog for that destination.

The existing city tour pages remain available and unchanged.

## Interaction

- Clicking a destination card on the homepage opens its preview dialog.
- Clicking outside the dialog, pressing `Escape`, or using the close button
  closes it.
- Keyboard focus moves into the dialog when it opens and returns to the
  destination card when it closes.
- Page scrolling is locked while the dialog is open.
- Destination cards on `/tours` continue to navigate directly to their city
  pages.

## Dialog Content

The preview shows:

- Destination image and localized city name
- Tour duration
- Number of attractions
- Starting vehicle price
- A short list of included attractions
- A primary **View full details** action linking to `/tours/[city]`
- A secondary close action

All visible labels use the existing Indonesian, English, and Thai translation
system.

## Visual Direction

The dialog follows the existing travel-brand palette:

- Navy `#1B2A4A` for headings and controls
- Yellow `#F5C518` for the primary action
- Warm cream and white surfaces

On desktop it appears as a centered, compact dialog. On mobile it becomes a
bottom-aligned sheet with a scrollable content area. Motion is limited to a
short opacity and transform transition and is disabled for reduced-motion
users.

## Architecture

- Extend `CityCard` with an optional click callback. Without the callback it
  remains a normal link, preserving behavior on `/tours`.
- `HomeContent` owns the selected destination state.
- Add a focused `DestinationPreviewModal` component responsible for rendering
  the dialog and its close behavior.
- Reuse destination, price, attraction, and translation data already provided
  by `lib/tours.ts` and `lib/translations.ts`.

## Accessibility

- Use `role="dialog"` and `aria-modal="true"`.
- Give the dialog an accessible title tied to the destination name.
- Support close button, overlay click, and `Escape`.
- Keep all actions keyboard accessible with visible focus styles.
- Restore focus to the card that opened the dialog.

## Verification

- Homepage destination cards open the correct preview without changing URL.
- The details action navigates to the correct `/tours/[city]` route.
- `/tours` cards retain direct navigation.
- Dialog closes through all supported methods.
- Test at desktop and mobile viewport sizes.
- Run lint and production build.

## Out of Scope

- Replacing the full city tour pages
- Booking or payment inside the preview
- Changing cards outside the homepage destination section
