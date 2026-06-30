import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("./ItineraryDoc.tsx", import.meta.url),
  "utf8"
);
const builderSource = await readFile(
  new URL("./views/ItineraryBuilderView.tsx", import.meta.url),
  "utf8"
);
const modalSource = await readFile(new URL("./Modal.tsx", import.meta.url), "utf8");
const ordersSource = await readFile(
  new URL("./views/OrdersView.tsx", import.meta.url),
  "utf8"
);
const invoiceBuilderSource = await readFile(
  new URL("./views/InvoiceBuilderView.tsx", import.meta.url),
  "utf8"
);
const jobOrderBuilderSource = await readFile(
  new URL("./views/JobOrderBuilderView.tsx", import.meta.url),
  "utf8"
);

test("renders both named contacts as full-width single-line rows", () => {
  assert.match(
    source,
    /label=\{waContact \? waContact\.name : "WhatsApp"\}[\s\S]*?value=\{k\.whatsapp\}[\s\S]*?wide[\s\S]*?singleLine/
  );
  assert.match(
    source,
    /label=\{c\.name\}[\s\S]*?value=\{c\.phone\}[\s\S]*?wide[\s\S]*?singleLine/
  );
});

test("keeps Instagram and Facebook in two columns at every preview width", () => {
  assert.match(
    source,
    /className="grid min-w-0 flex-1 grid-cols-2 gap-x-8 text-xs"/
  );
  assert.match(source, /wide \? "col-span-2" : ""/);
  assert.match(
    source,
    /<ContactRow label="Instagram" value=\{k\.instagram\} singleLine \/>/
  );
  assert.match(
    source,
    /<ContactRow label="Facebook" value=\{k\.facebook\} singleLine \/>/
  );
});

test("keeps the order-detail itinerary preview at its A4 design width", () => {
  assert.match(
    builderSource,
    /min-\[1500px\]:grid-cols-\[minmax\(360px,440px\)_minmax\(858px,1fr\)\]/
  );
  assert.match(
    builderSource,
    /Math\.min\(1, host\.clientWidth \/ 858\)/
  );
  assert.match(builderSource, /new ResizeObserver\(updateScale\)/);
  assert.match(
    builderSource,
    /className="w-full overflow-hidden print:overflow-visible"/
  );
  assert.match(builderSource, /style=\{\{ zoom: previewScale \}\}/);
});

test("opens the selected-order workspace in an expanded modal", () => {
  assert.match(modalSource, /expanded = false/);
  assert.match(
    modalSource,
    /h-\[calc\(100dvh-2rem\)\] w-\[calc\(100vw-2rem\)\] max-w-\[1600px\] rounded-2xl/
  );
  assert.match(
    ordersSource,
    /title=\{selected\?\.order_number \?\? "Order"\}[\s\S]*?wide[\s\S]*?expanded[\s\S]*?printIsolate/
  );
});

test("uses the compact editor proportion in invoice and job-order builders", () => {
  const proportionalGrid =
    /min-\[1500px\]:grid-cols-\[minmax\(360px,440px\)_minmax\(858px,1fr\)\]/;
  assert.match(invoiceBuilderSource, proportionalGrid);
  assert.match(jobOrderBuilderSource, proportionalGrid);
});
