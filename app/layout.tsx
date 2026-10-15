import { BASE_PATH } from "@/lib/base-path";
import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });
const read = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-read", display: "swap" });

export const metadata: Metadata = {
  title: "itsa10but | Find the “but” in your résumé",
  description: "Paste a tech job, add your résumé and see what four pixel readers find. Every score comes with a quote from your résumé.",
  icons: {
    icon: `${BASE_PATH}/favicon.svg`,
    shortcut: `${BASE_PATH}/favicon.svg`,
  },
};

export const viewport: Viewport = { themeColor: "#d9f0fb" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pixel.variable} ${read.variable}`}>
      <body>{children}</body>
    </html>
  );
}
