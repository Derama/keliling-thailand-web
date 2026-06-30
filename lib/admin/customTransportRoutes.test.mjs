import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  customRouteToService,
  mergeCustomTransportRoutes,
  normalizeNewTransportRouteInput,
} from "./customTransportRoutes.ts";

const migrationUrl = new URL(
  "../../scripts/migrations/014-custom-transport-routes.sql",
  import.meta.url
);

test("custom routes use one validated row with authenticated RLS", async () => {
  const sql = await readFile(migrationUrl, "utf8").catch(() => "");

  assert.match(sql, /create table if not exists custom_transport_routes/i);
  for (const column of [
    "group_name",
    "name",
    "altis_cost",
    "altis_sell",
    "suv_cost",
    "suv_sell",
    "van_cost",
    "van_sell",
    "sort",
  ]) {
    assert.match(sql, new RegExp(`\\b${column}\\b`, "i"));
  }
  assert.match(sql, /check \(char_length\(trim\(group_name\)\) > 0\)/i);
  assert.match(sql, /check \(char_length\(trim\(name\)\) > 0\)/i);
  assert.match(
    sql,
    /alter table custom_transport_routes enable row level security/i
  );
  assert.match(
    sql,
    /for all to authenticated using \(true\) with check \(true\)/i
  );
  assert.doesNotMatch(sql, /drop table/i);
});

const rayong = {
  id: "11111111-1111-4111-8111-111111111111",
  group_name: "Airport Pickup",
  name: "BKK → Rayong",
  altis_cost: 1500,
  altis_sell: 2100,
  suv_cost: 1800,
  suv_sell: 2400,
  van_cost: 2200,
  van_sell: 2900,
  sort: 20,
};

test("converts one custom route into the existing fleet price shape", () => {
  const service = customRouteToService(rayong);
  assert.equal(service.id, rayong.id);
  assert.equal(service.name, "BKK → Rayong");
  assert.deepEqual(service.prices, {
    altis: { cost: 1500, sell: 2100 },
    suv: { cost: 1800, sell: 2400 },
    van: { cost: 2200, sell: 2900 },
  });
  assert.deepEqual(service.customRoute, rayong);
});

test("joins an exact existing group without changing built-in prices", () => {
  const builtIn = [
    {
      group: "Airport Pickup",
      services: [
        {
          id: "base",
          name: "DMK → Bangkok",
          prices: {
            altis: { cost: 901, sell: 1301 },
            suv: { cost: 1001, sell: 1501 },
            van: { cost: 1201, sell: 1801 },
          },
        },
      ],
    },
  ];
  const merged = mergeCustomTransportRoutes(builtIn, [rayong]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].services[0].id, "base");
  assert.deepEqual(merged[0].services[0].prices.altis, {
    cost: 901,
    sell: 1301,
  });
  assert.equal(merged[0].services[1].id, rayong.id);
});

test("creates new groups and preserves custom route sort order", () => {
  const later = {
    ...rayong,
    id: "later",
    group_name: "Private Transfer",
    sort: 30,
  };
  const earlier = {
    ...rayong,
    id: "earlier",
    group_name: "Private Transfer",
    sort: 10,
  };
  const merged = mergeCustomTransportRoutes([], [later, earlier]);
  assert.deepEqual(merged, [
    {
      group: "Private Transfer",
      services: [
        customRouteToService(earlier),
        customRouteToService(later),
      ],
    },
  ]);
});

test("normalizes a valid new-route draft", () => {
  assert.deepEqual(
    normalizeNewTransportRouteInput({
      group_name: "  Airport Pickup ",
      name: " BKK → Rayong  ",
      altis_cost: "1500",
      altis_sell: "2100",
      suv_cost: "",
      suv_sell: "2400",
      van_cost: "2200",
      van_sell: "2900",
    }),
    {
      group_name: "Airport Pickup",
      name: "BKK → Rayong",
      altis_cost: 1500,
      altis_sell: 2100,
      suv_cost: 0,
      suv_sell: 2400,
      van_cost: 2200,
      van_sell: 2900,
    }
  );
});

test("rejects blank names and negative prices", () => {
  const validDraft = {
    group_name: "Airport Pickup",
    name: "BKK → Rayong",
    altis_cost: "1500",
    altis_sell: "2100",
    suv_cost: "1800",
    suv_sell: "2400",
    van_cost: "2200",
    van_sell: "2900",
  };

  assert.equal(
    normalizeNewTransportRouteInput({ ...validDraft, name: "  " }),
    null
  );
  assert.equal(
    normalizeNewTransportRouteInput({ ...validDraft, van_sell: "-1" }),
    null
  );
});
