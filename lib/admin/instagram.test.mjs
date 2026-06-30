import assert from "node:assert/strict";
import test from "node:test";

import {
  FORMAT_SIZES,
  defaultPostData,
  buildPolishPrompt,
  buildCaptionMessages,
  TEMPLATE_IDS,
} from "./instagram.ts";

test("FORMAT_SIZES gives 1080px-wide canvases per ratio", () => {
  assert.deepEqual(FORMAT_SIZES["4x5"], { w: 1080, h: 1350 });
  assert.deepEqual(FORMAT_SIZES["1x1"], { w: 1080, h: 1080 });
  assert.deepEqual(FORMAT_SIZES["9x16"], { w: 1080, h: 1920 });
});

test("defaultPostData seeds brand colors and empty content", () => {
  const d = defaultPostData();
  assert.equal(d.reviewText, "");
  assert.equal(d.rating, 5);
  assert.equal(d.brandColors.navy, "#1B2A4A");
  assert.equal(d.brandColors.yellow, "#F5C518");
});

test("TEMPLATE_IDS lists the six layouts", () => {
  assert.deepEqual(TEMPLATE_IDS, ["A", "B", "C", "D", "E", "F"]);
});

test("buildPolishPrompt forbids fabrication and keeps language", () => {
  const { system, user } = buildPolishPrompt("Tournya bgus bgt mantap");
  assert.match(system, /same language/i);
  assert.match(system, /not (invent|add|fabricate)/i);
  assert.match(user, /Tournya bgus bgt mantap/);
});

test("buildCaptionMessages includes review, name, destination", () => {
  const msgs = buildCaptionMessages({
    reviewText: "Pelayanan ramah",
    customerName: "Ibu Sari",
    destination: "Bangkok",
  });
  const userMsg = msgs.find((m) => m.role === "user").content;
  assert.match(userMsg, /Pelayanan ramah/);
  assert.match(userMsg, /Ibu Sari/);
  assert.match(userMsg, /Bangkok/);
  const sysMsg = msgs.find((m) => m.role === "system").content;
  assert.match(sysMsg, /Bahasa Indonesia/i);
  assert.match(sysMsg, /hashtag/i);
});
