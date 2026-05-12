const productionUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  "https://kelilingthailand.com";

const baseUrl = productionUrl.startsWith("http")
  ? productionUrl
  : `https://${productionUrl}`;

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
Host: ${baseUrl}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
