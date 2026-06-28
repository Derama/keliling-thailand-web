// lib/admin/docLibrary.labels.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickerRow } from "./docLibrary.labels.ts";

test("uses explicit title when present", () => {
  const row = pickerRow({
    id: "a",
    title: "Bangkok 4D3N",
    data: { days: [{}, {}] },
    updated_at: "2026-06-01T10:00:00Z",
    order_number: "ORD-1",
  });
  assert.equal(row.id, "a");
  assert.equal(row.label, "Bangkok 4D3N");
  assert.match(row.sub, /2 hari/);
  assert.match(row.sub, /ORD-1/);
});

test("falls back to draft fields when title blank", () => {
  const row = pickerRow({
    id: "b",
    title: "  ",
    data: { tripTitle: "Pattaya", customer: "Budi", days: [] },
    updated_at: "2026-06-01T10:00:00Z",
    order_number: null,
  });
  assert.equal(row.label, "Pattaya · Budi");
});

test("final fallback label when nothing usable", () => {
  const row = pickerRow({ id: "c", title: "", data: {}, updated_at: "" });
  assert.equal(row.label, "Tanpa judul");
});

test("invoice-style draft uses invoiceNumber/billTo", () => {
  const row = pickerRow({
    id: "d",
    title: "",
    data: { invoiceNumber: "INV-2026-0007", billTo: "Love Bangkok" },
    updated_at: "2026-06-01T10:00:00Z",
    order_number: null,
  });
  assert.equal(row.label, "INV-2026-0007 · Love Bangkok");
});
