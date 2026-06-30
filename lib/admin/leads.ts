// lib/admin/leads.ts
"use client";

import { createClient } from "@/lib/supabase/client";
import type { LeadChannel } from "@/lib/admin/leadMessaging";

export type { LeadChannel };
export type LeadStage =
  | "outreach" | "in_contact" | "interested" | "not_interested" | "closed";

export interface Lead {
  id: string;
  name: string;
  channel: LeadChannel;
  handle: string | null;
  phone: string | null;
  stage: LeadStage;
  note: string | null;
  est_value_idr: number;
  order_id: string | null;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
}

// Column order for the board; not_interested sits last as the dead branch.
export const LEAD_STAGES: LeadStage[] = [
  "outreach",
  "in_contact",
  "interested",
  "closed",
  "not_interested",
];

export const STAGE_LABELS: Record<LeadStage, string> = {
  outreach: "Outreach",
  in_contact: "In contact",
  interested: "Tertarik",
  closed: "Closed",
  not_interested: "Tidak tertarik",
};

export const STAGE_COLORS: Record<LeadStage, string> = {
  outreach: "bg-gray-100 text-gray-700",
  in_contact: "bg-blue-100 text-blue-700",
  interested: "bg-amber-100 text-amber-700",
  closed: "bg-green-100 text-green-700",
  not_interested: "bg-red-100 text-red-700",
};

export const CHANNELS: LeadChannel[] = [
  "instagram",
  "whatsapp",
  "facebook",
  "tiktok",
  "website",
  "other",
];

export const CHANNEL_META: Record<
  LeadChannel,
  { label: string; short: string; color: string }
> = {
  instagram: { label: "Instagram", short: "IG", color: "bg-pink-100 text-pink-700" },
  whatsapp: { label: "WhatsApp", short: "WA", color: "bg-green-100 text-green-700" },
  facebook: { label: "Facebook", short: "FB", color: "bg-blue-100 text-blue-700" },
  tiktok: { label: "TikTok", short: "TT", color: "bg-gray-200 text-gray-800" },
  website: { label: "Website", short: "WEB", color: "bg-indigo-100 text-indigo-700" },
  other: { label: "Lainnya", short: "—", color: "bg-gray-100 text-gray-600" },
};

export const DEFAULT_TEMPLATES: Record<LeadStage, string> = {
  outreach:
    "Halo {nama}! 😊 Terima kasih sudah tertarik dengan paket tour Thailand kami. Boleh saya bantu rencanakan perjalanannya?",
  in_contact:
    "Halo {nama}, mau lanjut bantu rencanakan trip-nya ya. Kira-kira berapa orang dan tanggal berapa rencananya?",
  interested:
    "Halo {nama}, ini detail paket yang cocok untuk Anda. Kalau sudah pas, kami siapkan invoice & itinerary lengkapnya ya 🙌",
  not_interested:
    "Baik {nama}, tidak masalah. Kalau nanti ada rencana ke Thailand, jangan ragu hubungi kami lagi ya 🙏",
  closed:
    "Terima kasih {nama}! 🎉 Kami senang bisa membantu. Detail trip akan kami kirimkan segera.",
};

/** All leads, newest-updated first. */
export async function listLeads(): Promise<Lead[]> {
  const { data } = await createClient()
    .from("leads")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data as Lead[] | null) ?? [];
}

/** Insert a lead; returns the row. Throws on DB error. */
export async function createLead(patch: Partial<Lead>): Promise<Lead | null> {
  const { data, error } = await createClient()
    .from("leads")
    .insert(patch)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return (data as Lead) ?? null;
}

/** Patch a lead; always bumps updated_at. */
export async function updateLead(
  id: string,
  patch: Partial<Lead>
): Promise<void> {
  await createClient()
    .from("leads")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteLead(id: string): Promise<void> {
  await createClient().from("leads").delete().eq("id", id);
}
