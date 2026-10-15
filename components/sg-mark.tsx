import { BASE_PATH } from "@/lib/base-path";
import Image from "next/image";
import { PixelIcon } from "@/components/career/pixel-icons";
import { skillArt } from "@/lib/skill-art";

// skillArt maps "Cloud" to three vendors; each tile here names one vendor, so it gets that logo.
const ownLogo: Record<string, string> = { AWS: "amazonwebservices-original-wordmark.svg", Azure: "azure-original.svg" };

/** The tool logo (or a pixel icon) for a skill name, small and decorative. */
export function Mark({ name }: { name: string }) {
  const art = skillArt(name);
  const logos = ownLogo[name] ? [ownLogo[name]] : art.logos;
  return <span className="sgs-mark" aria-hidden="true">{logos.length
    ? logos.map((file) => <Image key={file} src={BASE_PATH + "/tool-logos/" + file} width={24} height={24} alt="" unoptimized />)
    : <PixelIcon name={art.icon} size={22} />}</span>;
}
