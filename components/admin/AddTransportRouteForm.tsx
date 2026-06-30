"use client";

import { useState } from "react";
import { Field, btnCls, inputCls } from "@/components/admin/ui";
import {
  normalizeNewTransportRouteInput,
  type NewTransportRouteDraft,
  type NewTransportRouteInput,
} from "@/lib/admin/customTransportRoutes";

const EMPTY_DRAFT: NewTransportRouteDraft = {
  group_name: "",
  name: "",
  altis_cost: "",
  altis_sell: "",
  suv_cost: "",
  suv_sell: "",
  van_cost: "",
  van_sell: "",
};

const FLEETS = [
  ["altis", "Altis"],
  ["suv", "SUV"],
  ["van", "Van"],
] as const;

export interface AddTransportRouteFormProps {
  groups: string[];
  onAdd: (input: NewTransportRouteInput) => Promise<boolean>;
}

export default function AddTransportRouteForm({
  groups,
  onAdd,
}: AddTransportRouteFormProps) {
  const [draft, setDraft] = useState<NewTransportRouteDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const normalized = normalizeNewTransportRouteInput(draft);

  function setField(field: keyof NewTransportRouteDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!normalized || busy) return;

    setBusy(true);
    const saved = await onAdd(normalized);
    setBusy(false);
    if (saved) setDraft(EMPTY_DRAFT);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-[#F5C518]/40 border-t-4 border-t-[#F5C518] bg-[#FFFCEF] p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5C518] text-xl font-bold leading-none text-[#1B2A4A] shadow-sm">
          +
        </span>
        <div>
          <h3 className="font-bold text-[#1B2A4A]">Tambah rute baru</h3>
          <p className="mt-0.5 text-xs leading-5 text-gray-500">
            Isi modal dan harga jual untuk setiap tipe kendaraan.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.5fr]">
        <Field label="Grup rute">
          <input
            value={draft.group_name}
            onChange={(event) => setField("group_name", event.target.value)}
            list="transport-route-groups"
            placeholder="Airport Pickup"
            className={inputCls}
          />
          <datalist id="transport-route-groups">
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </Field>
        <Field label="Nama rute">
          <input
            value={draft.name}
            onChange={(event) => setField("name", event.target.value)}
            placeholder="BKK → Rayong"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {FLEETS.map(([fleet, label]) => (
          <fieldset
            key={fleet}
            className="rounded-lg border border-[#E8DCA8] bg-white/70 p-3"
          >
            <legend className="px-1 text-xs font-bold uppercase tracking-[0.08em] text-[#1B2A4A]">
              {label}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Modal">
                <input
                  type="number"
                  min="0"
                  value={draft[`${fleet}_cost`]}
                  onChange={(event) =>
                    setField(`${fleet}_cost`, event.target.value)
                  }
                  className={`${inputCls} text-right tabular-nums`}
                />
              </Field>
              <Field label="Jual">
                <input
                  type="number"
                  min="0"
                  value={draft[`${fleet}_sell`]}
                  onChange={(event) =>
                    setField(`${fleet}_sell`, event.target.value)
                  }
                  className={`${inputCls} text-right font-semibold tabular-nums`}
                />
              </Field>
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={!normalized || busy}
          className={`${btnCls} min-h-11 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`}
        >
          {busy ? "Menambahkan…" : "Tambah rute"}
        </button>
      </div>
    </form>
  );
}
