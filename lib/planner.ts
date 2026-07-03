export interface InitialPlan {
  initialStep: number;
  tripCities: string[];
  picks: string[][];
  customPlaces: string[][];
}

interface PlannerCity {
  id: string;
  durationHours: number;
  attractions: Array<{ id: string; hours: number }>;
}

export function defaultAttractionPicks(
  cityId: string,
  cityCatalog: PlannerCity[],
): string[] {
  const city = cityCatalog.find((item) => item.id === cityId);
  if (!city) return [];

  const picks: string[] = [];
  let usedHours = 0;

  for (const attraction of city.attractions) {
    if (usedHours + attraction.hours > city.durationHours) break;
    picks.push(attraction.id);
    usedHours += attraction.hours;
  }

  return picks;
}

export function createInitialPlan(
  initialCityId?: string,
  cityCatalog: PlannerCity[] = [],
): InitialPlan {
  const cityId =
    initialCityId && cityCatalog.some((item) => item.id === initialCityId)
      ? initialCityId
      : "";

  return {
    initialStep: cityId ? 2 : 0,
    tripCities: [cityId],
    picks: [cityId ? defaultAttractionPicks(cityId, cityCatalog) : []],
    customPlaces: [[]],
  };
}
