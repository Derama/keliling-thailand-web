import type { ServiceGroup } from "@/lib/admin/priceBook";

const FLEETS = [
  ["altis", "Altis"],
  ["suv", "SUV"],
  ["van", "Van"],
] as const;

export interface CatalogItem {
  key: string;
  group: string;
  label: string;
  capital: number;
  sell: number;
  serviceType: string;
  unit?: string;
}

export interface CatalogSection {
  group: string;
  items: CatalogItem[];
}

export function buildRouteCatalogSections(
  routeGroups: ServiceGroup[]
): CatalogSection[] {
  const sections: CatalogSection[] = [];

  for (const group of routeGroups) {
    const items: CatalogItem[] = [];
    for (const service of group.services) {
      if (service.contact === true || !service.prices) continue;
      for (const [fleet, fleetLabel] of FLEETS) {
        const price = service.prices[fleet];
        items.push({
          key: `route-${service.id}-${fleet}`,
          group: group.group,
          label: `${service.name} · ${fleetLabel}`,
          capital: price.cost,
          sell: price.sell,
          serviceType: fleetLabel,
        });
      }
    }
    if (items.length) sections.push({ group: group.group, items });
  }

  return sections;
}
