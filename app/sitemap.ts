import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/base-path";

/** One page. Served at /sitemap.xml on ghernie.com through the rewrite in next.config.ts. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `https://ghernie.com${BASE_PATH}`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
