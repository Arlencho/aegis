"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SocialProofSection() {
  const [stats, setStats] = useState<{ waitlist_count: number; audit_count: number } | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/stats/public`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  if (!stats || (stats.waitlist_count === 0 && stats.audit_count === 0)) return null;

  return (
    <section className="py-10 px-4 sm:px-6 md:px-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-8 md:gap-12">
          {stats.audit_count > 0 && (
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.audit_count.toLocaleString()}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Audits Completed</p>
            </div>
          )}
          {stats.audit_count > 0 && stats.waitlist_count > 0 && (
            <div className="w-px h-10 bg-gray-800" />
          )}
          {stats.waitlist_count > 0 && (
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.waitlist_count.toLocaleString()}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Teams on Waitlist</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
