import type {
  FleetKey,
  Service,
  ServiceGroup,
  VehiclePrice,
} from "@/lib/admin/priceBook";

export interface CustomTransportRoute {
  id: string;
  group_name: string;
  name: string;
  altis_cost: number;
  altis_sell: number;
  suv_cost: number;
  suv_sell: number;
  van_cost: number;
  van_sell: number;
  sort: number;
  created_at?: string;
  updated_at?: string;
}

export type CustomRouteNumericField =
  | "altis_cost"
  | "altis_sell"
  | "suv_cost"
  | "suv_sell"
  | "van_cost"
  | "van_sell";

export type CustomRoutePatch = Partial<
  Pick<
    CustomTransportRoute,
    "group_name" | "name" | CustomRouteNumericField
  >
>;

export function customRoutePrice(
  route: CustomTransportRoute,
  fleet: FleetKey
): VehiclePrice {
  return {
    cost: Number(route[`${fleet}_cost` as CustomRouteNumericField]),
    sell: Number(route[`${fleet}_sell` as CustomRouteNumericField]),
  };
}

export function customRouteToService(route: CustomTransportRoute): Service {
  return {
    id: route.id,
    name: route.name,
    customRoute: route,
    prices: {
      altis: customRoutePrice(route, "altis"),
      suv: customRoutePrice(route, "suv"),
      van: customRoutePrice(route, "van"),
    },
  };
}

export function mergeCustomTransportRoutes(
  groups: ServiceGroup[],
  customRoutes: CustomTransportRoute[]
): ServiceGroup[] {
  const merged = groups.map((group) => ({
    ...group,
    services: [...group.services],
  }));
  const byName = new Map(merged.map((group) => [group.group, group]));

  for (const route of [...customRoutes].sort((a, b) => a.sort - b.sort)) {
    let group = byName.get(route.group_name);
    if (!group) {
      group = { group: route.group_name, services: [] };
      merged.push(group);
      byName.set(route.group_name, group);
    }
    group.services.push(customRouteToService(route));
  }

  return merged;
}
