"use client";

import { useState, FormEvent } from "react";
import { API_URL } from "../constants";

export default function PostAuditCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "post_audit" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        throw new Error(data.detail || "Failed");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg text-center">
        <p className="text-green-300 text-sm">{message}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-blue-900/10 border border-blue-800/30 rounded-lg text-center">
      <p className="text-sm text-gray-300 mb-3">
        Want automated monitoring with real-time alerts for this treasury?
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg
                     text-white placeholder-gray-500 text-xs
                     focus:outline-none focus:border-blue-500 min-h-[44px]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg
                     font-medium text-xs transition disabled:bg-gray-800 min-h-[44px]"
        >
          {status === "loading" ? "..." : "Notify Me"}
        </button>
      </form>
      {status === "error" && <p className="text-red-400 text-xs mt-1">{message}</p>}
    </div>
  );
}
