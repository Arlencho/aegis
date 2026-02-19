import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AEGIS — Treasury Risk Audit with AI Analysis",
  description:
    "Instant compliance monitoring for crypto treasuries. 10 regulatory-aligned risk rules, AI-powered analysis, and exportable PDF reports — in 30 seconds.",
  keywords: [
    "treasury audit",
    "crypto compliance",
    "risk analysis",
    "MiCA",
    "DeFi",
    "DAO treasury",
    "wallet audit",
    "stablecoin",
    "portfolio risk",
  ],
  openGraph: {
    title: "AEGIS — Treasury Risk Audit with AI",
    description:
      "10 compliance rules aligned with EU MiCA, SEC, FinCEN. AI analysis + PDF reports in 30 seconds.",
    url: "https://aegis.rios.xyz",
    siteName: "AEGIS",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AEGIS — Treasury Risk Audit with AI",
    description:
      "10 compliance rules. AI analysis. PDF reports. 30 seconds.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "AEGIS",
              applicationCategory: "FinanceApplication",
              description:
                "Treasury risk audit with AI analysis for crypto wallets. 10 regulatory-aligned compliance rules.",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
