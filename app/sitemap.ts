import type { MetadataRoute } from "next";

const productionUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  "https://kelilingthailand.com";

const baseUrl = productionUrl.startsWith("http")
  ? productionUrl
  : `https://${productionUrl}`;

const routes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "services", changeFrequency: "monthly", priority: 0.9 },
  { path: "airport-transfer", changeFrequency: "monthly", priority: 0.9 },
  { path: "city-tours", changeFrequency: "monthly", priority: 0.9 },
  { path: "location", changeFrequency: "monthly", priority: 0.7 },
  { path: "about", changeFrequency: "monthly", priority: 0.6 },
  { path: "testimony", changeFrequency: "monthly", priority: 0.6 },
  { path: "contact", changeFrequency: "monthly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: path ? `${baseUrl}/${path}` : baseUrl,
    lastModified,
    changeFrequency,
    priority,
  }));
}
