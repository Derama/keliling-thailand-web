"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type OrderWithCustomer,
  type OrderStatus,
  STATUS_LABELS,
} from "@/lib/admin/types";
import { ErrorNote, btnSecondaryCls } from "@/components/admin/ui";
import { isoLocal } from "@/lib/admin/utils";
import Modal from "@/components/admin/Modal";
import OrderDetail from "@/components/admin/OrderDetail";

// Solid fills for calendar bars (cancelled is filtered out server-side).
const BAR_COLORS: Record<OrderStatus, string> = {
  inquiry: "bg-gray-400 text-white",
  confirmed: "bg-blue-500 text-white",
  ongoing: "bg-[#F5C518] text-[#1B2A4A]",
  completed: "bg-green-500 text-white",
  cancelled: "bg-red-300 text-red-800",
};

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const LEGEND: OrderStatus[] = ["confirmed", "ongoing", "completed", "inquiry"];

const LANE_H = 22; // px per stacked bar
const DATE_H = 24; // px reserved for the date number row

type View = "month" | "day";

function tripEnd(o: OrderWithCustomer) {
  return o.trip_end ?? o.trip_start!;
}

function tripsOn(orders: OrderWithCustomer[], day: string) {
  return orders
    .filter((o) => o.trip_start! <= day && day <= tripEnd(o))
    .sort((a, b) => a.trip_start!.localeCompare(b.trip_start!));
}

