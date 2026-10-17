import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Usage", robots: { index: false, follow: false } };

/** The usage page lives on the admin hub (admin.ghernie.com), behind Cloudflare Access, so this address only forwards there. */
export default function AdminPage() {
  redirect("https://admin.ghernie.com/itsa10but");
}
