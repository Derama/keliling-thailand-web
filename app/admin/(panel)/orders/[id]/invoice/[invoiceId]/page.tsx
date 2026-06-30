"use client";

import { use } from "react";
import InvoiceView from "@/components/admin/views/InvoiceView";

export default function InvoicePage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = use(params);
  return <InvoiceView orderId={id} invoiceId={invoiceId} />;
}
