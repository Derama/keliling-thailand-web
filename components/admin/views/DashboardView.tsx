"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithCustomer, Payment } from "@/lib/admin/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/admin/types";
import {
  formatIDR,
  formatTHB,
  formatDate,
  profitTHB,
  profitIDR,
  isoLocal,
} from "@/lib/admin/utils";
import { ErrorNote } from "@/components/admin/ui";

// Statuses that count as real (booked) business. `inquiry` is shown separately
// as pipeline; `cancelled` is excluded everywhere.
const ACTIVE = ["confirmed", "ongoing", "completed"] as const;

type Period = "month" | "lastMonth" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  month: "Bulan ini",
  lastMonth: "Bulan lalu",
  year: "Tahun ini",
  all: "Semua",
};

// Text for the delta sub-line, naming the period each card is compared against.
const DELTA_VS: Record<Period, string | null> = {
  month: "vs bulan lalu",
  lastMonth: "vs bulan sebelumnya",
  year: "vs tahun lalu",
  all: null,
};

type Range = [string, string] | null; // [startIso, endIso); null = all-time.

function monthStart(y: number, m: number): string {
  return isoLocal(new Date(y, m, 1));
}

/** Date range for the selected period, or null for all-time. */
function rangeFor(period: Period): Range {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "all":
      return null;
    case "year":
      return [monthStart(y, 0), monthStart(y + 1, 0)];
    case "lastMonth":
      return [monthStart(y, m - 1), monthStart(y, m)];
    case "month":
    default:
      return [monthStart(y, m), monthStart(y, m + 1)];
  }
}

/** The previous comparable range, for delta. Null when there's nothing to
 *  compare against (all-time). */
function prevRangeFor(period: Period): Range {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "all":
      return null;
    case "year":
      return [monthStart(y - 1, 0), monthStart(y, 0)];
    case "lastMonth":
      return [monthStart(y, m - 2), monthStart(y, m - 1)];
    case "month":
    default:
      return [monthStart(y, m - 1), monthStart(y, m)];
  }
}

function inRange(iso: string | null, range: Range): boolean {
  if (!range) return true;
  return !!iso && iso >= range[0] && iso < range[1];
}

interface Stats {
  trips: number;
  omzet: number;
  profitIdr: number;
  profitThb: number;
  margin: number | null; // profit / omzet, %
  uninvoiced: number; // active orders with no invoice (price 0)
  costIncomplete: number; // invoiced but no operator cost/rate → profit unknown
  potensiOmzet: number; // inquiry pipeline value
  potensiCount: number;
}

function computeStats(orders: OrderWithCustomer[], range: Range): Stats {
  const active = orders.filter(
    (o) =>
      (ACTIVE as readonly string[]).includes(o.status) &&
      inRange(o.trip_start, range)
  );
  const omzet = active.reduce((s, o) => s + Number(o.price_idr), 0);
  const uninvoiced = active.filter((o) => Number(o.price_idr) <= 0).length;

  // Profit only from orders that carry both an operator cost and an fx rate;
  // otherwise revenue would masquerade as pure profit.
  const profitable = active.filter(
    (o) => Number(o.fx_rate) > 0 && Number(o.cost_thb) > 0
  );
  const profitIdr = profitable.reduce((s, o) => s + (profitIDR(o) ?? 0), 0);
  const profitThb = profitable.reduce((s, o) => s + (profitTHB(o) ?? 0), 0);
  const costIncomplete = active.filter(
    (o) =>
      Number(o.price_idr) > 0 &&
      !(Number(o.cost_thb) > 0 && Number(o.fx_rate) > 0)
  ).length;

  const inquiry = orders.filter(
    (o) => o.status === "inquiry" && inRange(o.trip_start, range)
  );

  return {
    trips: active.length,
    omzet,
    profitIdr,
    profitThb,
    margin: omzet > 0 ? (profitIdr / omzet) * 100 : null,
    uninvoiced,
    costIncomplete,
    potensiOmzet: inquiry.reduce((s, o) => s + Number(o.price_idr), 0),
    potensiCount: inquiry.length,
  };
}

/** Percent change cur vs prev; null when prev is 0 (no baseline). */
function delta(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
        up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(0)}%
    </span>
  );
}

