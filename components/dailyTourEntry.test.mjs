import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const toursSource = await readFile(
  new URL("./ToursContent.tsx", import.meta.url),
  "utf8",
);
const cityCardSource = await readFile(
  new URL("./CityCard.tsx", import.meta.url),
  "utf8",
);
const translationsSource = await readFile(
  new URL("../lib/translations.ts", import.meta.url),
  "utf8",
);
const homeSource = await readFile(
  new URL("./HomeContent.tsx", import.meta.url),
  "utf8",
);
const navbarSource = await readFile(
  new URL("./Navbar.tsx", import.meta.url),
  "utf8",
);

test("opens a city-prefilled planner from every daily-tour card", () => {
  assert.match(toursSource, /onPlan=\{\(city\) => openPlanner\(city\.id\)\}/);
  assert.doesNotMatch(
    toursSource,
    /tab === "packages"[\s\S]*?: \([\s\S]*?<button[\s\S]*?\{t\.planner\.openButton\}/,
  );
});

test("keeps itinerary navigation separate from the planning action", () => {
  assert.match(cityCardSource, /onPlan\?: \(city: City\) => void/);
  assert.match(cityCardSource, /<Link[\s\S]*?<\/Link>[\s\S]*?<button/);
  assert.match(cityCardSource, /t\.packages\.dailyPlanButton/);
  assert.match(cityCardSource, /t\.packages\.dailyPlanAria/);
});

test("shows a localized multi-day fallback after the city grid", () => {
  const gridEnd = toursSource.indexOf("</div>", toursSource.indexOf("cities.map"));
  const fallback = toursSource.indexOf("t.packages.multiDayTitle");

  assert.ok(gridEnd >= 0);
  assert.ok(fallback > gridEnd);
  assert.match(toursSource, /onClick=\{\(\) => openPlanner\(\)\}/);

  for (const key of [
    "dailyPlanButton",
    "dailyPlanAria",
    "multiDayTitle",
    "multiDayDesc",
    "multiDayButton",
  ]) {
    assert.equal(
      translationsSource.match(new RegExp(`${key}:`, "g"))?.length,
      3,
      `${key} must exist in all three locales`,
    );
  }
});

test("global planner buttons do not forward click events as city IDs", () => {
  assert.doesNotMatch(homeSource, /onClick=\{openPlanner\}/);
  assert.doesNotMatch(navbarSource, /onClick=\{openPlanner\}/);
});
