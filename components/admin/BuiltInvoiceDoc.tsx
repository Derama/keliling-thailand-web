"use client";

import PrintDoc from "@/components/admin/PrintDoc";
import { formatTHB } from "@/lib/admin/utils";
import { OPERATOR_MARGIN, type InvoiceMode, type InvoiceLine } from "@/lib/admin/invoice";

export default function BuiltInvoiceDoc({
  mode,
  billTo,
  invoiceNumber,
  date,
  lines,
}: {
  mode: InvoiceMode;
  billTo: string;
  invoiceNumber: string;
  date: string;
  lines: InvoiceLine[];
}) {
  const isOperator = mode === "operator";
  const title = isOperator ? "Invoice — Tour Operator" : "Invoice";

  const customerTotal = lines.reduce((s, l) => s + l.sell, 0);
  const capitalTotal = lines.reduce((s, l) => s + l.capital, 0);
  const marginTotal = lines.length * OPERATOR_MARGIN;
  const operatorTotal = capitalTotal + marginTotal;

  return (
    <PrintDoc title={title} docNumber={invoiceNumber}>
      <div className="flex justify-between text-sm">
        <div>
          <p className="text-gray-500">Ditagihkan kepada</p>
          <p className="font-semibold">{billTo || "—"}</p>
        </div>
        <div className="text-right">
          <p>
            <span className="text-gray-500">Tanggal: </span>
            {date || "—"}
          </p>
          {isOperator && (
            <p className="text-gray-500">Vendor: Love Bangkok Co., Ltd</p>
          )}
        </div>
      </div>

      {isOperator ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#1B2A4A] text-left">
              <th className="py-2">Deskripsi</th>
              <th className="py-2 text-right">Modal</th>
              <th className="py-2 text-right">+ Margin</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2">{l.desc || "—"}</td>
                <td className="py-2 text-right">{formatTHB(l.capital)}</td>
                <td className="py-2 text-right">{formatTHB(OPERATOR_MARGIN)}</td>
                <td className="py-2 text-right">
                  {formatTHB(l.capital + OPERATOR_MARGIN)}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2">Grand total</td>
              <td className="py-2 text-right">{formatTHB(capitalTotal)}</td>
              <td className="py-2 text-right">{formatTHB(marginTotal)}</td>
              <td className="py-2 text-right">{formatTHB(operatorTotal)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#1B2A4A] text-left">
              <th className="py-2">Deskripsi</th>
              <th className="py-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2">{l.desc || "—"}</td>
                <td className="py-2 text-right">{formatTHB(l.sell)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2">Total</td>
              <td className="py-2 text-right">{formatTHB(customerTotal)}</td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="rounded-lg bg-gray-50 p-4 text-sm">
        <p className="text-gray-500">Pembayaran transfer ke:</p>
        {isOperator ? (
          <>
            <p className="font-semibold">Kasikorn Bank</p>
            <p>0393917873 — Ekarat Tanawatsakul</p>
          </>
        ) : (
          <>
            <p className="font-semibold">Bank Central Asia (BCA)</p>
            <p>1250836216 — Deva Adithya Rama</p>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Semua harga dalam Thai Baht (THB), termasuk sopir, bensin, dan tol.
      </p>
    </PrintDoc>
  );
}
