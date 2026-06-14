import assert from "node:assert/strict";
import test from "node:test";

import { convertThbToIdr } from "./currency.ts";

test("converts THB to a rounded IDR amount", () => {
  assert.equal(convertThbToIdr(4200, 510.25), 2143050);
});

test("returns null for invalid amounts or rates", () => {
  assert.equal(convertThbToIdr(0, 510), null);
  assert.equal(convertThbToIdr(4200, 0), null);
  assert.equal(convertThbToIdr(-1, 510), null);
  assert.equal(convertThbToIdr(4200, Number.POSITIVE_INFINITY), null);
});
