"use client";

import { useState, useEffect, FormEvent } from "react";
import { API_URL } from "../constants";

export default function CTAFooter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/waitlist/count`)
      .then((r) => r.json())
      .then((d) => setWaitlistCount(d.count))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "cta_footer" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
        if (data.is_new && waitlistCount !== null) setWaitlistCount(waitlistCount + 1);
      } else {
        throw new Error(data.detail || "Failed");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 md:px-12 bg-gray-950/50">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Ready for continuous monitoring?
        </h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          AEGIS Pro gives you scheduled audits, real-time alerts, PDF reports,
          and audit history — starting at $149/mo. Join the waitlist for early
          access and priority onboarding.
        </p>

        {waitlistCount !== null && waitlistCount > 0 && (
          <p className="text-xs text-gray-500 mb-4">
            <span className="text-blue-400 font-semibold">{waitlistCount}</span> teams already on the waitlist
          </p>
        )}

        {status === "success" ? (
          <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg max-w-md mx-auto">
            <p className="text-green-300 text-sm">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg
                         text-white placeholder-gray-500 text-sm
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                         min-h-[48px]"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700
                         disabled:bg-gray-800 disabled:text-gray-500
                         rounded-lg font-semibold transition text-sm
                         shadow-lg shadow-blue-600/20 min-h-[48px]"
            >
              {status === "loading" ? "Joining..." : "Get Early Access"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-red-400 text-xs mt-2">{message}</p>
        )}

        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="https://x.com/aegistreasury"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-400 transition"
            aria-label="AEGIS on X"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://linkedin.com/company/aegistreasury"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-400 transition"
            aria-label="AEGIS on LinkedIn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
        <p className="mt-4 text-xs text-gray-600">
          Built by Arlen Rios
        </p>
      </div>
    </section>
  );
}
