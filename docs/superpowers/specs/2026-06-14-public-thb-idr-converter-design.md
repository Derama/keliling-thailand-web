# Public THB to IDR Converter Design

## Summary

Add a standalone THB-to-IDR converter below the complete price tables on the
Armada & Harga page. Published route prices remain displayed only in THB.

## Behavior

- Users enter any THB amount.
- The page requests a suggested THB-to-IDR rate from the existing `/api/fx`
  endpoint, backed by the free keyless exchange-rate API.
- The suggested rate fills the rate field automatically.
- Users can edit the rate at any time.
- The converted IDR amount updates immediately.
- If the live-rate request fails, both fields remain usable and the rate can be
  entered manually.
- A localized notice states that exchange rates fluctuate and recommends
  contacting the Keliling Thailand team for the latest rate.
- A localized WhatsApp button opens a prefilled rate-enquiry message.

## Placement and Style

Place the converter directly after the three price-table groups and before the
existing airport-transfer callout. Use the existing cream, navy, and gold
palette, centered typography, two clear numeric inputs, and one prominent IDR
result. The layout stacks on mobile and uses two columns where space permits.

## Accessibility

Use explicit labels, numeric input modes, visible focus states, live result
text, and status copy for loading or unavailable suggested rates.

