import assert from "node:assert";
import { test } from "node:test";
import { buildRentalNumber } from "./rentalNumber.ts";

test("builds R-YYMM-NN from count", () => {
  const d = new Date(2026, 5, 17); // June 2026 (month is 0-based)
  assert.strictEqual(buildRentalNumber(0, d), "R-2606-01");
  assert.strictEqual(buildRentalNumber(4, d), "R-2606-05");
});

test("zero-pads month and sequence", () => {
  const d = new Date(2026, 0, 9); // January
  assert.strictEqual(buildRentalNumber(0, d), "R-2601-01");
});

test("sequence past 9 keeps two digits", () => {
  const d = new Date(2026, 5, 1);
  assert.strictEqual(buildRentalNumber(11, d), "R-2606-12");
});
