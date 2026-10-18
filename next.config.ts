import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/base-path.ts";

/** Sent with every page and file. HSTS comes from Vercel already. There is no script-src rule on purpose: Next's own inline scripts and the analytics beacon would need a nonce setup first. */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
];

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  // Logos, scenes and sprites are never edited in place, so browsers keep them for a day and refresh quietly in the background for a week. Without this Vercel sends them with max-age=0.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [{ source: "/:path*", headers: SECURITY_HEADERS }, { source: "/assets/:path*", headers: cache }, { source: "/tool-logos/:path*", headers: cache }];
  },
  async redirects() {
    return [
      // www is only a doorway: it forwards to the one address people should see. Host rules go first: the first matching rule wins.
      { source: "/:path*", has: [{ type: "host", value: "www.ghernie.com" }], destination: "https://ghernie.com/:path*", basePath: false, permanent: true },
      // The old subdomain next.
      { source: "/:path*", has: [{ type: "host", value: "itsa10but.ghernie.com" }], destination: "https://ghernie.com/itsa10but/:path*", basePath: false, permanent: true },
      // The vercel.app address is not the home of this site. It has the same paths as ghernie.com, so the path carries over unchanged.
      { source: "/:path*", has: [{ type: "host", value: "itsa10but.vercel.app" }], destination: "https://ghernie.com/:path*", basePath: false, permanent: true },
      // Crawlers only look for these two files at the root of the domain, and this app owns that domain. A redirect is enough: they follow it.
      { source: "/robots.txt", destination: `${BASE_PATH}/robots.txt`, basePath: false, permanent: false },
      // security.txt is looked up at this fixed address on the domain, so it is forwarded to the copy the app serves.
      { source: "/.well-known/security.txt", destination: `${BASE_PATH}/.well-known/security.txt`, basePath: false, permanent: false },
      { source: "/sitemap.xml", destination: `${BASE_PATH}/sitemap.xml`, basePath: false, permanent: false },
      // The root is free for a portfolio later; until then it sends people here.
      { source: "/", destination: "/itsa10but", basePath: false, permanent: false },
    ];
  },
};

export default nextConfig;
