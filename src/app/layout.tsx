import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import {
  Instrument_Serif,
  Noto_Sans_Javanese,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ScrollToHash } from "@/components/ScrollToHash";
import ScrollRestoration from "@/components/ScrollRestoration";
import AssetErrorBanner from "@/components/AssetErrorBanner";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

const ppNeueMontreal = localFont({
  src: [
    { path: "./fonts/ppneuemontreal-thin.woff", weight: "100", style: "normal" },
    { path: "./fonts/ppneuemontreal-book.woff", weight: "400", style: "normal" },
    { path: "./fonts/ppneuemontreal-italic.woff", weight: "400", style: "italic" },
    { path: "./fonts/ppneuemontreal-medium.woff", weight: "500", style: "normal" },
    { path: "./fonts/ppneuemontreal-bold.woff", weight: "700", style: "normal" },
    { path: "./fonts/ppneuemontreal-semibolditalic.woff", weight: "600", style: "italic" },
  ],
  variable: "--font-pp-neue-original",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const notoSansJavanese = Noto_Sans_Javanese({
  subsets: ["javanese"],
  weight: ["400", "500"],
  variable: "--font-javanese",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IKASADA FIB UI - Ikatan Alumni Sastra Daerah Universitas Indonesia",
  description:
    "Wadah silaturahmi, jejaring profesional, dan dedikasi kolektif alumni Sastra Daerah Fakultas Ilmu Pengetahuan Budaya Universitas Indonesia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${ppNeueMontreal.variable} ${plusJakartaSans.variable} ${instrumentSerif.variable} ${notoSansJavanese.variable} bg-[#f2f2f4] text-[#0f1012] selection:bg-[#0071e3]/20 selection:text-[#0f1012] transition-colors duration-300 antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <MotionProvider>
            <Suspense>
              <ScrollToHash />
              <ScrollRestoration />
            </Suspense>
            {children}
            <AssetErrorBanner />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
