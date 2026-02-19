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
          Want continuous monitoring?
        </h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          We&apos;re building AEGIS Pro — automated policy enforcement for DAO
          treasuries with real-time alerts, scheduled audits, and multi-chain
          support.
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

        <p className="mt-10 text-xs text-gray-600">
          Built by Arlen Rios
        </p>
      </div>
    </section>
  );
}
