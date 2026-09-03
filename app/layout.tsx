import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Sponsas — Sponsorship made simple",
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "patrocínio",
    "patrocínio esportivo",
    "arrancada",
    "drag racing",
    "automobilismo",
    "pilotos",
    "marcas",
    "permuta",
  ],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "pt_BR",
    url: SITE_URL,
    title: "Sponsas — Sponsorship made simple",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Sponsas — Sponsorship made simple",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
