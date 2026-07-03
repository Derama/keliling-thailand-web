# Daily Tour Planner Entry Design

## Goal

Make the “Tur Harian per Kota” tab match the visitor's immediate intent: browse a city first, then start a daily-tour plan with that city already selected.

## Interaction

- The daily-tour tab shows city cards before any planner call to action.
- Each city card retains its itinerary-detail navigation and adds a distinct “Susun Tur Harian” action.
- That action opens the existing planner with one day selected and the card's city prefilled, including the existing default attraction picks for that city.
- A secondary section below the city grid offers “Buat Rencana Multi-Hari” for visitors who want to combine cities or plan more than one day.
- Existing planner entry points in the navbar and homepage continue to open the unprefilled planner.

## Component Contract

- `PlanBuilderContext.openPlanner` accepts an optional initial city identifier.
- `PlanBuilderModal` accepts the optional initial city identifier and initializes its day-one city and attractions from it.
- `CityCard` accepts an optional daily-plan callback. The itinerary link and planning button remain separate interactive elements; no nested links or buttons are introduced.
- `ToursContent` supplies the city-specific callback and renders the multi-day fallback after the grid.

## Copy

- City action: “Susun Tur Harian”.
- Secondary heading: “Ingin mengunjungi beberapa kota?”.
- Secondary supporting copy explains that visitors can combine cities into a multi-day private trip.
- Secondary action: “Buat Rencana Multi-Hari”.

Equivalent copy is added for every supported locale.

## Accessibility

- Both actions use native links or buttons with visible keyboard focus.
- The city name is included in the planning button's accessible label.
- Existing dialog semantics and Escape-to-close behavior remain unchanged.

## Verification

- Add focused tests for planner initialization with and without an initial city.
- Add focused tests for the daily-tab structure and translated action labels where practical in the existing test setup.
- Run the relevant tests, lint, and production build.

## Scope

This change does not redesign planner steps, city detail pages, pricing, or WhatsApp submission.
