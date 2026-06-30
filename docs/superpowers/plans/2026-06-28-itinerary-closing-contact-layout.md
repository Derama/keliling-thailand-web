# Itinerary Closing Contact Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the itinerary closing-page contact block so named contacts and telephone numbers align cleanly without awkward wrapping.

**Architecture:** Keep the existing `ClosingPage` data flow and `ContactRow` component. Add a row-layout option to `ContactRow`, use it for both named contacts, and preserve the existing compact two-column social rows and full-width email/website rows.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4

---

### Task 1: Reorganize the closing-page contact rows

**Files:**
- Modify: `components/admin/ItineraryDoc.tsx:555-619`

- [ ] **Step 1: Record the current visual failure**

Open the itinerary builder preview at A4 width and confirm that the two named-contact cells split names and telephone numbers across multiple lines.

- [ ] **Step 2: Add a full-width named-contact layout**

Update the named-contact calls and `ContactRow` API:

```tsx
<ContactRow
  label={waContact ? waContact.name : "WhatsApp"}
  value={k.whatsapp}
  wide
  singleLine
/>
{extraContacts.map((c) => (
  <ContactRow
    key={c.name}
    label={c.name}
    value={c.phone}
    wide
    singleLine
  />
))}
```

```tsx
function ContactRow({
  label,
  value,
  wide,
  singleLine,
}: {
  label: string;
  value: string;
  wide?: boolean;
  singleLine?: boolean;
}) {
  return (
    <div
      className={`grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-3 border-b border-gray-100 py-1.5 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span
        className={`min-w-0 font-medium text-[#1B2A4A] ${
          singleLine ? "whitespace-nowrap tabular-nums" : "break-words"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Run static verification**

Run: `rtk npm run lint -- components/admin/ItineraryDoc.tsx`

Expected: ESLint exits successfully with no errors in `ItineraryDoc.tsx`.

- [ ] **Step 4: Verify the rendered A4 preview**

Open the itinerary builder and inspect its final page at the normal A4 preview width. Confirm:

- Riddhan Fawwaz and the Indonesian number occupy one full-width row.
- Deva Rama and the Thai number occupy one full-width row.
- Both telephone numbers remain on one line and use aligned numerals.
- Instagram/Facebook remain side-by-side.
- Email/website remain full-width.
- The QR code remains aligned to the right and the contact block does not overflow.

- [ ] **Step 5: Commit the implementation**

```bash
rtk git add components/admin/ItineraryDoc.tsx docs/superpowers/plans/2026-06-28-itinerary-closing-contact-layout.md
rtk git commit -m "style: tidy itinerary closing contacts"
```
