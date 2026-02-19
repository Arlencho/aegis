"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Wallet } from "../components/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DashboardStats {
  wallet_count: number;
  audit_count: number;
  latest_risk: string | null;
  wallets: Wallet[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
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
        // silently fail
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Saved Wallets</p>
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
              <h2 className="text-sm font-semibold text-gray-300">Your Wallets</h2>
              <Link
                href="/dashboard/wallets"
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Manage all
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
                          {wallet.chain === "ethereum" ? "ETH" : "SOL"}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {wallet.label || wallet.address.slice(0, 10) + "..."}
                        </span>
                        {riskBadge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                            ${riskBadge.text} ${riskBadge.bg}`}>
                            {risk}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 font-mono mt-0.5 truncate">
                        {wallet.address}
                      </p>
                    </div>
                    {wallet.last_audit_at && (
                      <span className="text-[10px] text-gray-600 shrink-0">
                        {new Date(wallet.last_audit_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/dashboard/wallets"
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700
                         transition flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Add Wallet</p>
                <p className="text-xs text-gray-500">Monitor another address</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Add your first wallet</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Save an Ethereum or Solana wallet to start monitoring its compliance
            and get AI-powered risk analysis.
          </p>
          <Link
            href="/dashboard/wallets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700
                       rounded-lg font-medium transition text-sm min-h-[48px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Wallet
          </Link>
        </div>
      )}
    </div>
  );
}
