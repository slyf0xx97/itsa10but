import type { MetadataRoute } from "next";

/** Served at /robots.txt on ghernie.com through the rewrite in next.config.ts. The API routes are not pages, so crawlers skip them. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: "https://ghernie.com/sitemap.xml" };
}
