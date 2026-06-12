# Popular Destination Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open homepage destination cards in an accessible preview dialog while preserving direct city-page navigation everywhere else.

**Architecture:** `HomeContent` owns the selected city and passes an optional activation callback to `CityCard`. A new `DestinationPreviewModal` renders existing tour data and translations, manages dialog dismissal and focus restoration, and links to the unchanged `/tours/[city]` page.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4

---

### Task 1: Add localized preview copy

**Files:**
- Modify: `lib/translations.ts`

- [ ] Add a `destinationPreview` object to Indonesian, English, and Thai translations with labels for highlights, full details, and close.
- [ ] Run `npm run lint` and confirm the translation object remains type-consistent.

### Task 2: Make destination cards optionally interactive

**Files:**
- Modify: `components/CityCard.tsx`

- [ ] Add an optional `onSelect(city, trigger)` callback.
- [ ] Render a semantic button when `onSelect` exists and retain the current `Link` when it does not.
- [ ] Preserve the existing card image, metadata, hover treatment, and keyboard focus visibility.
- [ ] Run `npm run lint`.

### Task 3: Build the destination preview dialog

**Files:**
- Create: `components/DestinationPreviewModal.tsx`
- Modify: `app/globals.css`

- [ ] Render the selected city image, duration, attraction count, starting price, and first four attraction names.
- [ ] Add the `/tours/[city]` details link and close button.
- [ ] Close on overlay click and `Escape`, lock body scroll, autofocus the close control, and restore focus to the opening card.
- [ ] Add short overlay/panel transitions with a mobile bottom-sheet layout and reduced-motion support.
- [ ] Run `npm run lint`.

### Task 4: Connect the homepage cards

**Files:**
- Modify: `components/HomeContent.tsx`

- [ ] Store the selected city and opening element in state.
- [ ] Pass `onSelect` only to homepage `CityCard` instances.
- [ ] Render `DestinationPreviewModal` when a city is selected.
- [ ] Confirm `components/ToursContent.tsx` remains unchanged so its cards still navigate directly.

### Task 5: Verify behavior

**Files:**
- No production file changes expected

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Open the homepage at desktop and mobile widths.
- [ ] Confirm a destination card opens the correct dialog without changing the URL.
- [ ] Confirm close button, overlay click, and `Escape` dismiss the dialog.
- [ ] Confirm **View full details** opens the correct `/tours/[city]` page.
- [ ] Confirm destination cards on `/tours` still navigate directly.
