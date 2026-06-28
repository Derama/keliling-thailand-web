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

// Preset periods plus `pickMonth`, which uses an explicit YYYY-MM the user chose.
type Period = "month" | "lastMonth" | "year" | "all" | "pickMonth";

const PRESET_LABELS: Record<Exclude<Period, "pickMonth">, string> = {
  month: "Bulan ini",
  lastMonth: "Bulan lalu",
  year: "Tahun ini",
  all: "Semua",
};

type Range = [string, string] | null; // [startIso, endIso); null = all-time.

function monthStart(y: number, m: number): string {
  return isoLocal(new Date(y, m, 1));
}

/** Parse a YYYY-MM into [year, monthIndex]; falls back to the current month. */
function parseMonth(value: string): [number, number] {
  const [y, m] = value.split("-").map(Number);
  if (y && m) return [y, m - 1];
  const now = new Date();
  return [now.getFullYear(), now.getMonth()];
}

/** Human label for the active period (used in card titles). */
function periodLabel(period: Period, monthValue: string): string {
  if (period === "pickMonth") {
    const [y, m] = parseMonth(monthValue);
    return new Date(y, m, 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  }
  return PRESET_LABELS[period];
}

/** Text for the delta sub-line, naming the period being compared against. */
function deltaVs(period: Period): string | null {
  switch (period) {
    case "month":
      return "vs bulan lalu";
    case "lastMonth":
      return "vs bulan sebelumnya";
    case "pickMonth":
      return "vs bulan sebelumnya";
    case "year":
      return "vs tahun lalu";
    case "all":
      return null;
  }
}

/** Date range for the selected period, or null for all-time. */
function rangeFor(period: Period, monthValue: string): Range {
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
    case "pickMonth": {
      const [py, pm] = parseMonth(monthValue);
      return [monthStart(py, pm), monthStart(py, pm + 1)];
    }
    case "month":
    default:
      return [monthStart(y, m), monthStart(y, m + 1)];
  }
}

/** The previous comparable range, for delta. Null when there's nothing to
 *  compare against (all-time). */
function prevRangeFor(period: Period, monthValue: string): Range {
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
    case "pickMonth": {
      const [py, pm] = parseMonth(monthValue);
      return [monthStart(py, pm - 1), monthStart(py, pm)];
    }
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
  omzet: number; // invoiced revenue (accrual)
  cash: number; // payments actually received in the period
  profitIdr: number;
  profitThb: number;
  margin: number | null; // profit / omzet, %
  collected: number | null; // cash / omzet, %
  uninvoiced: number; // active orders with no invoice (price 0)
  costIncomplete: number; // invoiced but no operator cost/rate → profit unknown
  potensiOmzet: number; // inquiry pipeline value
  potensiCount: number;
}

