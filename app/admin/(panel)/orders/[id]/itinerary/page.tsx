"use client";

import { use } from "react";
import ItineraryBuilderView from "@/components/admin/views/ItineraryBuilderView";

export default function OrderItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ItineraryBuilderView orderId={id} />;
}