export default function CalendarView() {
  const [view, setView] = useState<View>("month");
  // Anchor date: for month view only y/m matter; for day view the exact day.
  const [cursor, setCursor] = useState(() => new Date());
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrderWithCustomer | null>(null);

  function load() {
    createClient()
      .from("orders")
      .select("*, customers(*)")
      .not("trip_start", "is", null)
      .neq("status", "cancelled")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setOrders((data as OrderWithCustomer[]) ?? []);
      });
  }

  useEffect(load, []);

  const year = cursor.getFullYear();
  const mon = cursor.getMonth();
  const dayIso = isoLocal(cursor);
  const todayIso = isoLocal();

  function step(dir: -1 | 1) {
    setCursor((c) =>
      view === "month"
        ? new Date(c.getFullYear(), c.getMonth() + dir, 1)
        : new Date(c.getFullYear(), c.getMonth(), c.getDate() + dir)
    );
  }

  function openDay(iso: string) {
    setCursor(new Date(iso + "T00:00:00"));
    setView("day");
  }

  // Padded day cells for the month grid: leading blanks to start Monday, the
  // month's days, trailing blanks to fill the final week.
  const weeks = useMemo(() => {
    const firstWeekday = (new Date(year, mon, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const arr: (string | null)[] = [
      ...Array<null>(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        isoLocal(new Date(year, mon, i + 1))
      ),
    ];
    while (arr.length % 7 !== 0) arr.push(null);
    const out: (string | null)[][] = [];
    for (let i = 0; i < arr.length; i += 7) out.push(arr.slice(i, i + 7));
    return out;
  }, [year, mon]);

  const label =
    view === "month"
      ? cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
      : cursor.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  const dayTrips = tripsOn(orders, dayIso);

  // "Hari ini" only does something when we've navigated away from now.
  const now = new Date();
  const atToday =
    view === "month"
      ? year === now.getFullYear() && mon === now.getMonth()
      : dayIso === todayIso;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Kalender</h1>
        <div className="flex items-center gap-2">
          {/* Month / Day segmented toggle */}
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-sm font-medium">
            {(["month", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  view === v
                    ? "bg-[#1B2A4A] text-white"
                    : "text-gray-500 hover:text-[#1B2A4A]"
                }`}
              >
                {v === "month" ? "Bulan" : "Hari"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCursor(new Date())}
            disabled={atToday}
            className={`${btnSecondaryCls} disabled:cursor-default disabled:opacity-40`}
          >
            Hari ini
          </button>
          <button
            onClick={() => step(-1)}
            className={btnSecondaryCls}
            aria-label="Sebelumnya"
          >
            ←
          </button>
          <button
            onClick={() => step(1)}
            className={btnSecondaryCls}
            aria-label="Berikutnya"
          >
            →
          </button>
        </div>
      </div>

      <p className="text-lg font-semibold capitalize text-[#1B2A4A]">{label}</p>

      <ErrorNote message={error} />

      {/* Status legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {LEGEND.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-sm ${BAR_COLORS[s]}`} />
            {STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      {view === "month" ? (
        <>
          {/* Desktop: month grid with spanning bars */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 sm:block">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <WeekRow
                key={wi}
                week={week}
                orders={orders}
                todayIso={todayIso}
                onOpenDay={openDay}
              />
            ))}
          </div>

          {/* Phone: compact grid with event dots */}
          <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-gray-200 text-center sm:hidden">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="border-b border-gray-200 bg-gray-50 py-1.5 text-[11px] font-medium text-gray-500"
              >
                {d[0]}
              </div>
            ))}
            {weeks.flat().map((day, i) => (
              <button
                key={i}
                type="button"
                disabled={!day}
                onClick={() => day && openDay(day)}
                className={`flex min-h-14 flex-col items-center gap-1 border-b border-l border-gray-100 py-1.5 first:border-l-0 ${
                  day === todayIso ? "bg-[#F5C518]/10" : ""
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        day === todayIso
                          ? "bg-[#F5C518] font-bold text-[#1B2A4A]"
                          : "text-gray-600"
                      }`}
                    >
                      {Number(day.slice(8))}
                    </span>
                    <span className="flex gap-0.5">
                      {tripsOn(orders, day)
                        .slice(0, 4)
                        .map((o) => (
                          <span
                            key={o.id}
                            className={`h-1.5 w-1.5 rounded-full ${BAR_COLORS[o.status]}`}
                          />
                        ))}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* Day view: list of trips active on the selected day */
        <div className="space-y-3">
          {dayTrips.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
              Tidak ada trip hari ini.
            </p>
          )}
          {dayTrips.map((o) => (
            <AgendaRow key={o.id} order={o} onPick={setSelected} />
          ))}
        </div>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.order_number ?? "Order"}
        wide
        expanded
        printIsolate
      >
        {selected && (
          <OrderDetail
            id={selected.id}
            showHeading={false}
            onChanged={load}
            onDeleted={() => {
              setSelected(null);
              load();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/** One week row: date numbers plus greedily lane-packed spanning trip bars. */
function WeekRow({
  week,
  orders,
  todayIso,
  onOpenDay,
}: {
  week: (string | null)[];
  orders: OrderWithCustomer[];
  todayIso: string;
  onOpenDay: (iso: string) => void;
}) {
  const realDays = week.filter((d): d is string => Boolean(d));
  const weekStart = realDays[0];
  const weekEnd = realDays[realDays.length - 1];

  type Seg = {
    o: OrderWithCustomer;
    start: number;
    end: number;
    roundL: boolean;
    roundR: boolean;
  };

  const segments: Seg[] = [];
  if (weekStart) {
    for (const o of orders) {
      const s = o.trip_start!;
      const e = tripEnd(o);
      if (s > weekEnd || e < weekStart) continue;
      const cols = week
        .map((d, i) => (d && s <= d && d <= e ? i : -1))
        .filter((i) => i >= 0);
      if (cols.length === 0) continue;
      segments.push({
        o,
        start: cols[0],
        end: cols[cols.length - 1],
        roundL: s >= weekStart,
        roundR: e <= weekEnd,
      });
    }
  }

  // Greedy lane assignment: earliest-starting first, first non-overlapping lane.
  segments.sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  const placed = segments.map((seg) => {
    let lane = laneEnds.findIndex((end) => end < seg.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.end);
    } else {
      laneEnds[lane] = seg.end;
    }
    return { seg, lane };
  });
  const lanes = laneEnds.length;
  const rowHeight = DATE_H + lanes * LANE_H + 6;

  return (
    <div
      className="relative border-b border-gray-200 last:border-b-0"
      style={{ minHeight: rowHeight }}
    >
      {/* date-number cells + vertical grid lines */}
      <div className="grid h-full grid-cols-7">
        {week.map((day, i) => (
          <button
            key={i}
            type="button"
            disabled={!day}
            onClick={() => day && onOpenDay(day)}
            className={`border-l border-gray-100 px-1.5 pt-1 text-left first:border-l-0 ${
              day === todayIso ? "bg-[#F5C518]/10" : ""
            } ${day ? "hover:bg-gray-50" : ""}`}
          >
            {day && (
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  day === todayIso
                    ? "bg-[#F5C518] font-bold text-[#1B2A4A]"
                    : "text-gray-400"
                }`}
              >
                {Number(day.slice(8))}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* spanning bars */}
      {placed.map(({ seg, lane }) => (
        <button
          key={seg.o.id}
          type="button"
          onClick={() => onOpenDay(seg.o.trip_start!)}
          title={`${seg.o.order_number} · ${seg.o.customers.name}`}
          className={`absolute truncate px-1.5 text-left text-xs font-medium leading-5 ${
            BAR_COLORS[seg.o.status]
          } ${seg.roundL ? "rounded-l-md" : ""} ${seg.roundR ? "rounded-r-md" : ""}`}
          style={{
            left: `calc(${(seg.start / 7) * 100}% + 2px)`,
            width: `calc(${((seg.end - seg.start + 1) / 7) * 100}% - 4px)`,
            top: DATE_H + lane * LANE_H,
            height: LANE_H - 3,
          }}
        >
          {seg.roundL ? seg.o.customers.name : " "}
        </button>
      ))}
    </div>
  );
}

/** Trip card: date range, customer, order no, pax, status. */
function AgendaRow({
  order,
  onPick,
}: {
  order: OrderWithCustomer;
  onPick: (o: OrderWithCustomer) => void;
}) {
  const s = new Date(order.trip_start! + "T00:00:00");
  const e = new Date(tripEnd(order) + "T00:00:00");
  const fmt = (d: Date) =>
    d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  const range =
    order.trip_start === tripEnd(order) ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;

  return (
    <button
      type="button"
      onClick={() => onPick(order)}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 active:bg-gray-50"
    >
      <span
        className={`h-10 w-1.5 shrink-0 rounded-full ${BAR_COLORS[order.status]}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[#1B2A4A]">
          {order.customers.name}
        </p>
        <p className="truncate text-xs text-gray-500">
          {range}
          {order.pax ? ` · ${order.pax} pax` : ""} · {order.order_number}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BAR_COLORS[order.status]}`}
      >
        {STATUS_LABELS[order.status]}
      </span>
    </button>
  );
}
