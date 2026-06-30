"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  HOTEL_MARGIN,
  FLEET_LABELS,
  FLEET_KEYS,
  groupHotels,
  groupAttractions,
  isContact,
  type VehiclePrice,
  mergeAddOns,
  mergeTransportRates,
  applyTransportRates,
  type HotelRate,
  type Attraction,
  type AddOnRate,
  type FleetKey,
  type ServiceGroup,
  type TransportRate,
} from "@/lib/admin/priceBook";
import { formatTHB } from "@/lib/admin/utils";
import {
  mergeCustomTransportRoutes,
  type CustomRoutePatch,
  type CustomTransportRoute,
  type NewTransportRouteInput,
} from "@/lib/admin/customTransportRoutes";
import { inputCls, btnCls, ErrorNote } from "@/components/admin/ui";
import AddPriceRowForm from "@/components/admin/AddPriceRowForm";
import AddTransportRouteForm from "@/components/admin/AddTransportRouteForm";

type PriceCategory = "transport" | "hotel" | "tiket" | "biaya-tambahan";

const PRICE_CATEGORIES: { id: PriceCategory; label: string }[] = [
  { id: "transport", label: "Transport" },
  { id: "hotel", label: "Hotel" },
  { id: "tiket", label: "Tiket" },
  { id: "biaya-tambahan", label: "Biaya Tambahan" },
];

const priceTableCls =
  "min-w-[640px] w-full border-separate border-spacing-0 text-sm sm:min-w-[760px]";
const tableScrollCls =
  "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]";
const thCls =
  "border-b border-gray-200 bg-[#F7F8FA] px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 sm:px-4";
const tdCls = "border-b border-gray-100 px-3 py-3 sm:px-4";

function routeStats(groups: ServiceGroup[]) {
  const rows = groups.flatMap((group) =>
    group.services.flatMap((service) =>
      service.prices
        ? FLEET_KEYS.map((fleet) => service.prices![fleet])
        : []
    )
  );
  const margins = rows.map((price) => price.sell - price.cost);
  const avgMargin =
    margins.length > 0
      ? margins.reduce((sum, margin) => sum + margin, 0) / margins.length
      : 0;

  return {
    groups: groups.length,
    services: groups.reduce((sum, group) => sum + group.services.length, 0),
    fixedPrices: rows.length,
    avgMargin,
  };
}

function marginTone(margin: number) {
  if (margin < 0) return "bg-red-50 text-red-700 ring-red-100";
  if (margin < 500) return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function MarginLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-100">
        Green: margin 500+ THB
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 ring-1 ring-amber-100">
        Yellow: margin under 500 THB
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700 ring-1 ring-red-100">
        Red: loss
      </span>
    </div>
  );
}

