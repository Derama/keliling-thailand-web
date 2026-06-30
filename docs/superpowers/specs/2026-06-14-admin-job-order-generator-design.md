# Admin Job Order Generator — Design

Date: 2026-06-14
Status: Approved

## Purpose

Let the admin generate a printable **guide job order** (`ใบสั่งงานมัคคุเทศก์`) to
hand to a tour provider/guide, listing the day-by-day itinerary, hotels, meals,
and trip logistics. The document is a legal/operational form issued under the
licensed entity **Love Bangkok Co., Ltd.** (their license, phones, address), but
styled in the **Keliling Thailand** brand colors.

## Scope (YAGNI)

- Standalone, in-memory builder — matches existing `ItineraryBuilderView` /
  `InvoiceBuilderView` pattern. **No DB changes, no persistence, no AI, no order
  linking.**
- Output is a browser-printable A4 doc (Print / Save PDF), like the other admin
  print documents.

## Components

### `lib/admin/jobOrder.ts`

Types and static company constants.

```ts
export interface JobOrderDay {
  id: string;        // crypto.randomUUID()
  date: string;      // free text, e.g. "13/06"
  itinerary: string;
  lunch: string;
  dinner: string;
  hotel: string;
}

export interface JobOrderData {
  jobOrderNo: string;
  date: string;          // header date
  travelAgent: string;
  totalPax: string;      // free text, e.g. "8 PAX"; also drives blank passenger rows
  bedType: string;
  hotelPattaya: string;
  hotelBangkok: string;
  days: JobOrderDay[];
}

/** Licensed entity printed on the job order. Hardcoded — Love Bangkok is the
 *  licensed operator; only the styling follows the Keliling Thailand brand. */
export const LOVE_BANGKOK = {
  name: "Love Bangkok Co., Ltd.",
  emergencyContact: "Love Bangkok.Co.Ltd",
  licenseNo: "11/13151",
  phone: "+6695-451-1582 Mr. Kevin",
  urgentCall: "+6683-827373-9 Love Bangkok Team",
  footerPhone: "+66 83 827 3739",
  email: "corporate@Lovebangkokco-ltd.com",
  address:
    "3/41 Phetchaburi Rd, Khwaeng Thanon Phaya Thai, Khet Ratchathewi, Krung Thep",
  logo: "/lovebangkok/logo.png",
  seal: "/lovebangkok/seal.png",
} as const;

/** A passenger count parsed from totalPax for rendering blank rows (fallback 1, cap 30). */
export function passengerRowCount(totalPax: string): number;
```

`passengerRowCount` extracts the first integer from `totalPax` (e.g. `"8 PAX"` →
8). Defaults to 1 if none found; capped at 30 to avoid runaway print.

### `components/admin/JobOrderDoc.tsx`

The printable A4 document. Props: `JobOrderData`. Pure presentational; no state.

Layout (top → bottom), bilingual Thai / English labels matching the sample,
brand colors `#F5C518` (yellow) and `#1B2A4A` (navy):

1. **Header banner** — Love Bangkok logo (`LOVE_BANGKOK.logo`, fallback to a
   bordered box if the image 404s) on the left, Thai title `ใบสั่งงานมัคคุเทศก์`
   on the right against a brand-colored band. Below: `Job Order No.` (=
   `jobOrderNo`) and `Date` (= `date`).
2. **Info grid** — bordered two-column table:
   - `ชื่อบริษัทนำเที่ยว / Travel Agent` = `travelAgent`
   - `Emergency Contact` = `LOVE_BANGKOK.emergencyContact`
   - `ชื่อมัคคุเทศก์ / Guide Name` = blank
   - `ใบอนุญาตเลขที่ / License No.` = `LOVE_BANGKOK.licenseNo`
   - `หมายเลขบัตรประชาชน / ID Card Number` = blank
   - `โทรศัพท์ / Phone Number` = `LOVE_BANGKOK.phone`
   - `ป้ายรถทะเบียน / Car Register` = blank
   - `หมายเลขโทรศัพท์ด่วน / Urgent Call` = `LOVE_BANGKOK.urgentCall`
   - `เวลาเดินทางถึงประเทศไทย / Waktu Kedatangan` = blank
   - `โรงแรมในพัทยา / Hotel Pattaya` = `hotelPattaya`
   - `เวลาเดินทางกลับจากประเทศไทย / Waktu Kepulangan` = blank
   - `โรงแรมในกรุงเทพฯ / Hotel Bangkok` = `hotelBangkok`
   - `จำนวนผู้เข้าพัก / Total Pax` = `totalPax`
   - `ประเภทเตียง / Bed Type` = `bedType`
