// components/admin/LeadTemplatesModal.tsx
"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import { inputCls, btnCls } from "@/components/admin/ui";
import { loadSetting, saveSetting } from "@/lib/admin/settings";
import {
  LEAD_STAGES,
  STAGE_LABELS,
  DEFAULT_TEMPLATES,
  type LeadStage,
} from "@/lib/admin/leads";

export const LEAD_TEMPLATES_KEY = "lead_templates";

export default function LeadTemplatesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [templates, setTemplates] =
    useState<Record<LeadStage, string>>(DEFAULT_TEMPLATES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadSetting<Record<LeadStage, string>>(LEAD_TEMPLATES_KEY).then((stored) => {
      if (stored) setTemplates({ ...DEFAULT_TEMPLATES, ...stored });
    });
  }, [open]);

  async function save() {
    setSaving(true);
    await saveSetting(LEAD_TEMPLATES_KEY, templates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title="Template pesan per tahap">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Pakai <code className="rounded bg-gray-100 px-1">{"{nama}"}</code>{" "}
          untuk menyisipkan nama lead.
        </p>
        {LEAD_STAGES.map((s) => (
          <label key={s} className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              {STAGE_LABELS[s]}
            </span>
            <textarea
              value={templates[s]}
              onChange={(e) =>
                setTemplates((t) => ({ ...t, [s]: e.target.value }))
              }
              rows={3}
              className={inputCls}
            />
          </label>
        ))}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={`${btnCls} disabled:opacity-50`}
          >
            {saving ? "Menyimpan…" : "Simpan template"}
          </button>
          {saved && (
            <span className="text-xs font-medium text-green-700">
              Tersimpan ✓
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