function computeStats(
  orders: OrderWithCustomer[],
  payments: Payment[],
  range: Range
): Stats {
  const active = orders.filter(
    (o) =>
      (ACTIVE as readonly string[]).includes(o.status) &&
      inRange(o.trip_start, range)
  );
  const omzet = active.reduce((s, o) => s + Number(o.price_idr), 0);
  const uninvoiced = active.filter((o) => Number(o.price_idr) <= 0).length;

  // Cash = money received in the period, by payment date (not trip date).
  const cash = payments
    .filter((p) => inRange(p.paid_at, range))
    .reduce((s, p) => s + Number(p.amount_idr), 0);

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
    cash,
    profitIdr,
    profitThb,
    margin: omzet > 0 ? (profitIdr / omzet) * 100 : null,
    collected: omzet > 0 ? (cash / omzet) * 100 : null,
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
  monthValue,
  onPreset,
  onMonth,
}: {
  value: Period;
  monthValue: string;
  onPreset: (p: Period) => void;
  onMonth: (m: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
        {(Object.keys(PRESET_LABELS) as Exclude<Period, "pickMonth">[]).map(
          (p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPreset(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                value === p
                  ? "bg-[#F5C518] text-[#1B2A4A] shadow-sm"
                  : "text-gray-500 hover:text-[#1B2A4A]"
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          )
        )}
      </div>
      <input
        type="month"
        value={value === "pickMonth" ? monthValue : ""}
        onChange={(e) => onMonth(e.target.value)}
        aria-label="Pilih bulan tertentu"
        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
          value === "pickMonth"
            ? "border-[#F5C518] text-[#1B2A4A]"
            : "border-gray-200 text-gray-500"
        }`}
      />
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

/** One missing-piece chip on an action-queue row. */
function MissingTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      {children}
    </span>
  );
}

export default function DashboardView() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  // order_id → set of builder-doc kinds that exist (for the action queue).
  const [docKinds, setDocKinds] = useState<Map<string, Set<string>>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [monthValue, setMonthValue] = useState<string>("");

  function pickPreset(p: Period) {
    setPeriod(p);
  }
  function pickMonth(m: string) {
    if (!m) {
      setPeriod("month");
      setMonthValue("");
      return;
    }
    setMonthValue(m);
    setPeriod("pickMonth");
  }

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
    supabase
      .from("order_documents")
      .select("order_id, kind")
      .then(({ data }) => {
        const map = new Map<string, Set<string>>();
        for (const row of (data as { order_id: string; kind: string }[]) ?? []) {
          const set = map.get(row.order_id) ?? new Set<string>();
          set.add(row.kind);
          map.set(row.order_id, set);
        }
        setDocKinds(map);
      });
  }, []);

  const stats = useMemo(
    () => computeStats(orders, payments, rangeFor(period, monthValue)),
    [orders, payments, period, monthValue]
  );
  const prev = useMemo(
    () => computeStats(orders, payments, prevRangeFor(period, monthValue)),
    [orders, payments, period, monthValue]
  );
  const label = periodLabel(period, monthValue);
  const deltaLabel = deltaVs(period);

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
  // Total receivables across every unpaid order (all-time snapshot).
  const piutang = outstanding.reduce(
    (s, o) => s + (Number(o.price_idr) - (paidByOrder.get(o.id) ?? 0)),
    0
  );

  // Action queue: upcoming confirmed/ongoing trips missing a piece of prep —
  // an invoice (price 0), an assigned driver, or a job order document.
  const actionQueue = activeAll
    .filter(
      (o) =>
        o.status !== "completed" && o.trip_start && o.trip_start >= today
    )
    .map((o) => {
      const kinds = docKinds.get(o.id) ?? new Set<string>();
      const missing: string[] = [];
      if (Number(o.price_idr) <= 0) missing.push("invoice");
      if (!o.driver_name?.trim()) missing.push("driver");
      if (!kinds.has("joborder")) missing.push("job order");
      return { o, missing };
    })
    .filter((row) => row.missing.length > 0)
    .sort((a, b) => (a.o.trip_start! < b.o.trip_start! ? -1 : 1))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
        <PeriodSwitcher
          value={period}
          monthValue={monthValue}
          onPreset={pickPreset}
          onMonth={pickMonth}
        />
      </div>
      <ErrorNote message={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          label={`Trip · ${label}`}
          value={String(stats.trips)}
          deltaValue={delta(stats.trips, prev.trips)}
          deltaLabel={deltaLabel}
        />
        <StatCard
          label={`Omzet · ${label}`}
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
          label={`Cash masuk · ${label}`}
          value={formatIDR(stats.cash)}
          deltaValue={delta(stats.cash, prev.cash)}
          deltaLabel={deltaLabel}
          sub={
            stats.collected !== null
              ? `${stats.collected.toFixed(0)}% dari omzet tertagih`
              : undefined
          }
        />
        <StatCard
          label={`Profit · ${label}`}
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
        {/* Action queue — upcoming trips missing prep. All-time, ops-focused. */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-[#1B2A4A]">Butuh tindakan</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {actionQueue.map(({ o, missing }) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-[#1B2A4A] hover:underline"
                  >
                    {o.order_number}
                  </Link>{" "}
                  · {o.customers.name}
                  <span className="ml-1 text-xs text-gray-400">
                    {formatDate(o.trip_start)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                  {missing.map((m) => (
                    <MissingTag key={m}>{m}</MissingTag>
                  ))}
                </span>
              </li>
            ))}
            {actionQueue.length === 0 && (
              <li className="py-4 text-gray-400">
                Semua trip mendatang sudah siap. 👍
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-[#1B2A4A]">Belum lunas</h2>
            <span className="text-sm font-bold text-red-700">
              total {formatIDR(piutang)}
            </span>
          </div>
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
      </div>
    </div>
  );
}
