import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password — AEGIS Treasury Compliance",
  description: "Reset your AEGIS account password.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/forgot-password" },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
