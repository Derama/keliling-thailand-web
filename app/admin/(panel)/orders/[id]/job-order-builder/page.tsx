"use client";

import { use } from "react";
import JobOrderBuilderView from "@/components/admin/views/JobOrderBuilderView";

export default function OrderJobOrderBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <JobOrderBuilderView orderId={id} />;
}
