/**
 * The address people and search engines are given: ghernie.com/itsa10but. The app itself lives under the base path /projects/itsa10but (lib/base-path.ts),
 * and vercel.json rewrites the short address to it, so both open the page. Canonical links, the sitemap and the share data all name the short one.
 */
export const SITE_ORIGIN = "https://ghernie.com";
export const PUBLIC_PATH = "/itsa10but";
export const SITE_URL = SITE_ORIGIN + PUBLIC_PATH;
