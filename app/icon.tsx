import { ImageResponse } from "next/og";
import { brandIcon, brandIconAssets } from "@/lib/brand-icon";

/** The tab icon: a résumé with a 10 on it and the four readers in its corners. Drawn at build time. */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  const { pixel, sheetUri } = await brandIconAssets();
  return new ImageResponse(brandIcon(512, sheetUri), { ...size, fonts: [{ name: "Pixelify", data: pixel, weight: 600, style: "normal" }] });
}
