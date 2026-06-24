"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer } from "@/lib/admin/types";
import { formatDate } from "@/lib/admin/utils";
import PrintDoc from "@/components/admin/PrintDoc";
import PrintTracker from "@/components/admin/PrintTracker";
import { ErrorNote } from "@/components/admin/ui";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-36 shrink-0 text-gray-500">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

export default function JobOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderWithCustomer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("orders")
      .select("*, customers(*)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrder(data as OrderWithCustomer);
      });
  }, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!order) return <p className="text-gray-400">Memuat…</p>;

  const dates =
    order.trip_end && order.trip_end !== order.trip_start
      ? `${formatDate(order.trip_start)} – ${formatDate(order.trip_end)}`
      : formatDate(order.trip_start);

  return (
    <PrintDoc title="Job Order" docNumber={order.order_number}>
      <PrintTracker orderId={order.id} />
      <div className="grid gap-x-8 sm:grid-cols-2">
        <div>
          <Row label="Customer" value={order.customers.name} />
          <Row label="WhatsApp" value={order.customers.phone ?? ""} />
          <Row label="Jumlah pax" value={order.pax ? String(order.pax) : ""} />
          <Row label="Tanggal" value={dates} />
        </div>
        <div>
          <Row label="Kendaraan" value={order.vehicle ?? ""} />
          <Row label="Sopir" value={order.driver_name ?? ""} />
          <Row label="Lokasi jemput" value={order.pickup_location ?? ""} />
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold text-[#1B2A4A]">Itinerary</p>
        <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
          {order.itinerary || "—"}
        </p>
      </div>
    </PrintDoc>
  );
}
