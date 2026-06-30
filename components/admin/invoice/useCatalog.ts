"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  mergeAddOns,
  mergeTransportRates,
  applyTransportRates,
  type HotelRate,
  type Attraction,
  type AddOnRate,
  type TransportRate,
} from "@/lib/admin/priceBook";
import {
  mergeCustomTransportRoutes,
  type CustomTransportRoute,
} from "@/lib/admin/customTransportRoutes";
import {
  buildRouteCatalogSections,
  type CatalogItem,
  type CatalogSection,
} from "@/lib/admin/invoiceCatalog";

export type { CatalogItem, CatalogSection } from "@/lib/admin/invoiceCatalog";

/**
 * Build the unified invoice catalog: fixed routes (expanded per fleet),
 * add-ons, plus live hotel + attraction rates from Supabase.
 */
export function useCatalog() {
  const [hotels, setHotels] = useState<HotelRate[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [addOns, setAddOns] = useState<AddOnRate[]>([]);
  const [transportRates, setTransportRates] = useState<TransportRate[]>(() =>
    mergeTransportRates([])
  );
  const [customRoutes, setCustomRoutes] = useState<CustomTransportRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    Promise.all([
      supabase
        .from("transport_rates")
        .select("*")
        .order("sort", { ascending: true }),
      supabase
        .from("custom_transport_routes")
        .select("*")
        .order("sort", { ascending: true }),
      supabase.from("hotel_rates").select("*").order("sort", { ascending: true }),
      supabase
        .from("attraction_rates")
        .select("*")
        .order("sort", { ascending: true }),
      supabase.from("add_ons").select("*").order("sort", { ascending: true }),
    ]).then(([t, custom, h, a, ao]) => {
      if (!alive) return;
      setTransportRates(mergeTransportRates((t.data as TransportRate[]) ?? []));
      setCustomRoutes((custom.data as CustomTransportRoute[]) ?? []);
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
    const routeGroups = mergeCustomTransportRoutes(
      applyTransportRates(transportRates),
      customRoutes
    );
    const out = buildRouteCatalogSections(routeGroups);

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
  }, [transportRates, customRoutes, hotels, attractions, addOns]);

  return { sections, loading };
}
