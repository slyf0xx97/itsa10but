import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site-url";

/** Served at /robots.txt on ghernie.com through the redirect in next.config.ts. The API routes are not pages, so crawlers skip them on both addresses. The page, its scripts and its images stay open. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/itsa10but/api/", "/projects/itsa10but/api/", "/admin", "/projects/itsa10but/admin"] }, sitemap: `${SITE_ORIGIN}/sitemap.xml`, host: SITE_ORIGIN };
}
