# Fleet Complete Price Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a localized, brochure-style complete public price table below the four vehicle cards on the Armada & Harga page.

**Architecture:** Keep public selling prices in a dedicated module that contains no internal capital data. Render three semantic, horizontally scrollable table groups from that module inside `FleetContent`, with all customer-facing labels supplied by the existing translation system.

**Tech Stack:** Next.js 16.2.3, React 19, TypeScript, Tailwind CSS 4, Node test runner.

---

### Task 1: Public Price Data

**Files:**
- Create: `lib/publicPriceBook.ts`
- Create: `lib/publicPriceBook.test.ts`

- [ ] **Step 1: Write a failing data-contract test**

Test that the public catalog contains 13 brochure routes, exposes four vehicle
columns, preserves the published Bangkok-to-Khao-Yai prices, and leaves Mini
Bus prices absent for contact fallback.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test lib/publicPriceBook.test.ts`

Expected: failure because `lib/publicPriceBook.ts` does not exist.

- [ ] **Step 3: Implement the public price book**

Add typed service groups, route IDs, vehicle IDs, route details, fixed selling
prices, and contact-only flags. Include only customer-facing prices.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test lib/publicPriceBook.test.ts`

Expected: all tests pass.

### Task 2: Localized Labels

**Files:**
- Modify: `lib/translations.ts`

- [ ] **Step 1: Add complete price-list copy**

Add Indonesian, English, and Thai strings for the section title, subtitle,
group labels, route labels, route details, vehicle headers, currency note, and
contact fallback.

- [ ] **Step 2: Run TypeScript validation**

Run: `npx tsc --noEmit`

Expected: exit 0.

### Task 3: Brochure-Style Table UI

**Files:**
- Modify: `components/FleetContent.tsx`

- [ ] **Step 1: Render the new section**

Insert the complete price list below the vehicle cards and above the airport
callout. Render semantic tables with route row headers, right-aligned tabular
prices, navy group headers, cream surfaces, and gold contact fallback text.

- [ ] **Step 2: Add responsive behavior**

Wrap each table in a local horizontal scroll container and give it a minimum
width so all four vehicle columns remain legible without causing page overflow.

- [ ] **Step 3: Verify static checks**

Run: `npm run lint && npm run build`

Expected: both commands exit 0.

### Task 4: Browser Verification

**Files:**
- No production file changes expected.

- [ ] **Step 1: Open `/fleet` in the in-app browser**

Verify the table sits beneath the four cards, all three groups render, and the
visual treatment matches the approved mockup.

- [ ] **Step 2: Check mobile layout**

Verify each table scrolls internally and the page itself has no horizontal
overflow.

- [ ] **Step 3: Check language variants**

Switch between Indonesian, English, and Thai and confirm headings, route names,
details, vehicle labels, and contact fallbacks update.

