import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/base-path.ts";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  async redirects() {
    return [
      // The old subdomain goes first: the first matching rule wins.
      { source: "/:path*", has: [{ type: "host", value: "itsa10but.ghernie.com" }], destination: `https://ghernie.com${BASE_PATH}/:path*`, basePath: false, permanent: true },
      // The root is free for a portfolio later; until then it sends people here.
      { source: "/", destination: BASE_PATH, basePath: false, permanent: false },
    ];
  },
};

export default nextConfig;
