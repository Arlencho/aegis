"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

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
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Audits</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Risk Status</p>
          <p className="text-2xl font-bold text-gray-600">--</p>
        </div>
      </div>

      {/* Empty state CTA */}
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

      {/* Quick audit section */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick Audit</h2>
        <p className="text-xs text-gray-500 mb-3">
          Or run a quick one-time audit without saving the wallet.
        </p>
        <Link
          href="/#demo"
          className="text-blue-400 hover:text-blue-300 text-sm transition"
        >
          Go to free audit tool
        </Link>
      </div>
    </div>
  );
}
