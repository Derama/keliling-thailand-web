export interface CatalogPlace {
  city: string;
  name: string;
  image_url: string | null;
  description: string | null;
}

export interface GeneratedPlace {
  name?: string;
  activity?: string;
}

export interface ResolvedGeneratedPlace {
  name: string;
  image: string;
  desc: string;
  activity: string;
}

const normalize = (value: string) => value.trim().toLowerCase();

export function resolveGeneratedPlaces(
  generated: GeneratedPlace[],
  catalog: CatalogPlace[],
  city: string,
  limit = 4
): ResolvedGeneratedPlace[] {
  const cityKey = normalize(city);
  const maxResults = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 4;
  const resolved: ResolvedGeneratedPlace[] = [];
  const seen = new Set<string>();

  for (const generatedPlace of generated) {
    if (resolved.length >= maxResults) break;

    const generatedName = generatedPlace.name?.trim() ?? "";
    const nameKey = normalize(generatedName);
    if (!nameKey) continue;

    const matchingCatalog = catalog.filter(
      (catalogPlace) => normalize(catalogPlace.name) === nameKey
    );
    const catalogPlace =
      matchingCatalog.find(
        (candidate) => normalize(candidate.city) === cityKey
      ) ?? matchingCatalog[0];
    const resolvedName = catalogPlace?.name.trim() || generatedName;
    const resolvedNameKey = normalize(resolvedName);

    if (seen.has(resolvedNameKey)) continue;
    seen.add(resolvedNameKey);

    resolved.push({
      name: resolvedName,
      image: catalogPlace?.image_url?.trim() ?? "",
      desc: catalogPlace?.description?.trim() ?? "",
      activity: generatedPlace.activity?.trim() ?? "",
    });
  }

  return resolved;
}
