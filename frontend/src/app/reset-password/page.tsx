"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="p-4 bg-red-900/40 border border-red-800 rounded-lg">
        <p className="text-red-300 text-sm">
          Invalid reset link. Please request a new one from the{" "}
          <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 underline">
            forgot password
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(data.detail || "Something went wrong");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="p-4 bg-green-900/40 border border-green-800 rounded-lg">
        <p className="text-green-300 text-sm mb-3">
          Password updated successfully!
        </p>
        <Link
          href="/login"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg
                     text-sm font-medium transition min-h-[44px] leading-[44px]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          New Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg
                     text-white placeholder-gray-500
                     focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     text-sm min-h-[48px]"
          required
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1">
          Confirm Password
        </label>
        <input
          id="confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat your password"
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
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image src="/logo-banner.png" alt="AEGIS" width={240} height={100} className="h-16 w-auto mx-auto" />
          </Link>
          <p className="text-gray-400 text-sm mt-3">Set a new password</p>
        </div>

        <Suspense fallback={<div className="text-gray-500 text-sm text-center">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="text-center text-sm text-gray-600 mt-6">
          <Link href="/" className="hover:text-gray-400 transition">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
