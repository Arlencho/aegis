"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(data.detail || "Something went wrong");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image src="/logo-banner.png" alt="AEGIS" width={240} height={100} className="h-16 w-auto mx-auto" />
          </Link>
          <p className="text-gray-400 text-sm mt-3">Reset your password</p>
        </div>

        {sent ? (
          <div className="p-4 bg-green-900/40 border border-green-800 rounded-lg">
            <p className="text-green-300 text-sm">
              If that email is registered, we sent a reset link. Check your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg
                           text-white placeholder-gray-500
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                           text-sm min-h-[48px]"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/40 border border-red-800 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700
                         disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
                         rounded-lg font-medium transition text-sm min-h-[48px]"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition">
            Sign in
          </Link>
        </p>

        <p className="text-center text-sm text-gray-600 mt-4">
          <Link href="/" className="hover:text-gray-400 transition">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
