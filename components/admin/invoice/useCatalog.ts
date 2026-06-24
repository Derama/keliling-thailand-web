"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PRICE_BOOK,
  FLEET_KEYS,
  FLEET_LABELS,
  isContact,
  mergeAddOns,
  type HotelRate,
  type Attraction,
  type AddOnRate,
} from "@/lib/admin/priceBook";

/** A single pickable catalog entry, already priced per unit. */
export interface CatalogItem {
  key: string;
  /** Section heading the item is filed under. */
  group: string;
  label: string;
  capital: number;
  sell: number;
  /** Tag shown in the invoice "Service Type" column. */
  serviceType: string;
  unit?: string;
}

export interface CatalogSection {
  group: string;
  items: CatalogItem[];
}

/**
 * Build the unified invoice catalog: fixed routes (expanded per fleet),
 * add-ons, plus live hotel + attraction rates from Supabase.
 */
export function useCatalog() {
  const [hotels, setHotels] = useState<HotelRate[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [addOns, setAddOns] = useState<AddOnRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    Promise.all([
      supabase.from("hotel_rates").select("*").order("sort", { ascending: true }),
      supabase
        .from("attraction_rates")
        .select("*")
        .order("sort", { ascending: true }),
      supabase.from("add_ons").select("*").order("sort", { ascending: true }),
    ]).then(([h, a, ao]) => {
      if (!alive) return;
      setHotels((h.data as HotelRate[]) ?? []);
      setAttractions((a.data as Attraction[]) ?? []);
      setAddOns(mergeAddOns((ao.data as AddOnRate[]) ?? []));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const sections = useMemo<CatalogSection[]>(() => {
    const out: CatalogSection[] = [];

    // Routes — one entry per fleet, skipping quote-on-request services.
    for (const g of PRICE_BOOK) {
      const items: CatalogItem[] = [];
      for (const s of g.services) {
        if (isContact(s) || !s.prices) continue;
        for (const k of FLEET_KEYS) {
          const p = s.prices[k];
          items.push({
            key: `route-${s.id}-${k}`,
            group: g.group,
            label: `${s.name} · ${FLEET_LABELS[k]}`,
            capital: p.cost,
            sell: p.sell,
            serviceType: FLEET_LABELS[k],
          });
        }
      }
      if (items.length) out.push({ group: g.group, items });
    }

    // Hotels grouped by city.
    const hotelByCity = new Map<string, CatalogItem[]>();
    for (const h of hotels) {
      const arr = hotelByCity.get(h.city) ?? [];
      arr.push({
        key: `hotel-${h.id}`,
        group: `Hotel — ${h.city}`,
        label: h.name,
        capital: h.capital,
        sell: h.capital + h.margin,
        serviceType: "Hotel",
        unit: "malam",
      });
      hotelByCity.set(h.city, arr);
    }
    for (const [city, items] of hotelByCity)
      out.push({ group: `Hotel — ${city}`, items });

    // Attractions grouped by city (skip rows with no price yet).
    const attrByCity = new Map<string, CatalogItem[]>();
    for (const a of attractions) {
      if (a.price == null) continue;
      const arr = attrByCity.get(a.city) ?? [];
      arr.push({
        key: `attr-${a.id}`,
        group: `Tiket — ${a.city}`,
        label: a.name,
        capital: a.price,
        sell: a.price + a.margin,
        serviceType: "Tiket",
        unit: "pax",
      });
      attrByCity.set(a.city, arr);
    }
    for (const [city, items] of attrByCity)
      out.push({ group: `Tiket — ${city}`, items });

    // Add-ons (pass-through items start at 0).
    if (addOns.length)
      out.push({
        group: "Biaya Tambahan",
        items: addOns.map((a) => ({
          key: `addon-${a.id}`,
          group: "Biaya Tambahan",
          label: a.name,
          capital: a.price ?? 0,
          sell: a.price ?? 0,
          serviceType: "Tambahan",
          unit: a.unit?.replace("/", "").trim() || undefined,
        })),
      });

    return out;
  }, [hotels, attractions, addOns]);

  return { sections, loading };
}
