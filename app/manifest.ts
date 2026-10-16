import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/base-path";

/** Lets a phone offer "add to home screen" with the site's own name and colours. Every value is a fixed fact about the site. */
export default function manifest(): MetadataRoute.Manifest {
  return { name: "itsa10but: free résumé checker for tech jobs", short_name: "itsa10but", description: "Compare your résumé with a tech job and see the proof behind each skill score.", start_url: BASE_PATH + "/", scope: BASE_PATH + "/", display: "standalone", background_color: "#d9f0fb", theme_color: "#d9f0fb", icons: [{ src: BASE_PATH + "/icon", sizes: "512x512", type: "image/png" }, { src: BASE_PATH + "/favicon.svg", sizes: "any", type: "image/svg+xml" }] };
}
