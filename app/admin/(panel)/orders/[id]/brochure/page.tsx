"use client";

import { use } from "react";
import BrochureBuilderView from "@/components/admin/views/BrochureBuilderView";

export default function OrderBrochurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <BrochureBuilderView orderId={id} />;
}
