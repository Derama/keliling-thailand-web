import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_FLEET_KEYS,
  PUBLIC_PRICE_GROUPS,
} from "./publicPriceBook.ts";

test("publishes the complete brochure route catalog", () => {
  assert.equal(PUBLIC_PRICE_GROUPS.length, 3);
  assert.equal(
    PUBLIC_PRICE_GROUPS.reduce((total, group) => total + group.services.length, 0),
    14
  );
  assert.deepEqual(PUBLIC_FLEET_KEYS, [
    "altis",
    "suv",
    "van",
    "minibus",
    "bus",
  ]);
});

test("keeps the published Bangkok to Khao Yai selling prices", () => {
  const service = PUBLIC_PRICE_GROUPS
    .flatMap((group) => group.services)
    .find((item) => item.id === "bangkok-khaoyai");

  assert.deepEqual(service?.prices, {
    altis: 4200,
    suv: 4700,
    van: 5500,
  });
});

test("uses missing Mini Bus and Bus prices for contact fallback", () => {
  const services = PUBLIC_PRICE_GROUPS.flatMap((group) => group.services);
  const bangkok = services.find((item) => item.id === "at-bangkok");
  const chiangMai = services.find((item) => item.id === "cm-cr");

  assert.equal(bangkok?.prices?.minibus, undefined);
  assert.equal(bangkok?.prices?.bus, undefined);
  assert.equal(chiangMai?.contact, true);
  assert.equal(chiangMai?.prices, undefined);
});