function StatCard({
  label,
  value,
  deltaValue,
  deltaLabel,
  sub,
  nudge,
}: {
  label: string;
  value: string;
  deltaValue?: number | null;
  deltaLabel?: string | null;
  sub?: string;
  nudge?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <p className="text-2xl font-bold text-[#1B2A4A]">{value}</p>
        {deltaValue !== undefined && deltaLabel && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <DeltaBadge value={deltaValue} /> {deltaLabel}
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      {nudge && <p className="mt-1 text-xs font-medium text-amber-600">{nudge}</p>}
    </div>
  );
}

function PeriodSwitcher({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
      {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            value === p
              ? "bg-[#F5C518] text-[#1B2A4A] shadow-sm"
              : "text-gray-500 hover:text-[#1B2A4A]"
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

interface TrendPoint {
  label: string;
  omzet: number;
  trips: number;
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.omzet));
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-[#1B2A4A]">
        Omzet 6 bulan terakhir
      </h2>
      <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
        {points.map((p) => (
          <div
            key={p.label}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[10px] font-medium text-gray-400">
              {p.trips}
            </span>
            <div
              className="w-full rounded-t bg-[#F5C518]"
              style={{
                height: `${Math.round((p.omzet / max) * 100)}%`,
                minHeight: p.omzet > 0 ? 4 : 2,
              }}
              title={formatIDR(p.omzet)}
            />
            <span className="truncate text-[11px] text-gray-500">{p.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Tinggi batang = omzet · angka di atas = jumlah trip.
      </p>
    </section>
  );
}

export default function DashboardView() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("month");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, customers(*)")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders((data as OrderWithCustomer[]) ?? []);
      });
    supabase
      .from("payments")
      .select("*")
      .then(({ data }) => setPayments(data ?? []));
  }, []);

  const stats = useMemo(
    () => computeStats(orders, rangeFor(period)),
    [orders, period]
  );
  const prev = useMemo(
    () => computeStats(orders, prevRangeFor(period)),
    [orders, period]
  );
  const deltaLabel = DELTA_VS[period];

  // Last 6 calendar months (oldest → newest), active orders only.
  const trend = useMemo<TrendPoint[]>(() => {
    const now = new Date();
    const out: TrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const range: Range = [
        monthStart(start.getFullYear(), start.getMonth()),
        monthStart(start.getFullYear(), start.getMonth() + 1),
      ];
      const active = orders.filter(
        (o) =>
          (ACTIVE as readonly string[]).includes(o.status) &&
          inRange(o.trip_start, range)
      );
      out.push({
        label: start.toLocaleDateString("id-ID", { month: "short" }),
        omzet: active.reduce((s, o) => s + Number(o.price_idr), 0),
        trips: active.length,
      });
    }
    return out;
  }, [orders]);

  // Operational lists below stay all-time (work queues, not reporting).
  const today = isoLocal();
  const activeAll = orders.filter((o) =>
    (ACTIVE as readonly string[]).includes(o.status)
  );
  const upcoming = activeAll
    .filter((o) => o.trip_start && o.trip_start >= today)
    .sort((a, b) => (a.trip_start! < b.trip_start! ? -1 : 1))
    .slice(0, 8);

  const paidByOrder = new Map<string, number>();
  for (const p of payments) {
    paidByOrder.set(
      p.order_id,
      (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount_idr)
    );
  }
  const outstanding = activeAll.filter(
    (o) => Number(o.price_idr) > (paidByOrder.get(o.id) ?? 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </div>
      <ErrorNote message={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Trip · ${PERIOD_LABELS[period]}`}
          value={String(stats.trips)}
          deltaValue={delta(stats.trips, prev.trips)}
          deltaLabel={deltaLabel}
        />
        <StatCard
          label={`Omzet · ${PERIOD_LABELS[period]}`}
          value={formatIDR(stats.omzet)}
          deltaValue={delta(stats.omzet, prev.omzet)}
          deltaLabel={deltaLabel}
          nudge={
            stats.uninvoiced > 0
              ? `${stats.uninvoiced} order belum diinvoice`
              : undefined
          }
        />
        <StatCard
          label={`Profit · ${PERIOD_LABELS[period]}`}
          value={formatIDR(stats.profitIdr)}
          deltaValue={delta(stats.profitIdr, prev.profitIdr)}
          deltaLabel={deltaLabel}
          sub={`${formatTHB(stats.profitThb)}${
            stats.margin !== null ? ` · margin ${stats.margin.toFixed(0)}%` : ""
          }`}
          nudge={
            stats.costIncomplete > 0
              ? `${stats.costIncomplete} order cost belum lengkap`
              : undefined
          }
        />
        <StatCard
          label="Potensi (inquiry)"
          value={formatIDR(stats.potensiOmzet)}
          sub={`${stats.potensiCount} inquiry${
            stats.potensiCount > 0 ? " belum dikonfirmasi" : ""
          }`}
        />
      </div>

      <TrendChart points={trend} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-[#1B2A4A]">Trip mendatang</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {upcoming.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between py-2"
              >
                <span>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>{" "}
                  · {o.customers.name}
                </span>
                <span className="text-gray-500">
                  {formatDate(o.trip_start)}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </span>
              </li>
            ))}
            {upcoming.length === 0 && (
              <li className="py-4 text-gray-400">
                Tidak ada trip mendatang.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-[#1B2A4A]">Belum lunas</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {outstanding.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between py-2"
              >
                <span>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>{" "}
                  · {o.customers.name}
                </span>
                <span className="font-medium text-red-700">
                  sisa{" "}
                  {formatIDR(
                    Number(o.price_idr) - (paidByOrder.get(o.id) ?? 0)
                  )}
                </span>
              </li>
            ))}
            {outstanding.length === 0 && (
              <li className="py-4 text-gray-400">Semua order lunas. 🎉</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
