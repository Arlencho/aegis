"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Wallet } from "../components/types";
import { useToast } from "./components/Toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DashboardStats {
  wallet_count: number;
  audit_count: number;
  latest_risk: string | null;
  wallets: (Wallet & { client_name?: string })[];
  client_count: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!session?.accessToken) return;
      try {
        const res = await fetch(`${API_URL}/dashboard/overview`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (res.ok) {
          setStats(await res.json());
        }
      } catch {
        showToast("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [session]);

  const riskColors: Record<string, { text: string; bg: string }> = {
    low: { text: "text-green-400", bg: "bg-green-400/10" },
    medium: { text: "text-yellow-400", bg: "bg-yellow-400/10" },
    high: { text: "text-red-400", bg: "bg-red-400/10" },
  };

  const riskStyle = stats?.latest_risk
    ? riskColors[stats.latest_risk] || { text: "text-gray-400", bg: "" }
    : { text: "text-gray-600", bg: "" };

  const hasWallets = stats && stats.wallet_count > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Welcome back, {firstName}</h1>
        <p className="text-gray-400 text-sm">Your treasury monitoring dashboard</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Clients</p>
          {loading ? (
            <div className="skeleton h-8 w-12 rounded" />
          ) : (
            <p className="text-2xl font-bold">{stats?.client_count ?? 0}</p>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Wallets</p>
          {loading ? (
            <div className="skeleton h-8 w-12 rounded" />
          ) : (
            <p className="text-2xl font-bold">{stats?.wallet_count ?? 0}</p>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Audits</p>
          {loading ? (
            <div className="skeleton h-8 w-12 rounded" />
          ) : (
            <p className="text-2xl font-bold">{stats?.audit_count ?? 0}</p>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Risk Status</p>
          {loading ? (
            <div className="skeleton h-8 w-16 rounded" />
          ) : (
            <p className={`text-2xl font-bold capitalize ${riskStyle.text}`}>
              {stats?.latest_risk || "--"}
            </p>
          )}
        </div>
      </div>

      {/* Wallets overview or empty state */}
      {hasWallets ? (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300">Recent Wallets</h2>
              <Link
                href="/dashboard/wallets"
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {stats!.wallets.slice(0, 5).map((wallet) => {
                const risk = wallet.last_risk_level;
                const riskBadge = risk
                  ? riskColors[risk] || { text: "text-gray-400", bg: "bg-gray-400/10" }
                  : null;
                return (
                  <div
                    key={wallet.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center
                               justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                          ${wallet.chain === "ethereum" ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"}`}>
                          {wallet.chain === "ethereum" ? "ETH" : wallet.chain.toUpperCase().slice(0, 3)}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {wallet.label || wallet.address.slice(0, 10) + "..."}
                        </span>
                        {wallet.client_name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                            {wallet.client_name}
                          </span>
                        )}
                        {riskBadge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                            ${riskBadge.text} ${riskBadge.bg}`}>
                            {risk}
                          </span>
                        )}
                        {wallet.schedule_frequency && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 font-medium">
                            {wallet.schedule_frequency}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 font-mono mt-0.5 truncate">
                        {wallet.address}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {wallet.last_audit_at && (
                        <p className="text-[10px] text-gray-600">
                          {new Date(wallet.last_audit_at).toLocaleDateString()}
                        </p>
                      )}
                      {wallet.next_audit_at && (
                        <p className="text-[10px] text-gray-600">
                          Next: {new Date(wallet.next_audit_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/dashboard/clients"
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700
                         transition flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Add Client</p>
                <p className="text-xs text-gray-500">Create a new treasury client</p>
              </div>
            </Link>
            <Link
              href="/dashboard/history"
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700
                         transition flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">View History</p>
                <p className="text-xs text-gray-500">All past audit results</p>
              </div>
            </Link>
          </div>
        </>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-600/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Get started with AEGIS Pro</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Create a client to represent a treasury you manage, then add wallets
            to start monitoring compliance and get AI-powered risk analysis.
          </p>
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700
                       rounded-lg font-medium transition text-sm min-h-[48px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Your First Client
          </Link>
        </div>
      )}
    </div>
  );
}
