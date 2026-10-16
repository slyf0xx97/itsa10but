import type { MetadataRoute } from "next";
import { PUBLIC_PATH } from "@/lib/site-url";

/** Lets a phone offer "add to home screen" with the site's own name and colours. Every value is a fixed fact about the site. */
export default function manifest(): MetadataRoute.Manifest {
  return { name: "itsa10but: free résumé checker for tech jobs", short_name: "itsa10but", description: "Compare your résumé with a tech job and see the proof behind each skill score.", start_url: PUBLIC_PATH + "/", scope: PUBLIC_PATH + "/", display: "standalone", background_color: "#d9f0fb", theme_color: "#d9f0fb", icons: [{ src: PUBLIC_PATH + "/icon", sizes: "512x512", type: "image/png" }, { src: PUBLIC_PATH + "/favicon.svg", sizes: "any", type: "image/svg+xml" }] };
}