3. **Itinerary table** — columns `วัน/เดือน/ปี Date | รายการนำเที่ยว Itinerary |
   Lunch | Dinner | Hotel`, one row per `days[]` entry.
4. **Passenger table** — columns `ลำดับ No. | ชื่อ Name | หมายเลขหนังสือเดินทาง
   Passport | สัญชาติ Nationality | หมายเหตุ Remark`. Renders
   `passengerRowCount(totalPax)` empty numbered rows for handwriting.
5. **Signatures** — `มัคคุเทศก์ลงนาม / Guide's Signature` (blank line),
   `ผู้มีอำนาจลงนาม / Authorized Signature` (blank line), and
   `ประทับตราบริษัท / Company's Seal` showing `LOVE_BANGKOK.seal` (fallback box).
6. **Footer** — brand band with `LOVE_BANGKOK.footerPhone`, `.email`, `.address`.

Root element carries the `print-doc` class so existing print CSS strips
shadow/radius/padding.

### `components/admin/views/JobOrderBuilderView.tsx`

Form + live preview, following `ItineraryBuilderView`.

- `no-print` form section with inputs for: Job Order No (default
  `INV/<year>/001`-style is **out of scope** — default to empty placeholder),
  Date (default today, `formatDate`-style `dd/mm/yyyy`), Travel Agent, Total Pax,
  Bed Type, Hotel Pattaya, Hotel Bangkok.
- Day rows editor: list of `JobOrderDay` with add/remove; inputs for Date,
  Itinerary, Lunch, Dinner, Hotel. Starts with one empty row.
- Live `<JobOrderDoc {...data} />` preview below.
- Print button (`window.print()`, `no-print`) reusing `btnCls`.

Uses shared `Field`, `inputCls`, `btnCls` from `components/admin/ui.tsx`.

## Edits

### `app/admin/(panel)/page.tsx`

Add to `TABS` (after `itinerary`, before `calendar`):

```ts
{ id: "joborder", label: "Job Order", View: JobOrderBuilderView },
```

Import `JobOrderBuilderView`.

### `app/globals.css`

Under the existing `@media print` block (or a new rule), ensure A4 sizing and
color printing for the banner/footer:

```css
@media print {
  @page { size: A4; margin: 12mm; }
  .print-doc { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

(Confirm the existing `.print-doc` rules still apply; only add the missing
`@page` + color-adjust.)

## Assets (user-provided)

- `public/lovebangkok/logo.png`
- `public/lovebangkok/seal.png`

`JobOrderDoc` references these paths. If a file is absent the image area shows a
neutral bordered placeholder (use a plain `<img>` with `onError` swap, or a CSS
fallback) so the doc still prints cleanly.

## Data flow

`JobOrderBuilderView` holds all state → passes a `JobOrderData` object to
`JobOrderDoc` → user clicks Print → browser print dialog. Nothing leaves the
browser; no network calls.

## Error handling

- Missing logo/seal images → graceful placeholder, no broken-image icon.
- `passengerRowCount` clamps to `[1, 30]`.
- Empty day list → table renders header only (still valid).

## Testing

No automated test suite in the repo. Verification:
- `npm run build` passes (TypeScript + lint clean).
- Manual: open admin → Job Order tab, fill fields, add day rows, confirm preview
  matches the template, Print preview shows A4 with banner colors and blank
  guide/passenger fields.

## Out of scope

- Persistence / saving job orders to Supabase.
- Linking to an existing order.
- AI generation.
- Auto-incrementing job order numbers.
- Editable passenger rows (blank-for-handwriting only).
