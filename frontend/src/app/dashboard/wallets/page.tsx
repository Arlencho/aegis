"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import type { Wallet, Chain } from "../../components/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function WalletsPage() {
  const { data: session } = useSession();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState<Chain>("ethereum");
  const [label, setLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchWallets() {
    try {
      const res = await fetch(`${API_URL}/wallets`, {
        headers: session?.accessToken
          ? { Authorization: `Bearer ${session.accessToken}` }
          : {},
      });
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleAddWallet(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/wallets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {}),
        },
        body: JSON.stringify({ address, chain, label: label || undefined }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to save wallet" }));
        throw new Error(err.detail);
      }

      setAddress("");
      setLabel("");
      setShowForm(false);
      await fetchWallets();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save wallet");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(walletId: number) {
    if (!confirm("Remove this wallet?")) return;
    try {
      await fetch(`${API_URL}/wallets/${walletId}`, {
        method: "DELETE",
        headers: session?.accessToken
          ? { Authorization: `Bearer ${session.accessToken}` }
          : {},
      });
      await fetchWallets();
    } catch {
      // silently fail
    }
  }

  const riskColors: Record<string, string> = {
    low: "text-green-400 bg-green-400/10",
    medium: "text-yellow-400 bg-yellow-400/10",
    high: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Wallets</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your monitored wallets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                     rounded-lg font-medium transition text-sm min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Wallet
        </button>
      </div>

      {/* Add wallet form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <form onSubmit={handleAddWallet} className="space-y-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setChain("ethereum")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition min-h-[36px]
                  ${chain === "ethereum" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}
              >
                Ethereum
              </button>
              <button
                type="button"
                onClick={() => setChain("solana")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition min-h-[36px]
                  ${chain === "solana" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"}`}
              >
                Solana
              </button>
            </div>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={chain === "ethereum" ? "0x..." : "Base58 address..."}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                         text-white placeholder-gray-500 font-mono text-sm min-h-[44px]
                         focus:outline-none focus:border-blue-500"
              required
            />

            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional) e.g. Main Treasury"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                         text-white placeholder-gray-500 text-sm min-h-[44px]
                         focus:outline-none focus:border-blue-500"
            />

            {formError && (
              <p className="text-red-400 text-xs">{formError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm
                           font-medium transition min-h-[40px] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Wallet"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm
                           text-gray-400 transition min-h-[40px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Wallet list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">No wallets saved yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center
                         justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                    ${wallet.chain === "ethereum" ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"}`}>
                    {wallet.chain}
                  </span>
                  {wallet.label && (
                    <span className="text-sm font-medium text-white">{wallet.label}</span>
                  )}
                  {wallet.last_risk_level && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                      ${riskColors[wallet.last_risk_level] || "text-gray-400 bg-gray-400/10"}`}>
                      {wallet.last_risk_level}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono truncate">{wallet.address}</p>
                {wallet.last_audit_at && (
                  <p className="text-[10px] text-gray-600 mt-1">
                    Last audit: {new Date(wallet.last_audit_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDelete(wallet.id)}
                  className="p-2 text-gray-500 hover:text-red-400 transition min-h-[40px] min-w-[40px]
                             flex items-center justify-center"
                  title="Remove wallet"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