function PriceCell({
  p,
  editable = false,
  onCostChange,
  onSellChange,
}: {
  p: VehiclePrice;
  editable?: boolean;
  onCostChange?: (raw: string) => void;
  onSellChange?: (raw: string) => void;
}) {
  const margin = p.sell - p.cost;
  const pct = p.sell > 0 ? (margin / p.sell) * 100 : 0;
  return (
    <div className="min-w-28 space-y-1 text-right">
      {editable ? (
        <>
          <label className="block">
            <span className="mb-0.5 block text-[0.65rem] font-medium uppercase tracking-[0.04em] text-gray-400">
              Selling price
            </span>
            <input
              type="number"
              min="0"
              value={p.sell || ""}
              onChange={(e) => onSellChange?.(e.target.value)}
              className={`${inputCls} ml-auto h-9 max-w-28 text-right font-semibold tabular-nums`}
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[0.65rem] font-medium uppercase tracking-[0.04em] text-gray-400">
              Capital price
            </span>
            <input
              type="number"
              min="0"
              value={p.cost || ""}
              onChange={(e) => onCostChange?.(e.target.value)}
              className={`${inputCls} ml-auto h-8 max-w-28 text-right text-xs tabular-nums text-gray-500`}
            />
          </label>
        </>
      ) : (
        <>
          <div className="text-base font-bold tabular-nums text-[#1B2A4A]">
            {formatTHB(p.sell)}
          </div>
          <div className="text-xs tabular-nums text-gray-400">
            modal {formatTHB(p.cost)}
          </div>
        </>
      )}
      <div
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ${marginTone(
          margin
        )}`}
      >
        margin +{formatTHB(margin)} ({pct.toFixed(0)}%)
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-white/55 sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-white/60">{sub}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A67C00]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-bold text-[#1B2A4A]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  );
}

function RoutePriceTable({
  group,
  editable = false,
  onPatch,
  onCustomPatch,
  onCustomDelete,
}: {
  group: ServiceGroup;
  editable?: boolean;
  onPatch?: (serviceId: string, fleet: FleetKey, patch: Partial<TransportRate>) => void;
  onCustomPatch?: (id: string, patch: CustomRoutePatch) => void;
  onCustomDelete?: (id: string) => void;
}) {
  return (
    <section
      id={`route-${group.group.toLowerCase().replaceAll(" ", "-")}`}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-200/40"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <div>
          <h3 className="font-semibold text-[#1B2A4A]">{group.group}</h3>
          <p className="text-xs text-gray-400">
            {group.services.length} rute, {FLEET_KEYS.length} tipe kendaraan
          </p>
        </div>
      </div>
      <div className={tableScrollCls}>
        <table className={priceTableCls}>
          <thead>
            <tr>
              <th
                className={`${thCls} sticky left-0 z-[1] min-w-44 text-left sm:min-w-56`}
              >
                Rute
              </th>
              {FLEET_KEYS.map((k) => (
                <th key={k} className={`${thCls} text-right`}>
                  {FLEET_LABELS[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.services.map((s) => (
              <tr key={s.id} className="group align-top hover:bg-[#FAFAF7]">
                <td
                  className={`${tdCls} sticky left-0 z-[1] bg-white font-semibold text-[#1B2A4A] group-hover:bg-[#FAFAF7]`}
                >
                  {s.customRoute ? (
                    <div className="min-w-48 space-y-2">
                      <label className="block">
                        <span className="mb-0.5 block text-[0.65rem] font-medium uppercase tracking-[0.04em] text-gray-400">
                          Grup
                        </span>
                        <input
                          key={`${s.id}-${s.customRoute.group_name}`}
                          type="text"
                          defaultValue={s.customRoute.group_name}
                          onBlur={(event) =>
                            onCustomPatch?.(s.id, {
                              group_name: event.target.value,
                            })
                          }
                          className={`${inputCls} w-full`}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[0.65rem] font-medium uppercase tracking-[0.04em] text-gray-400">
                          Nama rute
                        </span>
                        <input
                          type="text"
                          value={s.customRoute.name}
                          onChange={(event) =>
                            onCustomPatch?.(s.id, {
                              name: event.target.value,
                            })
                          }
                          className={`${inputCls} w-full font-semibold`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onCustomDelete?.(s.id)}
                        className="min-h-9 text-sm font-medium text-red-600 hover:underline"
                      >
                        Hapus rute
                      </button>
                    </div>
                  ) : (
                    s.name
                  )}
                </td>
                {isContact(s) ? (
                  <td
                    colSpan={FLEET_KEYS.length}
                    className={`${tdCls} text-right italic text-gray-400`}
                  >
                    Contact
                  </td>
                ) : (
                  FLEET_KEYS.map((k: FleetKey) => (
                    <td key={k} className={tdCls}>
                      <PriceCell
                        p={s.prices![k]}
                        editable={editable}
                        onCostChange={(raw) =>
                          s.customRoute
                            ? onCustomPatch?.(s.id, {
                                [`${k}_cost`]: Number(raw) || 0,
                              } as CustomRoutePatch)
                            : onPatch?.(s.id, k, {
                                cost: Number(raw) || 0,
                              })
                        }
                        onSellChange={(raw) =>
                          s.customRoute
                            ? onCustomPatch?.(s.id, {
                                [`${k}_sell`]: Number(raw) || 0,
                              } as CustomRoutePatch)
                            : onPatch?.(s.id, k, {
                                sell: Number(raw) || 0,
                              })
                        }
                      />
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PriceListView() {
  const [transportRows, setTransportRows] = useState<TransportRate[]>(() =>
    mergeTransportRates([])
  );
  const [customRoutes, setCustomRoutes] = useState<CustomTransportRoute[]>([]);
  const transportGroups = mergeCustomTransportRoutes(
    applyTransportRates(transportRows),
    customRoutes
  );
  const stats = routeStats(transportGroups);
  const [activeCategory, setActiveCategory] =
    useState<PriceCategory>("transport");

  return (
    <div className="space-y-7">
      <div className="overflow-hidden rounded-2xl bg-[#14213D] shadow-sm">
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F5C518]">
              Price book
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">Daftar Harga</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">
              Harga jual, modal, dan margin dalam THB. Rute transport tetap,
              hotel dan tiket bisa disesuaikan saat harga musim berubah.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1 xl:grid-cols-3">
            <SummaryTile
              label="Rute"
              value={String(stats.services)}
              sub={`${stats.groups} grup harga`}
            />
            <SummaryTile
              label="Harga tetap"
              value={String(stats.fixedPrices)}
              sub="jual, modal, margin"
            />
            <SummaryTile
              label="Margin avg"
              value={formatTHB(Math.round(stats.avgMargin))}
              sub="transport fixed"
            />
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Kategori harga"
          className="flex gap-2 overflow-x-auto border-t border-white/10 bg-white/[0.04] px-4 py-3 text-sm sm:flex-wrap sm:px-6"
        >
          {PRICE_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`min-h-11 shrink-0 rounded-full border px-4 py-2 font-medium transition-[background-color,border-color,color,box-shadow] duration-200 ${
                activeCategory === category.id
                  ? "border-[#F5C518] bg-[#F5C518] text-[#1B2A4A] shadow-sm shadow-black/20"
                  : "border-white/10 text-white/72 hover:border-[#F5C518]/70 hover:text-white"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div key={activeCategory} className="price-category-panel">
        {activeCategory === "transport" && (
          <TransportRatesSection
            rows={transportRows}
            setRows={setTransportRows}
            customRoutes={customRoutes}
            setCustomRoutes={setCustomRoutes}
            groups={transportGroups}
          />
        )}

        {activeCategory === "hotel" && <HotelRatesSection />}

        {activeCategory === "tiket" && <AttractionRatesSection />}

        {activeCategory === "biaya-tambahan" && <AddOnsSection />}
      </div>
    </div>
  );
}

function TransportRatesSection({
  rows,
  setRows,
  customRoutes,
  setCustomRoutes,
  groups,
}: {
  rows: TransportRate[];
  setRows: React.Dispatch<React.SetStateAction<TransportRate[]>>;
  customRoutes: CustomTransportRoute[];
  setCustomRoutes: React.Dispatch<
    React.SetStateAction<CustomTransportRoute[]>
  >;
  groups: ServiceGroup[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("transport_rates")
        .select("*")
        .order("sort", { ascending: true }),
      supabase
        .from("custom_transport_routes")
        .select("*")
        .order("sort", { ascending: true }),
    ]).then(([ratesResult, customResult]) => {
      if (ratesResult.error) setError(ratesResult.error.message);
      else {
        setRows(
          mergeTransportRates((ratesResult.data as TransportRate[]) ?? [])
        );
      }

      if (customResult.error) setError(customResult.error.message);
      else {
        setCustomRoutes(
          (customResult.data as CustomTransportRoute[]) ?? []
        );
      }
    });
  }, [setCustomRoutes, setRows]);

  function patch(
    serviceId: string,
    fleet: FleetKey,
    patch: Partial<TransportRate>
  ) {
    const id = `${serviceId}-${fleet}`;
    setRows((arr) =>
      arr.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
    setDirty(true);
    setSaved(false);
  }

  function patchCustomRoute(id: string, patch: CustomRoutePatch) {
    setCustomRoutes((routes) =>
      routes.map((route) => (route.id === id ? { ...route, ...patch } : route))
    );
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const transportPayload = rows.map((row) => ({
      id: row.id,
      service_id: row.service_id,
      fleet: row.fleet,
      cost: row.cost,
      sell: row.sell,
      sort: row.sort,
      updated_at: new Date().toISOString(),
    }));
    const supabase = createClient();
    const { error: transportError } = await supabase
      .from("transport_rates")
      .upsert(transportPayload);
    let customError: { message: string } | null = null;
    if (customRoutes.length > 0) {
      const { error } = await supabase.from("custom_transport_routes").upsert(
        customRoutes.map((route) => ({
          id: route.id,
          group_name: route.group_name.trim(),
          name: route.name.trim(),
          altis_cost: route.altis_cost,
          altis_sell: route.altis_sell,
          suv_cost: route.suv_cost,
          suv_sell: route.suv_sell,
          van_cost: route.van_cost,
          van_sell: route.van_sell,
          sort: route.sort,
          updated_at: new Date().toISOString(),
        }))
      );
      customError = error;
    }
    setSaving(false);
    const saveError = transportError ?? customError;
    if (saveError) setError(saveError.message);
    else {
      setDirty(false);
      setSaved(true);
    }
  }

  async function addCustomRoute(input: NewTransportRouteInput) {
    const row: CustomTransportRoute = {
      id: crypto.randomUUID(),
      ...input,
      sort:
        customRoutes.reduce(
          (max, route) => Math.max(max, route.sort),
          0
        ) + 10,
    };
    setError(null);
    const { error } = await createClient()
      .from("custom_transport_routes").insert(row);
    if (error) {
      setError(error.message);
      return false;
    }
    setCustomRoutes((routes) => [...routes, row]);
    return true;
  }

  async function deleteCustomRoute(id: string) {
    if (!confirm("Hapus rute custom ini?")) return;
    const { error } = await createClient()
      .from("custom_transport_routes")
      .delete()
      .eq("id", id);
    if (error) setError(error.message);
    else setCustomRoutes((routes) => routes.filter((route) => route.id !== id));
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Transport"
        title="Harga rute fixed"
        description="Edit harga jual dan modal transport untuk setiap rute dan tipe kendaraan. Margin dihitung otomatis dari jual dikurangi modal."
        action={
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            {saved && !dirty && (
              <span className="text-sm text-green-700">Tersimpan ✓</span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {saving ? "Menyimpan…" : "Simpan transport"}
            </button>
          </div>
        }
      />

      <ErrorNote message={error} />

      <MarginLegend />

      {groups.map((group) => (
        <RoutePriceTable
          key={group.group}
          group={group}
          editable
          onPatch={patch}
          onCustomPatch={patchCustomRoute}
          onCustomDelete={deleteCustomRoute}
        />
      ))}

      <AddTransportRouteForm
        groups={Array.from(new Set(groups.map((group) => group.group)))}
        onAdd={addCustomRoute}
      />
    </div>
  );
}

function AddOnsSection() {
  const [rows, setRows] = useState<AddOnRate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("");

  useEffect(() => {
    createClient()
      .from("add_ons")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setRows(mergeAddOns((data as AddOnRate[]) ?? []));
      });
  }, []);

  function patch(id: string, p: Partial<AddOnRate>) {
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setDirty(true);
    setSaved(false);
  }
  function setName(id: string, raw: string) {
    patch(id, { name: raw });
  }
  function setPrice(id: string, raw: string) {
    patch(id, { price: raw === "" ? null : Number(raw) });
  }
  function setUnit(id: string, raw: string) {
    patch(id, { unit: raw === "" ? null : raw });
  }

  async function save() {
    setSaving(true);
    setError(null);
    // Persist base rows (as price/unit overrides) and custom rows alike.
    const payload = rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      unit: r.unit,
      sort: r.sort,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await createClient().from("add_ons").upsert(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setDirty(false);
      setSaved(true);
    }
  }

  async function addRow() {
    const name = newName.trim();
    if (!name) return;
    const row: AddOnRate = {
      id: crypto.randomUUID(),
      name,
      price: newPrice === "" ? null : Number(newPrice),
      unit: newUnit.trim() === "" ? null : newUnit.trim(),
      sort: rows.reduce((m, r) => Math.max(m, r.sort), 0) + 10,
    };
    setError(null);
    const { error } = await createClient().from("add_ons").insert(row);
    if (error) setError(error.message);
    else {
      setRows((arr) => [...arr, row]);
      setNewName("");
      setNewPrice("");
      setNewUnit("");
    }
  }

  async function deleteRow(id: string) {
    if (!confirm("Hapus biaya tambahan ini?")) return;
    const { error } = await createClient().from("add_ons").delete().eq("id", id);
    if (error) setError(error.message);
    else setRows((arr) => arr.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Add-ons"
        title="Biaya tambahan"
        description="Ubah harga atau unit, kosongkan harga ketika mengikuti biaya aktual."
        action={
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            {saved && !dirty && (
              <span className="text-sm text-green-700">Tersimpan ✓</span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {saving ? "Menyimpan…" : "Simpan biaya tambahan"}
            </button>
          </div>
        }
      />

      <ErrorNote message={error} />

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-200/40">
        <div className={tableScrollCls}>
          <table className={priceTableCls}>
            <thead>
              <tr>
                <th className={`${thCls} min-w-64 text-left`}>Item</th>
                <th className={`${thCls} text-right`}>Harga</th>
                <th className={`${thCls} text-left`}>Unit</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-[#FAFAF7]">
                  <td className={`${tdCls} font-medium text-[#1B2A4A]`}>
                    {a.base ? (
                      a.name
                    ) : (
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => setName(a.id, e.target.value)}
                        className={`${inputCls} w-full`}
                      />
                    )}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    <input
                      type="number"
                      min="0"
                      value={a.price ?? ""}
                      placeholder="aktual"
                      onChange={(e) => setPrice(a.id, e.target.value)}
                      className={`${inputCls} ml-auto max-w-24 text-right`}
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      type="text"
                      value={a.unit ?? ""}
                      placeholder="—"
                      onChange={(e) => setUnit(a.id, e.target.value)}
                      className={`${inputCls} max-w-28`}
                    />
                  </td>
                  <td className={`${tdCls} text-right`}>
                    {!a.base && (
                      <button
                        onClick={() => deleteRow(a.id)}
                        className="text-sm text-red-500 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#1B2A4A]">
          Tambah biaya baru
        </h3>
        <div className="grid gap-3 sm:grid-cols-[minmax(10rem,1fr)_8rem_8rem_auto] sm:items-end">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Item</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Harga (THB)
            </label>
            <input
              type="number"
              min="0"
              value={newPrice}
              placeholder="aktual"
              onChange={(e) => setNewPrice(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Unit</label>
            <input
              type="text"
              value={newUnit}
              placeholder="/ jam"
              onChange={(e) => setNewUnit(e.target.value)}
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={addRow}
            disabled={!newName.trim()}
            className={`${btnCls} min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Tambah
          </button>
        </div>
      </div>
    </div>
  );
}

function HotelRatesSection() {
  const [rows, setRows] = useState<HotelRate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    createClient()
      .from("hotel_rates")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data as HotelRate[]) ?? []);
      });
  }, []);

  function patch(id: string, p: Partial<HotelRate>) {
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setDirty(true);
    setSaved(false);
  }
  function setCapital(id: string, raw: string) {
    patch(id, { capital: Number(raw) || 0 });
  }
  function setMargin(id: string, raw: string) {
    patch(id, { margin: Number(raw) || 0 });
  }
  // Editing the final price keeps capital, derives margin = final − capital.
  function setFinal(id: string, raw: string, capital: number) {
    patch(id, { margin: (Number(raw) || 0) - capital });
  }

  async function addHotel(city: string, name: string, amount: string) {
    const row: HotelRate = {
      id: crypto.randomUUID(),
      city,
      name,
      capital: Number(amount) || 0,
      margin: HOTEL_MARGIN,
      sort: rows.reduce((m, r) => Math.max(m, r.sort), 0) + 10,
    };
    setError(null);
    const { error } = await createClient().from("hotel_rates").insert(row);
    if (error) setError(error.message);
    else setRows((arr) => [...arr, row]);
  }

  async function deleteHotel(id: string) {
    if (!confirm("Hapus hotel ini?")) return;
    const { error } = await createClient()
      .from("hotel_rates")
      .delete()
      .eq("id", id);
    if (error) setError(error.message);
    else setRows((arr) => arr.filter((r) => r.id !== id));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = rows.map((r) => ({
      id: r.id,
      city: r.city,
      name: r.name,
      capital: r.capital,
      margin: r.margin,
      sort: r.sort,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await createClient().from("hotel_rates").upsert(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setDirty(false);
      setSaved(true);
    }
  }

  const cities = groupHotels(rows);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Akomodasi"
        title="Hotel"
        description={`Per malam untuk 1 kamar, 2 pax. Modal, margin, dan final bisa diubah. Rekomendasi margin ${formatTHB(
          HOTEL_MARGIN
        )} per malam.`}
        action={
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            {saved && !dirty && (
              <span className="text-sm text-green-700">Tersimpan ✓</span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {saving ? "Menyimpan…" : "Simpan harga hotel"}
            </button>
          </div>
        }
      />

      <ErrorNote message={error} />

      {cities.map((c) => (
        <section
          key={c.city}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-200/40"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold text-[#1B2A4A]">{c.city}</h3>
          </div>
          <div className={tableScrollCls}>
            <table className={priceTableCls}>
              <thead>
                <tr>
                  <th className={`${thCls} min-w-64 text-left`}>Hotel</th>
                  <th className={`${thCls} text-right`}>Modal</th>
                  <th className={`${thCls} text-right`}>Margin</th>
                  <th className={`${thCls} text-right`}>Final (jual)</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {c.hotels.map((h) => {
                  const sell = h.capital + h.margin;
                  const pct = sell > 0 ? (h.margin / sell) * 100 : 0;
                  return (
                    <tr key={h.id} className="hover:bg-[#FAFAF7]">
                      <td className={`${tdCls} font-medium text-[#1B2A4A]`}>
                        {h.name}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <input
                          type="number"
                          min="0"
                          value={h.capital || ""}
                          onChange={(e) => setCapital(h.id, e.target.value)}
                          className={`${inputCls} ml-auto max-w-24 text-right`}
                        />
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <input
                          type="number"
                          value={h.margin || ""}
                          onChange={(e) => setMargin(h.id, e.target.value)}
                          className={`${inputCls} ml-auto max-w-24 text-right`}
                        />
                        <span className="mt-0.5 block text-xs font-medium text-green-700">
                          {pct.toFixed(0)}% margin
                        </span>
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <input
                          type="number"
                          min="0"
                          value={sell || ""}
                          onChange={(e) =>
                            setFinal(h.id, e.target.value, h.capital)
                          }
                          className={`${inputCls} ml-auto max-w-24 text-right font-semibold`}
                        />
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <button
                          onClick={() => deleteHotel(h.id)}
                          className="text-sm text-red-500 hover:underline"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <AddPriceRowForm
        title="Tambah hotel baru"
        cities={Array.from(new Set(rows.map((r) => r.city)))}
        citiesId="hotel-cities"
        amountLabel="Modal (THB)"
        onAdd={addHotel}
      />

      {rows.length === 0 && !error && (
        <p className="text-sm text-gray-400">Memuat hotel…</p>
      )}
    </div>
  );
}

function AttractionRatesSection() {
  const [rows, setRows] = useState<Attraction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    createClient()
      .from("attraction_rates")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data as Attraction[]) ?? []);
      });
  }, []);

  function patch(id: string, p: Partial<Attraction>) {
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setDirty(true);
    setSaved(false);
  }
  function setPrice(id: string, raw: string) {
    patch(id, { price: raw === "" ? null : Number(raw) });
  }
  function setMargin(id: string, raw: string) {
    patch(id, { margin: Number(raw) || 0 });
  }
  // Editing final keeps capital price, derives margin = final − capital.
  function setFinal(id: string, raw: string, capital: number) {
    patch(id, { margin: (Number(raw) || 0) - capital });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = rows.map((r) => ({
      id: r.id,
      city: r.city,
      name: r.name,
      price: r.price,
      margin: r.margin,
      sort: r.sort,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await createClient()
      .from("attraction_rates")
      .upsert(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setDirty(false);
      setSaved(true);
    }
  }

  async function addAttraction(city: string, name: string, amount: string) {
    const row: Attraction = {
      id: crypto.randomUUID(),
      city,
      name,
      price: amount === "" ? null : Number(amount),
      margin: 0,
      sort: rows.reduce((m, r) => Math.max(m, r.sort), 0) + 10,
    };
    setError(null);
    const { error } = await createClient().from("attraction_rates").insert(row);
    if (error) setError(error.message);
    else setRows((arr) => [...arr, row]);
  }

  async function deleteAttraction(id: string) {
    if (!confirm("Hapus atraksi ini?")) return;
    const { error } = await createClient()
      .from("attraction_rates")
      .delete()
      .eq("id", id);
    if (error) setError(error.message);
    else setRows((arr) => arr.filter((r) => r.id !== id));
  }

  const cities = groupAttractions(rows);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Atraksi"
        title="Tiket atraksi"
        description="Ubah modal tiket dan margin, kosongkan modal kalau harga masih menyusul."
        action={
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            {saved && !dirty && (
              <span className="text-sm text-green-700">Tersimpan ✓</span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {saving ? "Menyimpan…" : "Simpan harga tiket"}
            </button>
          </div>
        }
      />

      <ErrorNote message={error} />

      {cities.map((c) => (
        <section
          key={c.city}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-200/40"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold text-[#1B2A4A]">{c.city}</h3>
          </div>
          <div className={tableScrollCls}>
            <table className={priceTableCls}>
              <thead>
                <tr>
                  <th className={`${thCls} min-w-64 text-left`}>Atraksi</th>
                  <th className={`${thCls} text-right`}>Modal</th>
                  <th className={`${thCls} text-right`}>Margin</th>
                  <th className={`${thCls} text-right`}>Final (jual)</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {c.items.map((a) => {
                  const sell = a.price != null ? a.price + a.margin : null;
                  const pct =
                    sell != null && sell > 0 ? (a.margin / sell) * 100 : null;
                  return (
                    <tr key={a.id} className="hover:bg-[#FAFAF7]">
                      <td className={`${tdCls} font-medium text-[#1B2A4A]`}>
                        {a.name}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <input
                          type="number"
                          min="0"
                          value={a.price ?? ""}
                          placeholder="menyusul"
                          onChange={(e) => setPrice(a.id, e.target.value)}
                          className={`${inputCls} ml-auto max-w-24 text-right`}
                        />
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <input
                          type="number"
                          value={a.margin || ""}
                          onChange={(e) => setMargin(a.id, e.target.value)}
                          className={`${inputCls} ml-auto max-w-24 text-right`}
                        />
                        {pct != null && (
                          <span className="mt-0.5 block text-xs font-medium text-green-700">
                            {pct.toFixed(0)}% margin
                          </span>
                        )}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <input
                          type="number"
                          min="0"
                          value={sell ?? ""}
                          placeholder="—"
                          onChange={(e) =>
                            setFinal(a.id, e.target.value, a.price ?? 0)
                          }
                          className={`${inputCls} ml-auto max-w-24 text-right font-semibold`}
                        />
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <button
                          onClick={() => deleteAttraction(a.id)}
                          className="text-sm text-red-500 hover:underline"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <AddPriceRowForm
        title="Tambah atraksi baru"
        cities={Array.from(new Set(rows.map((r) => r.city)))}
        citiesId="attraction-cities"
        amountLabel="Harga (THB)"
        onAdd={addAttraction}
      />
    </div>
  );
}
