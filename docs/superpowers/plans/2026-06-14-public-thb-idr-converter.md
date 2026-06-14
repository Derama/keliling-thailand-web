# Public THB to IDR Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editable live-rate THB-to-IDR converter below the public fleet price tables.

**Architecture:** Keep conversion math in a tested utility and rate-fetching UI in a focused client component. Reuse the existing `/api/fx` endpoint and translation system.

**Tech Stack:** Next.js 16.2.3, React 19, TypeScript, Tailwind CSS 4, Node test runner.

---

### Task 1: Conversion Utility

**Files:**
- Create: `lib/currency.ts`
- Create: `lib/currency.test.mjs`

- [ ] Write failing tests for valid conversion and invalid inputs.
- [ ] Run `node --test lib/currency.test.mjs` and verify failure.
- [ ] Implement `convertThbToIdr`.
- [ ] Rerun the tests and verify success.

### Task 2: Localized Converter

**Files:**
- Create: `components/ThbIdrConverter.tsx`
- Modify: `lib/translations.ts`

- [ ] Add Indonesian, English, and Thai converter labels, statuses, disclaimer,
  and WhatsApp copy.
- [ ] Build editable THB and rate inputs with automatic `/api/fx` suggestion.
- [ ] Render an immediately updating formatted IDR result.
- [ ] Keep manual conversion available when the API fails.

### Task 3: Fleet Page Integration

**Files:**
- Modify: `components/FleetContent.tsx`

- [ ] Render the converter below all price tables and above the airport callout.
- [ ] Run focused tests, ESLint, and the production build.
- [ ] Inspect the desktop and mobile page visually.

