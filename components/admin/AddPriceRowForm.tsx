"use client";

import { useState } from "react";
import { Field, inputCls, btnCls } from "@/components/admin/ui";

export default function AddPriceRowForm({
  title,
  cities,
  citiesId,
  amountLabel,
  amountRequired = false,
  onAdd,
}: {
  title: string;
  cities: string[];
  citiesId: string;
  amountLabel: string;
  amountRequired?: boolean;
  onAdd: (city: string, name: string, amount: string) => void | Promise<void>;
}) {
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const valid =
    city.trim() && name.trim() && (!amountRequired || amount.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    await onAdd(city.trim(), name.trim(), amount);
    setBusy(false);
    setCity("");
    setName("");
    setAmount("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-[#F5C518]/40 border-t-4 border-t-[#F5C518] bg-[#FFFCEF] p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5C518] text-xl font-bold leading-none text-[#1B2A4A] shadow-sm">
          +
        </span>
        <h3 className="text-base font-bold text-[#1B2A4A]">{title}</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1.6fr_1fr_auto] md:items-end">
        <Field label="Kota">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            list={citiesId}
            placeholder="Bangkok"
            className={inputCls}
          />
          <datalist id={citiesId}>
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Nama">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama"
            className={inputCls}
          />
        </Field>
        <Field label={amountLabel}>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
          />
        </Field>
        <button
          type="submit"
          disabled={!valid || busy}
          className={`${btnCls} min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50 md:h-[42px]`}
        >
          {busy ? "…" : "Tambah"}
        </button>
      </div>
    </form>
  );
}
