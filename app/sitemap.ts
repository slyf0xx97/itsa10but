import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * One page, listed once under its canonical address. Served at /sitemap.xml on ghernie.com through the redirect in next.config.ts.
 * The share image is listed with it so image search can find it. The long address (/projects/itsa10but) also opens the page but is left out on purpose:
 * its canonical link points here, and a sitemap should name only canonical addresses.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1, images: [`${SITE_URL}/opengraph-image`] }];
}
