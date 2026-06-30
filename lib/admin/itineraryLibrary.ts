"use client";

import { createClient } from "@/lib/supabase/client";

/** A row in the standalone itinerary library (not tied to an order). */
export interface ItineraryRow<T = unknown> {
  id: string;
  title: string;
  data: T;
  updated_at: string;
}

/** All saved itineraries, newest-edited first. */
export async function listItineraries<T = unknown>(): Promise<
  ItineraryRow<T>[]
> {
  const { data } = await createClient()
    .from("itineraries")
    .select("id, title, data, updated_at")
    .order("updated_at", { ascending: false });
  return (data as ItineraryRow<T>[] | null) ?? [];
}

/** One saved itinerary's title + draft, or null if it no longer exists. */
export async function loadItinerary<T = unknown>(
  id: string
): Promise<{ title: string; data: T } | null> {
  const { data } = await createClient()
    .from("itineraries")
    .select("title, data")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { title: (data.title as string) ?? "", data: data.data as T };
}

/** Create a new library itinerary; returns its id. Throws on DB error. */
export async function createItinerary<T>(
  title: string,
  data: T
): Promise<string | null> {
  const { data: row, error } = await createClient()
    .from("itineraries")
    .insert({ title, data })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (row?.id as string) ?? null;
}

/** Update an existing library itinerary's title + draft. */
export async function saveItinerary<T>(
  id: string,
  title: string,
  data: T
): Promise<void> {
  await createClient()
    .from("itineraries")
    .update({ title, data, updated_at: new Date().toISOString() })
    .eq("id", id);
}

/** Delete a library itinerary. */
export async function deleteItinerary(id: string): Promise<void> {
  await createClient().from("itineraries").delete().eq("id", id);
}
