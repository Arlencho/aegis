import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In — AEGIS Treasury Compliance",
  description: "Log in to your AEGIS account to manage wallets, run audits, and monitor treasury compliance.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
