import assert from "node:assert";
import { test } from "node:test";
import { rentalDays, rentalTotal } from "./pricing.ts";

test("rentalDays counts the span between two dates", () => {
  assert.strictEqual(rentalDays("2026-06-17", "2026-06-20"), 3);
});

test("rentalDays returns 1 for a same-day rental", () => {
  assert.strictEqual(rentalDays("2026-06-17", "2026-06-17"), 1);
});

test("rentalDays returns 1 when end is before start", () => {
  assert.strictEqual(rentalDays("2026-06-20", "2026-06-17"), 1);
});

test("rentalDays returns 0 for missing input", () => {
  assert.strictEqual(rentalDays("", "2026-06-20"), 0);
  assert.strictEqual(rentalDays("2026-06-17", ""), 0);
});

test("rentalDays is not shifted by timezone", () => {
  assert.strictEqual(rentalDays("2026-12-31", "2027-01-02"), 2);
});

test("rentalTotal multiplies days by daily rate", () => {
  assert.strictEqual(rentalTotal(3, 1200), 3600);
});

test("rentalTotal is 0 for non-positive inputs", () => {
  assert.strictEqual(rentalTotal(0, 1200), 0);
  assert.strictEqual(rentalTotal(3, 0), 0);
});
