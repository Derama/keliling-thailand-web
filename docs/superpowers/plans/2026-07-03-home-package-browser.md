# Homepage Package Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secondary homepage hero action that opens an accessible browser containing all 13 curated tour packages and the custom-package option.

**Architecture:** `HomeContent` owns the trigger, open state, and trigger-focus restoration. A new `HomePackageBrowserModal` owns dialog behavior and composes the existing `tourPackages`, `PackageCard`, and custom WhatsApp entry without duplicating catalog data or package card markup.

**Tech Stack:** Next.js 16.2 Client Components, React 19, TypeScript, Tailwind CSS, Node test runner.

---

### Task 1: Package browser contract and implementation

**Files:**
- Create: `components/HomePackageBrowserModal.tsx`
- Create: `components/homePackageBrowser.test.mjs`
- Modify: `components/HomeContent.tsx`
- Modify: `lib/translations.ts`

- [ ] **Step 1: Write the failing source-contract test**

Create a Node test that reads the component and translation sources. Assert that `HomeContent` renders `t.home.packageBrowser.openButton`, stores the triggering button, and mounts `HomePackageBrowserModal`; assert that the modal maps `tourPackages` through `PackageCard`, contains the custom WhatsApp entry, uses dialog semantics, closes on Escape and backdrop interaction, and restores body scrolling; assert that the five `packageBrowser` translation keys exist in Indonesian, English, and Thai.

- [ ] **Step 2: Run the test and verify RED**

Run `node --test components/homePackageBrowser.test.mjs`. Expect failure because the modal and localized homepage action do not exist.

- [ ] **Step 3: Add localized copy**

Add `home.packageBrowser.openButton`, `title`, `description`, `close`, and `customAria` in all three locales. Use “Lihat Paket Tur” for the Indonesian hero action and equivalent action-oriented English and Thai labels.

- [ ] **Step 4: Build the modal structure and behavior**

Create `HomePackageBrowserModal({ onClose })`. Use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, a close-button ref, Escape handling, backdrop close, and body scroll lock. Render a mobile bottom sheet and centered desktop dialog with a sticky header and scrollable `sm:grid-cols-2 lg:grid-cols-3` package grid. Render all `tourPackages` via link-mode `PackageCard`, then append the existing custom WhatsApp card using `t.packages.custom*` strings.

- [ ] **Step 5: Add the homepage hero trigger**

In `HomeContent`, add `packageBrowserTrigger` state containing the opening button or `null`. Render “Buat Rencana” as primary and “Lihat Paket Tur” as a secondary outlined button in a mobile-stacked, desktop-inline action group. Mount the modal while open and restore focus to the saved trigger on close.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run `node --test components/homePackageBrowser.test.mjs`. Expect every package-browser contract test to pass.

### Task 2: Verification

**Files:**
- Verify all files above and preserve the existing package and planner behavior.

- [ ] **Step 1: Run all tests**

Run `node --test`. Expect zero failures, including package-browser, daily-tour entry, and planner tests.

- [ ] **Step 2: Run lint**

Run `npm run lint`. Expect exit code 0.

- [ ] **Step 3: Run the production build**

Run `npm run build`. Expect successful Next.js compilation, type checking, and static page generation.

- [ ] **Step 4: Review the final diff**

Run `git diff --check` and inspect `git diff --stat`. Confirm no package records or card markup were duplicated and no unrelated files changed.

### Task 3: Planner-consistent package-browser motion

**Files:**
- Modify: `components/HomePackageBrowserModal.tsx`
- Modify: `components/HomeContent.tsx`
- Modify: `components/homePackageBrowser.test.mjs`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing motion contract test**

Extend the package-browser source test to require `planner-overlay` and `planner-panel` on the dialog, `package-browser-stagger` on its grid, capped eighth-item stagger CSS, active press scaling on the hero trigger and close button, and the existing reduced-motion media query.

- [ ] **Step 2: Run the test and verify RED**

Run `node --test components/homePackageBrowser.test.mjs`. Expect the new motion test to fail because the package-browser motion hooks do not exist.

- [ ] **Step 3: Apply shared modal motion and capped card staggering**

Add the planner overlay and panel classes to the package browser. Add `package-browser-stagger` to the package grid and CSS that reuses `planner-card-in` for direct children, assigns 35ms increments to children two through eight, and caps child nine onward at the eighth delay.

- [ ] **Step 4: Add press feedback**

Add `active:scale-[0.97]` with transform-specific transitions to the homepage package-browser trigger and modal close button.

- [ ] **Step 5: Run focused and full verification**

Run `node --test components/homePackageBrowser.test.mjs`, `node --test`, `npm run lint`, and `npm run build`. Expect zero test failures and successful lint/build output.
