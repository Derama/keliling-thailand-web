import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativeUrl) {
  return readFile(new URL(relativeUrl, import.meta.url), "utf8").catch(() => "");
}

test("supports brochure templates without dropping existing document rows", async () => {
  const helper = await source("./docLibrary.ts");
  const migration = await source(
    "../../scripts/migrations/013-document-template-brochures.sql"
  );

  assert.match(helper, /"invoice" \| "joborder" \| "brochure"/);
  assert.match(migration, /create table if not exists document_templates/i);
  assert.match(
    migration,
    /drop constraint if exists document_templates_kind_check/i
  );
  assert.match(
    migration,
    /kind in \('invoice', 'joborder', 'brochure'\)/i
  );
  assert.doesNotMatch(migration, /drop table/i);
});

test("shared document library exposes create, open, duplicate, and delete", async () => {
  const view = await source(
    "../../components/admin/views/DocumentLibraryView.tsx"
  );

  assert.match(view, /listTemplates/);
  assert.match(view, /createTemplate/);
  assert.match(view, /deleteTemplate/);
  assert.match(view, /renderBuilder\(openId/);
  for (const label of ["Buka", "Duplikat", "Hapus"]) {
    assert.match(view, new RegExp(label));
  }
});

test("invoice library mode edits templates without accounting side effects", async () => {
  const builder = await source(
    "../../components/admin/views/InvoiceBuilderView.tsx"
  );
  const library = await source(
    "../../components/admin/views/InvoiceLibraryView.tsx"
  );

  assert.match(builder, /templateId\?: string/);
  assert.match(builder, /onExit\?: \(\) => void/);
  assert.match(builder, /loadTemplate<InvoiceDraft>\(templateId\)/);
  assert.match(builder, /saveTemplate\(\s*templateId/);
  assert.match(builder, /if \(!orderId\) return/);
  assert.match(library, /kind="invoice"/);
  assert.match(library, /InvoiceBuilderView templateId=\{id\} onExit=\{onExit\}/);
});

test("job-order library mode saves the selected template row", async () => {
  const builder = await source(
    "../../components/admin/views/JobOrderBuilderView.tsx"
  );
  const library = await source(
    "../../components/admin/views/JobOrderLibraryView.tsx"
  );

  assert.match(builder, /templateId\?: string/);
  assert.match(builder, /onExit\?: \(\) => void/);
  assert.match(builder, /loadTemplate<JobOrderData>\(templateId\)/);
  assert.match(builder, /saveTemplate\(\s*templateId/);
  assert.match(library, /kind="joborder"/);
  assert.match(library, /JobOrderBuilderView templateId=\{id\} onExit=\{onExit\}/);
});

test("brochure library mode and order mode share the brochure template store", async () => {
  const builder = await source(
    "../../components/admin/views/BrochureBuilderView.tsx"
  );
  const library = await source(
    "../../components/admin/views/BrochureLibraryView.tsx"
  );

  assert.match(builder, /export interface BrochureDraft/);
  assert.match(builder, /templateId\?: string/);
  assert.match(builder, /loadTemplate<BrochureDraft>\(templateId\)/);
  assert.match(builder, /createTemplate\(\s*"brochure"/);
  assert.match(builder, /listTemplates<BrochureDraft>\("brochure"\)/);
  assert.match(builder, /saveOrderDoc\(orderId, "brochure"/);
  assert.match(library, /kind="brochure"/);
  assert.match(library, /BrochureBuilderView templateId=\{id\} onExit=\{onExit\}/);
});

test("admin document tabs open library views instead of blank builders", async () => {
  const adminPage = await source("../../app/admin/(panel)/page.tsx");

  for (const view of [
    "InvoiceLibraryView",
    "BrochureLibraryView",
    "JobOrderLibraryView",
  ]) {
    assert.match(adminPage, new RegExp(`import ${view}`));
    assert.match(adminPage, new RegExp(`View: ${view}`));
  }
});
