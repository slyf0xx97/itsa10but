import { ImageResponse } from "next/og";
import { brandIcon, brandIconAssets } from "@/lib/brand-icon";

/** The home-screen icon for phones: the same drawing as the tab icon at 180 pixels. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const { pixel, sheetUri } = await brandIconAssets();
  return new ImageResponse(brandIcon(180, sheetUri), { ...size, fonts: [{ name: "Pixelify", data: pixel, weight: 600, style: "normal" }] });
}
