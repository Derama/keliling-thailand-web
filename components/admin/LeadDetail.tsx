// components/admin/LeadDetail.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import Select from "@/components/admin/Select";
import { loadSetting } from "@/lib/admin/settings";
import { LEAD_TEMPLATES_KEY } from "@/components/admin/LeadTemplatesModal";
import {
  CHANNELS,
  CHANNEL_META,
  LEAD_STAGES,
  STAGE_LABELS,
  DEFAULT_TEMPLATES,
  updateLead,
  deleteLead,
  type Lead,
  type LeadStage,
  type LeadChannel,
} from "@/lib/admin/leads";
import { fillTemplate, waLink, profileUrl } from "@/lib/admin/leadMessaging";

/**
 * Edit one lead: fields, stage, stage-based messaging actions, convert-to-order,
 * and delete. Rendered inside a Modal by LeadsView. `onChanged` refreshes the
 * board; `onClose` dismisses.
 */
export default function LeadDetail({
  lead,
  onChanged,
  onClose,
}: {
  lead: Lead;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(lead.name);
  const [channel, setChannel] = useState<LeadChannel>(lead.channel);
  const [handle, setHandle] = useState(lead.handle ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [estValue, setEstValue] = useState(lead.est_value_idr);
  const [note, setNote] = useState(lead.note ?? "");
  const [orderId, setOrderId] = useState(lead.order_id);
  const [templates, setTemplates] =
    useState<Record<LeadStage, string>>(DEFAULT_TEMPLATES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSetting<Record<LeadStage, string>>(LEAD_TEMPLATES_KEY).then((stored) => {
      if (stored) setTemplates({ ...DEFAULT_TEMPLATES, ...stored });
    });
  }, []);

  const filled = fillTemplate(templates[stage], { name });
  const wa = waLink(phone, filled);
  const profile = profileUrl(channel, handle);

  async function save() {
    setSaving(true);
    setError(null);
    await updateLead(lead.id, {
      name,
      channel,
      handle: handle || null,
      phone: phone || null,
      stage,
      est_value_idr: estValue,
      note: note || null,
    });
    setSaving(false);
    onChanged();
  }

  async function markContacted() {
    await updateLead(lead.id, { last_contacted_at: new Date().toISOString() });
    onChanged();
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(filled);
    markContacted();
  }

  async function convertToOrder() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data: cust, error: cErr } = await supabase
        .from("customers")
        .insert({ name, phone: phone || null })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      // order_number is assigned by the orders_assign_number BEFORE INSERT trigger.
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          customer_id: cust.id,
          status: "inquiry",
          notes: `Dari lead · ${CHANNEL_META[channel].label}`,
        })
        .select("id")
        .single();
      if (oErr) throw new Error(oErr.message);
      await updateLead(lead.id, { order_id: order.id });
      setOrderId(order.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat order.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Hapus lead ${name || "ini"}?`)) return;
    await deleteLead(lead.id);
    onChanged();
    onClose();
  }

  return (
    <div className="space-y-4">
      <ErrorNote message={error} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Channel">
          <Select
            value={channel}
            onChange={(v) => setChannel(v as LeadChannel)}
            options={CHANNELS.map((c) => ({ value: c, label: CHANNEL_META[c].label }))}
          />
        </Field>
        <Field label="Handle / profil">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@username atau URL"
            className={inputCls}
          />
        </Field>
        <Field label="Telepon (untuk WA)">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+62…"
            className={inputCls}
          />
        </Field>
        <Field label="Tahap">
          <Select
            value={stage}
            onChange={(v) => setStage(v as LeadStage)}
            options={LEAD_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
          />
        </Field>
        <Field label="Estimasi nilai (IDR)">
          <input
            type="number"
            min={0}
            value={estValue || ""}
            onChange={(e) => setEstValue(Number(e.target.value) || 0)}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Catatan">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} />
      </Field>

      <button type="button" onClick={save} disabled={saving} className={`${btnCls} disabled:opacity-50`}>
        {saving ? "Menyimpan…" : "Simpan"}
      </button>

      {/* Message block — stage-based template + send actions */}
      <section className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Pesan · {STAGE_LABELS[stage]}
        </p>
        <p className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-gray-700">
          {filled}
        </p>
        <div className="flex flex-wrap gap-2">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              onClick={markContacted}
              className={btnCls}
            >
              Kirim WA
            </a>
          )}
          <button type="button" onClick={copyMessage} className={btnSecondaryCls}>
            Salin pesan
          </button>
          {profile && (
            <a href={profile} target="_blank" rel="noopener noreferrer" className={btnSecondaryCls}>
              Buka profil
            </a>
          )}
        </div>
      </section>

      {/* Convert / order link */}
      <section className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
        {orderId ? (
          <a
            href={`/admin/orders/${orderId}`}
            className="font-medium text-[#1B2A4A] hover:underline"
          >
            Buka order →
          </a>
        ) : stage === "closed" ? (
          <button type="button" onClick={convertToOrder} disabled={saving} className={`${btnCls} disabled:opacity-50`}>
            Buat order
          </button>
        ) : (
          <span className="text-xs text-gray-400">
            Tandai “Closed” untuk membuat order.
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Hapus lead
        </button>
      </section>
    </div>
  );
}
