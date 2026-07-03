import assert from "node:assert/strict";
import test from "node:test";

import { createInitialPlan } from "./planner.ts";
import { cities, getCity } from "./tours.ts";

test("creates an empty one-day plan without a city", () => {
  assert.deepEqual(createInitialPlan(), {
    initialStep: 0,
    tripCities: [""],
    picks: [[]],
    customPlaces: [[]],
  });
});

test("creates a one-day plan prefilled with the selected city", () => {
  const city = getCity("bangkok");
  assert.ok(city);

  const plan = createInitialPlan("bangkok", cities);

  assert.equal(plan.initialStep, 2);
  assert.deepEqual(plan.tripCities, ["bangkok"]);
  assert.deepEqual(plan.customPlaces, [[]]);
  assert.ok(plan.picks[0].length > 0);
  assert.ok(
    plan.picks[0].every((id) => city.attractions.some((item) => item.id === id)),
  );
  assert.ok(
    plan.picks[0].reduce(
      (hours, id) =>
        hours + (city.attractions.find((item) => item.id === id)?.hours ?? 0),
      0,
    ) <= city.durationHours,
  );
});

test("falls back to an empty plan for an unknown city", () => {
  assert.deepEqual(createInitialPlan("unknown", cities), createInitialPlan());
});
