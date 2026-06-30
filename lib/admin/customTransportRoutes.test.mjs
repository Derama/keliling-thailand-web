import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
