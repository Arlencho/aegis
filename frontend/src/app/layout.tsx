import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
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
  metadataBase: new URL("https://aegistreasury.com"),
  title: "AEGIS — Treasury Risk Audit with AI Analysis",
  description:
    "Instant compliance monitoring for crypto treasuries. 10 regulatory-aligned risk rules, AI-powered analysis, and exportable PDF reports — in 30 seconds.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
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
    url: "https://aegistreasury.com",
    siteName: "AEGIS",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://aegistreasury.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "AEGIS — Treasury Risk Audit with AI Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AEGIS — Treasury Risk Audit with AI",
    description:
      "10 compliance rules. AI analysis. PDF reports. 30 seconds.",
    images: ["https://aegistreasury.com/og-image.png"],
    creator: "@aegistreasury",
    site: "@aegistreasury",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "AEGIS",
              url: "https://aegistreasury.com",
              logo: "https://aegistreasury.com/og-image.png",
              description:
                "Real-time treasury compliance platform for crypto. 10 institutional-grade risk rules, AI-powered analysis, 6 chains supported.",
              sameAs: [
                "https://x.com/aegistreasury",
                "https://linkedin.com/company/aegistreasury",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "AEGIS",
              url: "https://aegistreasury.com",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is crypto treasury compliance?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Crypto treasury compliance means enforcing risk policies on digital asset portfolios — such as concentration limits, stablecoin floors, and transaction caps — to ensure treasuries meet regulatory and governance standards.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How does AEGIS audit a crypto wallet?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "AEGIS reads on-chain data from any Ethereum, Solana, Base, Arbitrum, Polygon, or BSC wallet, runs it against 10 configurable compliance rules, and generates an AI-powered risk analysis with stress tests and recommendations — all in about 30 seconds.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is AEGIS free to use?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. AEGIS offers a free tier with on-demand audits, 10 compliance rules, AI risk analysis, and shareable audit links — no signup required. Paid plans start at $149/month for scheduled monitoring and advanced features.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Which blockchains does AEGIS support?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "AEGIS supports Ethereum, Solana, Base, Arbitrum, Polygon, and BSC (Binance Smart Chain) — covering the most widely used chains for treasury management.",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
