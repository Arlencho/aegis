import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set New Password — AEGIS Treasury Compliance",
  description: "Set a new password for your AEGIS account.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/reset-password" },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
