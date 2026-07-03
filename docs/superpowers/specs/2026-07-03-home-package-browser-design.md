# Homepage Package Browser Design

## Goal

Give homepage visitors a clear choice between building a custom itinerary and browsing the complete curated package catalog.

## Hero Actions

- Keep “Buat Rencana” as the primary yellow action.
- Add “Lihat Paket Tur” beside it as a visually secondary action.
- Stack the two actions on narrow screens and show them side by side when space permits.

## Package Browser

- “Lihat Paket Tur” opens an accessible, large scrollable dialog.
- The dialog shows all 13 entries from the existing `tourPackages` catalog plus the existing custom-package option.
- Package cards reuse `PackageCard`; selecting one navigates to its existing `/tours/packages/[slug]` detail page instead of opening a second dialog.
- The custom-package option reuses the existing localized WhatsApp message and link.
- The dialog has a visible title, supporting copy, close button, Escape-to-close behavior, backdrop close, body scroll lock, and initial focus on the close button.

## Motion

- Reuse the planner's 250ms backdrop fade and 400ms panel rise/scale entrance so both homepage choices feel like one system.
- Reveal package and custom cards with the planner's upward card entrance, using 35ms intervals capped after the eighth item so the 14-option catalog remains responsive.
- Give the package-browser trigger and close control subtle press feedback.
- Apply no meaningful delay or movement when `prefers-reduced-motion: reduce` is active.

## Content

- Add localized homepage copy for the hero action, dialog title, dialog description, and close-label/accessibility text in Indonesian, English, and Thai.
- Reuse package titles, taglines, badges, prices, and custom-package copy from the existing package translations.

## Component Boundaries

- Create `HomePackageBrowserModal.tsx` to own dialog behavior and package-grid composition.
- `HomeContent.tsx` owns only open/closed state and hero-trigger focus restoration.
- No package records or package card markup are duplicated.

## Verification

- Add a focused source-contract test for the hero action, all-package data source, custom-package entry, navigation behavior, accessibility hooks, and three-locale copy.
- Run the full Node test suite, lint, and the Next.js production build.

## Scope

This does not alter package detail pages, package pricing, the itinerary planner, or the `/tours` package tab.
