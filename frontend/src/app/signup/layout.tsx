import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — AEGIS Treasury Compliance",
  description: "Create your free AEGIS account. Monitor crypto treasury compliance with 10 risk rules and AI-powered analysis.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/signup" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
