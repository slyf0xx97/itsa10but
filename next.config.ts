import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/base-path.ts";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  // Logos, scenes and sprites are never edited in place, so browsers keep them for a day and refresh quietly in the background for a week. Without this Vercel sends them with max-age=0.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [{ source: "/assets/:path*", headers: cache }, { source: "/tool-logos/:path*", headers: cache }];
  },
  async redirects() {
    return [
      // The old subdomain goes first: the first matching rule wins.
      { source: "/:path*", has: [{ type: "host", value: "itsa10but.ghernie.com" }], destination: `https://ghernie.com${BASE_PATH}/:path*`, basePath: false, permanent: true },
      // The vercel.app address is not the home of this site. It has the same paths as ghernie.com, so the path carries over unchanged.
      { source: "/:path*", has: [{ type: "host", value: "itsa10but.vercel.app" }], destination: "https://ghernie.com/:path*", basePath: false, permanent: true },
      // Crawlers only look for these two files at the root of the domain, and this app owns that domain. A redirect is enough: they follow it.
      { source: "/robots.txt", destination: `${BASE_PATH}/robots.txt`, basePath: false, permanent: false },
      { source: "/sitemap.xml", destination: `${BASE_PATH}/sitemap.xml`, basePath: false, permanent: false },
      // The root is free for a portfolio later; until then it sends people here.
      { source: "/", destination: BASE_PATH, basePath: false, permanent: false },
    ];
  },
};

export default nextConfig;
