// lib/admin/leadMessaging.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillTemplate, waLink, profileUrl } from "./leadMessaging.ts";

test("fillTemplate replaces {nama}", () => {
  assert.equal(fillTemplate("Halo {nama}!", { name: "Andi" }), "Halo Andi!");
});

test("fillTemplate leaves unknown placeholders untouched", () => {
  assert.equal(fillTemplate("Hi {nama} {foo}", { name: "Sari" }), "Hi Sari {foo}");
});

test("fillTemplate handles empty name", () => {
  assert.equal(fillTemplate("Halo {nama}", { name: "" }), "Halo ");
});

test("waLink strips non-digits and encodes text", () => {
  assert.equal(waLink("+62 812-3456", "Hi there"), "https://wa.me/628123456?text=Hi%20there");
});

test("waLink returns null when phone empty/null", () => {
  assert.equal(waLink("", "x"), null);
  assert.equal(waLink(null, "x"), null);
});

test("profileUrl builds per-channel URLs from a bare handle", () => {
  assert.equal(profileUrl("instagram", "andi"), "https://instagram.com/andi");
  assert.equal(profileUrl("instagram", "@andi"), "https://instagram.com/andi");
  assert.equal(profileUrl("tiktok", "budi"), "https://www.tiktok.com/@budi");
  assert.equal(profileUrl("facebook", "rina"), "https://facebook.com/rina");
});

test("profileUrl passes through a full URL", () => {
  assert.equal(profileUrl("website", "https://foo.com/x"), "https://foo.com/x");
});

test("profileUrl returns null when not derivable", () => {
  assert.equal(profileUrl("whatsapp", "0812"), null);
  assert.equal(profileUrl("other", "just text"), null);
  assert.equal(profileUrl("instagram", null), null);
});
