"use client";

import { useState } from "react";
import { formatIDR, formatTHB } from "@/lib/admin/utils";
import { Field, inputCls } from "@/components/admin/ui";
import FxRateHint from "@/components/admin/FxRateHint";

interface CostRow {
  label: string;
  thb: string;
}

export default function CalculatorPage() {
  const [rows, setRows] = useState<CostRow[]>([
    { label: "Sewa van + sopir", thb: "" },
    { label: "Bensin + tol", thb: "" },
  ]);
  const [priceIdr, setPriceIdr] = useState("");
  const [fxRate, setFxRate] = useState("");

  const totalCostThb = rows.reduce((sum, r) => sum + (Number(r.thb) || 0), 0);
  const price = Number(priceIdr) || 0;
  const rate = Number(fxRate) || 0;
  const profitThb = rate ? price / rate - totalCostThb : null;
  const profitIdr = profitThb !== null ? profitThb * rate : null;
  const marginPct =
    profitThb !== null && price > 0 && rate
      ? (profitThb / (price / rate)) * 100
      : null;

  function setRow(i: number, patch: Partial<CostRow>) {
    setRows((arr) => arr.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Kalkulator Margin</h1>
      <p className="text-sm text-gray-500">
        Coret-coretan untuk quotation. Tidak disimpan.
      </p>

      <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1B2A4A]">Biaya (THB)</h2>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={r.label}
              onChange={(e) => setRow(i, { label: e.target.value })}
              className={inputCls}
              placeholder="Hotel, tiket, guide…"
            />
            <input
              type="number"
              min="0"
              value={r.thb}
              onChange={(e) => setRow(i, { thb: e.target.value })}
              className={`${inputCls} max-w-40`}
              placeholder="THB"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setRows((arr) => arr.filter((_, j) => j !== i))
                }
                className="text-sm text-red-500"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((arr) => [...arr, { label: "", thb: "" }])}
          className="text-sm text-blue-600 hover:underline"
        >
          + baris biaya
        </button>
        <p className="text-sm">
          Total biaya: <strong>{formatTHB(totalCostThb)}</strong>
        </p>
      </section>

      <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <Field label="Harga jual (IDR)">
          <input
            type="number"
            min="0"
            value={priceIdr}
            onChange={(e) => setPriceIdr(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div>
          <Field label="Kurs (IDR per 1 THB)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <FxRateHint onApply={(r) => setFxRate(String(r))} />
        </div>
      </section>

      <section className="rounded-xl border-2 border-[#F5C518] bg-white p-5">
        {profitThb === null ? (
          <p className="text-sm text-gray-400">
            Isi harga jual dan kurs untuk melihat margin.
          </p>
        ) : (
          <div className="space-y-1">
            <p
              className={`text-2xl font-bold ${
                profitThb >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {formatTHB(profitThb)}
            </p>
            <p className="text-sm text-gray-600">
              ≈ {formatIDR(profitIdr ?? 0)} · margin{" "}
              {marginPct !== null ? `${marginPct.toFixed(1)}%` : "—"}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
