// lib/admin/docLibrary.ts
"use client";

import { createClient } from "@/lib/supabase/client";

/** Document kinds that use the generic template table. */
export type TemplateKind = "invoice" | "joborder";

/** A row in the document_templates table. */
export interface TemplateRow<T = unknown> {
  id: string;
  kind: TemplateKind;
  title: string;
  data: T;
  order_number: string | null;
  updated_at: string;
}

/** All saved templates of one kind, newest-edited first. */
export async function listTemplates<T = unknown>(
  kind: TemplateKind
): Promise<TemplateRow<T>[]> {
  const { data } = await createClient()
    .from("document_templates")
    .select("id, kind, title, data, order_number, updated_at")
    .eq("kind", kind)
    .order("updated_at", { ascending: false });
  return (data as TemplateRow<T>[] | null) ?? [];
}

/** One saved template's title + draft, or null if it no longer exists. */
export async function loadTemplate<T = unknown>(
  id: string
): Promise<{ title: string; data: T } | null> {
  const { data } = await createClient()
    .from("document_templates")
    .select("title, data")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { title: (data.title as string) ?? "", data: data.data as T };
}

/** Create a template; returns its id. Throws on DB error. */
export async function createTemplate<T>(
  kind: TemplateKind,
  title: string,
  data: T,
  orderNumber?: string | null
): Promise<string | null> {
  const { data: row, error } = await createClient()
    .from("document_templates")
    .insert({ kind, title, data, order_number: orderNumber ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (row?.id as string) ?? null;
}

/** Update a template's title + draft. */
export async function saveTemplate<T>(
  id: string,
  title: string,
  data: T
): Promise<void> {
  await createClient()
    .from("document_templates")
    .update({ title, data, updated_at: new Date().toISOString() })
    .eq("id", id);
}

/** Delete a template. */
export async function deleteTemplate(id: string): Promise<void> {
  await createClient().from("document_templates").delete().eq("id", id);
}
