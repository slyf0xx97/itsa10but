import { PUBLIC_PATH, SITE_ORIGIN, SITE_URL } from "@/lib/site-url";
import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Pixelify_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });
const read = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-read", display: "swap" });

const TITLE = "itsa10but | Free résumé checker for tech jobs";
const DESCRIPTION = "Free résumé checker for tech and tech-adjacent roles. Paste a job, add your résumé and four readers show the proof behind each skill score, with a PDF report and a skills radar.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "itsa10but",
  keywords: ["résumé checker", "resume checker", "ATS resume check", "tech jobs Singapore", "skills gap", "resume skills radar", "free resume review", "student résumé"],
  authors: [{ name: "Ghernie Encinas", url: "https://sg.linkedin.com/in/ghernie" }],
  creator: "Ghernie Encinas",
  category: "education",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: PUBLIC_PATH },
  robots: { index: true, follow: true },
  openGraph: { type: "website", url: PUBLIC_PATH, siteName: "itsa10but", title: TITLE, description: DESCRIPTION, locale: "en_SG", alternateLocale: ["en_US"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#d9f0fb", width: "device-width", initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pixel.variable} ${read.variable}`}>
      <body>
        {/* Search engines read this to show the page as a free web app. Every value is a fixed fact about the site; nothing comes from a visitor. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "WebApplication", name: "itsa10but", url: SITE_URL, description: DESCRIPTION,
          applicationCategory: "EducationalApplication", operatingSystem: "Any, in a web browser", browserRequirements: "Needs JavaScript", inLanguage: "en",
          audience: { "@type": "Audience", audienceType: "Students and people moving into tech" }, isAccessibleForFree: true,
          author: { "@type": "Person", name: "Ghernie Encinas", url: "https://sg.linkedin.com/in/ghernie", description: "Conceived the idea and the design system for itsa10but, with a strong interest in UI design and creativity." },
          featureList: ["Compares a résumé with a tech job posting", "Shows the quote in the résumé behind every skill score", "ATS-style résumé check", "Skills radar with free resources to close each gap", "PDF report and a Markdown prompt to download", "Works without an account or an API key"], offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }).replace(/</g, "\\u003c") }} />
        {children}
        {/* Cloudflare Web Analytics: free and cookie-less, counts visits only. Loads only when the token is set; no résumé or role text is ever sent to it. */}
        {process.env.NEXT_PUBLIC_CF_BEACON && <Script src="https://static.cloudflareinsights.com/beacon.min.js" strategy="afterInteractive" data-cf-beacon={JSON.stringify({ token: process.env.NEXT_PUBLIC_CF_BEACON })} />}
      </body>
    </html>
  );
}
