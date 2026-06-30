import assert from "node:assert/strict";
import test from "node:test";

import { buildRouteCatalogSections } from "./invoiceCatalog.ts";

test("expands a priced route into Altis, SUV, and Van catalog items", () => {
  const sections = buildRouteCatalogSections([
    {
      group: "Private Transfer",
      services: [
        {
          id: "rayong",
          name: "BKK → Rayong",
          prices: {
            altis: { cost: 1500, sell: 2100 },
            suv: { cost: 1800, sell: 2400 },
            van: { cost: 2200, sell: 2900 },
          },
        },
      ],
    },
  ]);

  assert.deepEqual(
    sections[0].items.map(({ key, label, capital, sell }) => ({
      key,
      label,
      capital,
      sell,
    })),
    [
      {
        key: "route-rayong-altis",
        label: "BKK → Rayong · Altis",
        capital: 1500,
        sell: 2100,
      },
      {
        key: "route-rayong-suv",
        label: "BKK → Rayong · SUV",
        capital: 1800,
        sell: 2400,
      },
      {
        key: "route-rayong-van",
        label: "BKK → Rayong · Van",
        capital: 2200,
        sell: 2900,
      },
    ]
  );
});
