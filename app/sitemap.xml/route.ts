const productionUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  "https://kelilingthailand.com";

const baseUrl = productionUrl.startsWith("http")
  ? productionUrl
  : `https://${productionUrl}`;

const routes = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "services", changeFrequency: "monthly", priority: 0.9 },
  { path: "airport-transfer", changeFrequency: "monthly", priority: 0.9 },
  { path: "city-tours", changeFrequency: "monthly", priority: 0.9 },
  { path: "location", changeFrequency: "monthly", priority: 0.7 },
  { path: "about", changeFrequency: "monthly", priority: 0.6 },
  { path: "testimony", changeFrequency: "monthly", priority: 0.6 },
  { path: "contact", changeFrequency: "monthly", priority: 0.6 },
] as const;

export function GET() {
  const lastModified = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(({ path, changeFrequency, priority }) => {
    const url = path ? `${baseUrl}/${path}` : baseUrl;
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
