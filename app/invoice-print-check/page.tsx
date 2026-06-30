"use client";

import BuiltInvoiceDoc from "@/components/admin/BuiltInvoiceDoc";
import type { InvoiceLine } from "@/lib/admin/invoice";

const lines: InvoiceLine[] = Array.from({ length: 16 }, (_, i) => ({
  id: `debug-${i + 1}`,
  desc: `Private Bangkok city transfer and guide service ${i + 1}`,
  serviceType: i % 3 === 0 ? "Van" : i % 3 === 1 ? "Ticket" : "Tour",
  capital: 1200 + i * 20,
  margin: 300,
  sell: 1800 + i * 30,
  qty: (i % 2) + 1,
}));

export default function InvoicePrintCheckPage() {
  function printInvoice() {
    const style = document.createElement("style");
    style.dataset.ktInvoicePrint = "true";
    style.textContent =
      "@media print { @page { size: A4 !important; margin: 0 !important; } }";
    document.head.appendChild(style);
    const restore = () => {
      style.remove();
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  return (
    <main className="mx-auto max-w-7xl p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-6 lg:p-8 print:max-w-none print:m-0! print:p-0! print:pb-0!">
      <div className="space-y-6">
        <div className="no-print flex h-20 items-center justify-center rounded-xl bg-gray-100">
          <button
            type="button"
            onClick={printInvoice}
            className="rounded-lg bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#1B2A4A]"
          >
            Print / Simpan PDF
          </button>
        </div>
        <div className="grid items-start gap-6 min-[1280px]:grid-cols-[minmax(380px,1fr)_minmax(0,820px)] print:block">
          <div className="no-print h-[720px] rounded-xl bg-gray-100" />
          <div className="overflow-x-auto print:overflow-visible">
            <BuiltInvoiceDoc
              mode="customer"
              billTo="Debug Customer"
              docTitle="Debug two-page invoice"
              invoiceNumber="INV-TWO-PAGE-CHECK"
              date="2026-06-25"
              dueDate="2026-06-30"
              status="awaiting"
              lines={lines}
              idrRate={450}
              custPIC="Deva"
              custPhone="+62 812 0000 0000"
              custEmail="debug@example.com"
              custAddress="Jakarta, Indonesia"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
