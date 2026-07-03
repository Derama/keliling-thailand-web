# Daily Tour Planner Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let visitors choose a city before opening a one-day planner while keeping multi-day planning available as a secondary action.

**Architecture:** Extend the existing planner context with an optional city ID and initialize the modal from a small pure helper. Keep itinerary navigation and planning as separate controls inside `CityCard`, then compose those controls in the daily tab and add localized multi-day fallback copy below the grid.

**Tech Stack:** Next.js 16.2 Client Components, React 19 context/state, TypeScript, Tailwind CSS, Node test runner.

---

### Task 1: Planner initialization contract

**Files:**
- Create: `lib/planner.ts`
- Create: `lib/planner.test.mjs`
- Modify: `components/PlanBuilderContext.tsx`
- Modify: `components/PlanBuilderModal.tsx`

- [ ] **Step 1: Write the failing initialization test**

Create a Node test that imports `createInitialPlan` and verifies that no city produces an empty one-day plan, while `bangkok` produces a one-day plan with Bangkok and the same default attraction selection used by the planner.

- [ ] **Step 2: Run the test and verify RED**

Run `node --test lib/planner.test.mjs`. Expect failure because `lib/planner.ts` does not exist.

- [ ] **Step 3: Implement the pure initialization helper**

Export `createInitialPlan(initialCityId?: string)` from `lib/planner.ts`. Return `{ tripCities, picks, customPlaces }`, validate the city through `getCity`, and fill attractions in itinerary order without exceeding `durationHours`.

- [ ] **Step 4: Pass the optional city through context**

Change the context signature to `openPlanner(initialCityId?: string)`. Store `{ initialCityId } | null` as the open state and pass it to `PlanBuilderModal`. Keep all existing zero-argument call sites valid.

- [ ] **Step 5: Initialize the modal from the helper**

Add `initialCityId?: string` to the modal props and initialize `tripCities`, `picks`, and `customPlaces` from `createInitialPlan(initialCityId)`. Keep one day selected and retain existing behavior for global planner entry points.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run `node --test lib/planner.test.mjs`. Expect all planner initialization tests to pass.

### Task 2: City-first daily-tour entry UI

**Files:**
- Modify: `components/CityCard.tsx`
- Modify: `components/ToursContent.tsx`
- Modify: `lib/translations.ts`
- Create: `components/dailyTourEntry.test.mjs`

- [ ] **Step 1: Write the failing UI contract test**

Create a Node source-contract test that verifies `ToursContent` passes each city ID to `openPlanner`, places the multi-day fallback after the city grid, and `CityCard` renders separate itinerary and planner controls with localized labels.

- [ ] **Step 2: Run the test and verify RED**

Run `node --test components/dailyTourEntry.test.mjs`. Expect failure because the city planning callback and localized copy are absent.

- [ ] **Step 3: Add localized copy**

Add `dailyPlanButton`, `dailyPlanAria`, `multiDayTitle`, `multiDayDesc`, and `multiDayButton` to the Indonesian, English, and Thai `packages` translations.

- [ ] **Step 4: Split the card controls**

Add `onPlan?: (city: City) => void` to `CityCard`. Render the existing card content inside an itinerary link, then render a separate full-width planning button only when `onPlan` is supplied. Use `dailyPlanAria` with the city name for its accessible label.

- [ ] **Step 5: Recompose the daily tab**

Remove the planner button above the grid. Pass `onPlan={(city) => openPlanner(city.id)}` to every city card. Add a restrained secondary multi-day section below the grid that calls `openPlanner()`.

- [ ] **Step 6: Run the UI contract test and verify GREEN**

Run `node --test components/dailyTourEntry.test.mjs`. Expect all daily-tour entry tests to pass.

### Task 3: Verification

**Files:**
- Verify all files above without unrelated edits.

- [ ] **Step 1: Run focused tests**

Run `node --test lib/planner.test.mjs components/dailyTourEntry.test.mjs`. Expect all tests to pass.

- [ ] **Step 2: Run lint**

Run `npm run lint`. Expect exit code 0 with no new errors.

- [ ] **Step 3: Run the production build**

Run `npm run build`. Expect the Next.js production build to complete successfully.

- [ ] **Step 4: Review the final diff**

Confirm the diff preserves the user's existing package-tab work and contains only planner initialization, city-card composition, daily-tab flow, translations, and tests.
