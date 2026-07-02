// components/admin/views/LeadsView.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import { Field, inputCls, btnCls, btnSecondaryCls, ErrorNote } from "@/components/admin/ui";
import Select from "@/components/admin/Select";
import { formatIDR } from "@/lib/admin/utils";
import LeadCard from "@/components/admin/LeadCard";
import LeadDetail from "@/components/admin/LeadDetail";
import LeadTemplatesModal from "@/components/admin/LeadTemplatesModal";
import {
  listLeads,
  createLead,
  updateLead,
  CHANNELS,
  CHANNEL_META,
  LEAD_STAGES,
  STAGE_LABELS,
  type Lead,
  type LeadStage,
  type LeadChannel,
} from "@/lib/admin/leads";

const DRAG_MIME = "application/x-kt-lead";

export default function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // New-lead form state.
  const [nName, setNName] = useState("");
  const [nChannel, setNChannel] = useState<LeadChannel>("instagram");
  const [nHandle, setNHandle] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nValue, setNValue] = useState(0);

  const load = useCallback(async () => {
    try {
      setLeads(await listLeads());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat leads.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load(); state set after await, not during render
    load();
  }, [load]);

  async function addLead() {
    setError(null);
    try {
      await createLead({
        name: nName,
        channel: nChannel,
        handle: nHandle || null,
        phone: nPhone || null,
        est_value_idr: nValue,
        stage: "outreach",
      });
      setCreating(false);
      setNName("");
      setNHandle("");
      setNPhone("");
      setNValue(0);
      setNChannel("instagram");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah lead.");
    }
  }

  async function moveTo(id: string, stage: LeadStage) {
    await updateLead(id, { stage });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Leads</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTemplatesOpen(true)} className={btnSecondaryCls}>
            Template pesan
          </button>
          <button type="button" onClick={() => setCreating(true)} className={btnCls}>
            + Lead
          </button>
        </div>
      </div>
      <ErrorNote message={error} />

      {/* Board — columns scroll horizontally on phones. */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {LEAD_STAGES.map((stage) => {
          const col = leads.filter((l) => l.stage === stage);
          const sum = col.reduce((s, l) => s + Number(l.est_value_idr), 0);
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_MIME)) e.preventDefault();
              }}
              onDrop={(e) => {
                const id = e.dataTransfer.getData(DRAG_MIME);
                if (id) moveTo(id, stage);
              }}
              className="flex w-64 shrink-0 flex-col gap-2 rounded-xl bg-gray-50 p-2"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-[#1B2A4A]">
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-gray-400">
                  {col.length}
                  {sum > 0 ? ` · ${formatIDR(sum)}` : ""}
                </span>
              </div>
              {col.map((l) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  onOpen={() => setSelected(l)}
                  onDragStart={(e) => e.dataTransfer.setData(DRAG_MIME, l.id)}
                />
              ))}
              {col.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-gray-400">
                  Kosong
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Lead baru">
        <div className="space-y-3">
          <Field label="Nama">
            <input value={nName} onChange={(e) => setNName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Channel">
            <Select
              value={nChannel}
              onChange={(v) => setNChannel(v as LeadChannel)}
              options={CHANNELS.map((c) => ({ value: c, label: CHANNEL_META[c].label }))}
            />
          </Field>
          <Field label="Handle / profil">
            <input value={nHandle} onChange={(e) => setNHandle(e.target.value)} placeholder="@username atau URL" className={inputCls} />
          </Field>
          <Field label="Telepon (untuk WA)">
            <input value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="+62…" className={inputCls} />
          </Field>
          <Field label="Estimasi nilai (IDR)">
            <input
              type="number"
              min={0}
              value={nValue || ""}
              onChange={(e) => setNValue(Number(e.target.value) || 0)}
              className={inputCls}
            />
          </Field>
          <button type="button" onClick={addLead} className={btnCls}>
            Simpan lead
          </button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name || "Lead"}
        wide
      >
        {selected && (
          <LeadDetail
            lead={selected}
            onChanged={() => {
              load();
            }}
            onClose={() => setSelected(null)}
          />
        )}
      </Modal>

      <LeadTemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </div>
  );
}
