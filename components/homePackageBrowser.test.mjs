import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(path, import.meta.url), "utf8").catch(() => "");

const homeSource = await readSource("./HomeContent.tsx");
const modalSource = await readSource("./HomePackageBrowserModal.tsx");
const translationsSource = await readSource("../lib/translations.ts");
const globalCssSource = await readSource("../app/globals.css");

test("adds a secondary package-browser action to the homepage hero", () => {
  assert.match(homeSource, /t\.home\.packageBrowser\.openButton/);
  assert.match(homeSource, /setPackageBrowserTrigger\(event\.currentTarget\)/);
  assert.match(homeSource, /<HomePackageBrowserModal/);
  assert.match(homeSource, /packageBrowserTrigger\?\.focus\(\)/);
});

test("shows the complete existing package catalog and custom option", () => {
  assert.match(modalSource, /tourPackages\.map/);
  assert.match(modalSource, /<PackageCard/);
  assert.match(modalSource, /waLink\(t\.packages\.customWaMessage\)/);
  assert.match(modalSource, /t\.packages\.customTitle/);
  assert.match(modalSource, /t\.packages\.customButton/);
});

test("uses an accessible dismissible dialog with scroll locking", () => {
  assert.match(modalSource, /role="dialog"/);
  assert.match(modalSource, /aria-modal="true"/);
  assert.match(modalSource, /aria-labelledby=\{titleId\}/);
  assert.match(modalSource, /event\.key === "Escape"/);
  assert.match(modalSource, /event\.target === event\.currentTarget/);
  assert.match(modalSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(modalSource, /closeButtonRef\.current\?\.focus\(\)/);
});

test("localizes package-browser copy in all three languages", () => {
  for (const key of ["openButton", "title", "description", "close", "customAria"]) {
    assert.equal(
      translationsSource.match(new RegExp(`${key}:`, "g"))?.length >= 3,
      true,
      `${key} must exist in all three package-browser translations`,
    );
  }
  assert.equal(
    translationsSource.match(/packageBrowser: \{/g)?.length,
    3,
    "packageBrowser must exist in all three locales",
  );
});

test("matches planner motion with capped staggering and reduced-motion support", () => {
  assert.match(modalSource, /planner-overlay/);
  assert.match(modalSource, /planner-panel/);
  assert.match(modalSource, /package-browser-stagger/);
  assert.match(modalSource, /active:scale-\[0\.97\]/);
  assert.match(homeSource, /active:scale-\[0\.97\]/);
  assert.match(globalCssSource, /\.package-browser-stagger > \*/);
  assert.match(globalCssSource, /nth-child\(n \+ 9\)/);
  assert.match(globalCssSource, /35ms/);
  assert.match(globalCssSource, /@media \(prefers-reduced-motion: reduce\)/);
});
