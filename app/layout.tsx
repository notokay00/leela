import type { Metadata, Viewport } from "next";
import {
  EB_Garamond,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Noto_Serif_Devanagari,
} from "next/font/google";
import { cn } from "@/lib/cn";
import "./globals.css";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Archive of Us",
  description: "A private digital archive.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#070709",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        ebGaramond.variable,
        ibmPlexSans.variable,
        ibmPlexMono.variable,
        notoSerifDevanagari.variable
      )}
    >
      <body className="min-h-[100dvh] bg-void font-serif text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
