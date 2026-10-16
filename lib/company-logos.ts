/**
 * Local logo files for the employers in lib/company-culture.ts, shown in the "About company" row. Each is the employer's own icon, saved once with its origin
 * in public/assets/logos/SOURCES.md, so the page never loads an image from another host. An employer found on the web has no file, and the row shows a letter instead.
 */
const LOGOS: Record<string, string> = {
  "Amazon (AWS)": "aws.png",
  Google: "company-google.png",
  Microsoft: "microsoft.png",
  Meta: "company-meta.webp",
  Grab: "company-grab.ico",
  DBS: "company-dbs.ico",
  "GovTech Singapore": "govtech.png",
  Stripe: "company-stripe.ico",
  Atlassian: "company-atlassian.png",
  Netflix: "company-netflix.ico",
};

/** The file name under public/assets/logos for an employer, or null when there is none. */
export const companyLogoFile = (name: string): string | null => (Object.hasOwn(LOGOS, name) ? LOGOS[name] : null);
