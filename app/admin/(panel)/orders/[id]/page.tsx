"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import OrderDetail from "@/components/admin/OrderDetail";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  return (
    <OrderDetail id={id} onDeleted={() => router.push("/admin/orders")} />
  );
}
