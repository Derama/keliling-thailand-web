"use client";

import { use } from "react";
import InvoiceBuilderView from "@/components/admin/views/InvoiceBuilderView";

export default function OrderInvoiceBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <InvoiceBuilderView orderId={id} />;
}
