"use client";

import { useState } from "react";
import { Field, inputCls, btnCls, btnSecondaryCls } from "@/components/admin/ui";
import { formatTHB, isoLocal } from "@/lib/admin/utils";
import BuiltInvoiceDoc from "@/components/admin/BuiltInvoiceDoc";
import {
  OPERATOR_MARGIN,
  type InvoiceMode,
  type InvoiceLine,
} from "@/lib/admin/invoice";
import {
  PRICE_BOOK,
  FLEET_LABELS,
  FLEET_KEYS,
  findService,
  isContact,
  vehiclePrice,
  type FleetKey,
} from "@/lib/admin/priceBook";

function newId() {
  return crypto.randomUUID();
}

export default function InvoiceBuilderView() {
  const [mode, setMode] = useState<InvoiceMode>("customer");
  const [billTo, setBillTo] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${isoLocal().replace(/-/g, "")}`
  );
  const [date, setDate] = useState(isoLocal());
  const [lines, setLines] = useState<InvoiceLine[]>([]);

  const [pickService, setPickService] = useState("");
  const [pickFleet, setPickFleet] = useState<FleetKey>("altis");

  function switchMode(next: InvoiceMode) {
    setMode(next);
    if (next === "operator" && !billTo.trim()) setBillTo("Love Bangkok Co., Ltd");
    if (next === "customer" && billTo === "Love Bangkok Co., Ltd") setBillTo("");
  }

  function addFromPicker() {
    const svc = pickService ? findService(pickService) : undefined;
    if (!svc || isContact(svc)) return;
    const vp = vehiclePrice(svc, pickFleet);
    if (!vp) return;
    setLines((arr) => [
      ...arr,
      {
        id: newId(),
        desc: `${svc.name} (${FLEET_LABELS[pickFleet]})`,
        capital: vp.cost,
        sell: vp.sell,
      },
    ]);
  }

  function addBlank() {
    setLines((arr) => [
      ...arr,
      { id: newId(), desc: "", capital: 0, sell: 0 },
    ]);
  }

  function setLine(id: string, patch: Partial<InvoiceLine>) {
    setLines((arr) => arr.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((arr) => arr.filter((l) => l.id !== id));
  }

  const isOperator = mode === "operator";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Buat Invoice</h1>
        <p className="text-sm text-gray-500">
          Susun invoice, lalu Print / Simpan PDF dari preview di bawah. Semua
          THB.
        </p>
      </div>

      <section className="no-print space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        {/* Mode toggle */}
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => switchMode("customer")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              !isOperator
                ? "bg-[#F5C518] text-[#1B2A4A]"
                : "text-gray-500 hover:text-[#1B2A4A]"
            }`}
          >
            Customer
          </button>
          <button
            onClick={() => switchMode("operator")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              isOperator
                ? "bg-[#F5C518] text-[#1B2A4A]"
                : "text-gray-500 hover:text-[#1B2A4A]"
            }`}
          >
            Tour Operator
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Ditagihkan kepada">
            <input
              value={billTo}
              onChange={(e) => setBillTo(e.target.value)}
              className={inputCls}
              placeholder={isOperator ? "Love Bangkok Co., Ltd" : "Nama customer"}
            />
          </Field>
          <Field label="No. Invoice">
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Tanggal">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Line picker */}
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3">
          <Field label="Rute">
            <select
              value={pickService}
              onChange={(e) => setPickService(e.target.value)}
              className={inputCls}
            >
              <option value="">— pilih rute —</option>
              {PRICE_BOOK.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.services.map((s) => (
                    <option key={s.id} value={s.id} disabled={isContact(s)}>
                      {s.name}
                      {isContact(s) ? " (contact)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Kendaraan">
            <select
              value={pickFleet}
              onChange={(e) => setPickFleet(e.target.value as FleetKey)}
              className={inputCls}
            >
              {FLEET_KEYS.map((k) => (
                <option key={k} value={k}>
                  {FLEET_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={addFromPicker}
            disabled={!pickService}
            className={`${btnCls} disabled:opacity-50`}
          >
            + Tambah baris
          </button>
          <button type="button" onClick={addBlank} className={btnSecondaryCls}>
            + Baris manual
          </button>
        </div>

        {/* Line editor */}
        {lines.length > 0 && (
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-2">
                <input
                  value={l.desc}
                  onChange={(e) => setLine(l.id, { desc: e.target.value })}
                  className={`${inputCls} min-w-48 flex-1`}
                  placeholder="Deskripsi"
                />
                <label className="text-xs text-gray-400">
                  Modal
                  <input
                    type="number"
                    min="0"
                    value={l.capital || ""}
                    onChange={(e) =>
                      setLine(l.id, { capital: Number(e.target.value) || 0 })
                    }
                    className={`${inputCls} w-28`}
                  />
                </label>
                <label className="text-xs text-gray-400">
                  Jual
                  <input
                    type="number"
                    min="0"
                    value={l.sell || ""}
                    onChange={(e) =>
                      setLine(l.id, { sell: Number(e.target.value) || 0 })
                    }
                    className={`${inputCls} w-28`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeLine(l.id)}
                  className="text-sm text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-400">
              {isOperator
                ? `Operator: tiap baris + ${formatTHB(OPERATOR_MARGIN)} margin.`
                : "Customer: pakai kolom Jual."}
            </p>
          </div>
        )}
      </section>

      {lines.length === 0 ? (
        <p className="text-sm text-gray-400">
          Tambah minimal satu baris untuk lihat preview invoice.
        </p>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
          <div className="min-w-[700px] sm:min-w-0 print:min-w-0">
            <BuiltInvoiceDoc
              mode={mode}
              billTo={billTo}
              invoiceNumber={invoiceNumber}
              date={date}
              lines={lines}
            />
          </div>
        </div>
      )}
    </div>
  );
}
