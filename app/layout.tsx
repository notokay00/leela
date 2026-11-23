import type { Metadata } from "next";
import {
  EB_Garamond,
  IBM_Plex_Mono,
  La_Belle_Aurore,
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

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const laBelleAurore = La_Belle_Aurore({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-la-belle-aurore",
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
        notoSerifDevanagari.variable,
        ibmPlexMono.variable,
        laBelleAurore.variable
      )}
    >
      <body className="min-h-screen bg-void font-serif text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
