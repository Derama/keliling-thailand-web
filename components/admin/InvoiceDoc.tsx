"use client";

import type { Invoice, OrderWithCustomer, Payment } from "@/lib/admin/types";
import { INVOICE_TYPE_LABELS } from "@/lib/admin/types";
import { formatIDR, formatDate } from "@/lib/admin/utils";
import PrintDoc from "@/components/admin/PrintDoc";

// TODO-OPS: replace with the real bank account before first customer invoice.
const BANK_DETAILS = [
  "Transfer ke:",
  "BCA 1234567890",
  "a.n. Keliling Thailand",
];

export default function InvoiceDoc({
  invoice,
  order,
  payments,
}: {
  invoice: Invoice;
  order: OrderWithCustomer;
  payments: Payment[];
}) {
  const paid = payments.reduce((sum, p) => sum + Number(p.amount_idr), 0);
  const balance = Number(order.price_idr) - paid;

  return (
    <PrintDoc title="Invoice" docNumber={invoice.invoice_number}>
      <div className="flex justify-between text-sm">
        <div>
          <p className="text-gray-500">Ditagihkan kepada</p>
          <p className="font-semibold">{order.customers.name}</p>
          {order.customers.phone && <p>{order.customers.phone}</p>}
        </div>
        <div className="text-right">
          <p>
            <span className="text-gray-500">Tanggal: </span>
            {formatDate(invoice.issued_at)}
          </p>
          <p>
            <span className="text-gray-500">Order: </span>
            {order.order_number}
          </p>
          <p>
            <span className="text-gray-500">Jenis: </span>
            {INVOICE_TYPE_LABELS[invoice.type]}
          </p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-[#1B2A4A] text-left">
            <th className="py-2">Deskripsi</th>
            <th className="py-2 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((it, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2">{it.description}</td>
              <td className="py-2 text-right">
                {formatIDR(Number(it.amount_idr))}
              </td>
            </tr>
          ))}
          <tr>
            <td className="py-2 font-bold">Total invoice ini</td>
            <td className="py-2 text-right font-bold">
              {formatIDR(Number(invoice.amount_idr))}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="rounded-lg bg-gray-50 p-4 text-sm">
        <p>
          Total paket: <strong>{formatIDR(Number(order.price_idr))}</strong> ·
          Sudah dibayar: <strong>{formatIDR(paid)}</strong> · Sisa:{" "}
          <strong className={balance <= 0 ? "text-green-700" : ""}>
            {formatIDR(Math.max(balance, 0))}
          </strong>
        </p>
      </div>

      <div className="text-sm">
        {BANK_DETAILS.map((line, i) => (
          <p key={i} className={i === 0 ? "text-gray-500" : "font-medium"}>
            {line}
          </p>
        ))}
      </div>
    </PrintDoc>
  );
}
