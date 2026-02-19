"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Client, Wallet, Chain } from "../../../components/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ClientDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState<Chain>("ethereum");
  const [label, setLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [auditing, setAuditing] = useState<number | null>(null);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function authHeaders(): Record<string, string> {
    if (session?.accessToken) return { Authorization: `Bearer ${session.accessToken}` };
    return {};
  }

  async function fetchData() {
    try {
      const [clientRes, walletsRes] = await Promise.all([
        fetch(`${API_URL}/clients/${clientId}`, { headers: authHeaders() }),
        fetch(`${API_URL}/wallets?client_id=${clientId}`, { headers: authHeaders() }),
      ]);
      if (clientRes.ok) {
        const c = await clientRes.json();
        setClient(c);
        setWebhookUrl(c.webhook_url || "");
        setWebhookSecret(c.webhook_secret || "");
      }
      if (walletsRes.ok) {
        const data = await walletsRes.json();
        setWallets(data.wallets || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.accessToken) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, clientId]);

  async function handleAddWallet(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/wallets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          address,
          chain,
          label: label || undefined,
          client_id: Number(clientId),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to save wallet" }));
        throw new Error(err.detail);
      }

      setAddress("");
      setLabel("");
      setShowForm(false);
      await fetchData();
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
        headers: authHeaders(),
      });
      await fetchData();
    } catch {
      // silently fail
    }
  }

  async function handleAudit(walletId: number) {
    setAuditing(walletId);
    try {
      const res = await fetch(`${API_URL}/wallets/${walletId}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ include_ai: true }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // silently fail
    } finally {
      setAuditing(null);
    }
  }

  async function handleScheduleChange(walletId: number, frequency: string) {
    try {
      const res = await fetch(`${API_URL}/wallets/${walletId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          frequency: frequency || null,
          include_ai: false,
        }),
      });
      if (res.ok) await fetchData();
    } catch {
      // silently fail
    }
  }

  async function handleWebhookSave() {
    if (!client) return;
    setWebhookSaving(true);
    setWebhookMsg(null);
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: client.name,
          description: client.description,
          webhook_url: webhookUrl || null,
          webhook_secret: webhookSecret || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setClient(updated);
      setWebhookMsg({ ok: true, text: "Webhook settings saved." });
    } catch {
      setWebhookMsg({ ok: false, text: "Failed to save webhook settings." });
    } finally {
      setWebhookSaving(false);
    }
  }

  async function handleWebhookTest() {
    setWebhookTesting(true);
    setWebhookMsg(null);
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}/test-webhook`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Delivery failed" }));
        throw new Error(err.detail);
      }
      setWebhookMsg({ ok: true, text: "Test webhook delivered!" });
    } catch (err: unknown) {
      setWebhookMsg({ ok: false, text: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setWebhookTesting(false);
    }
  }

  const riskColors: Record<string, string> = {
    low: "text-green-400 bg-green-400/10",
    medium: "text-yellow-400 bg-yellow-400/10",
    high: "text-red-400 bg-red-400/10",
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="skeleton h-8 w-48 rounded mb-4" />
        <div className="skeleton h-4 w-64 rounded mb-8" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-500">Client not found.</p>
        <Link href="/dashboard/clients" className="text-blue-400 text-sm mt-2 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className="text-xs text-gray-500 hover:text-gray-400 transition inline-flex items-center gap-1 mb-2"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          All Clients
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {client.description && (
              <p className="text-gray-400 text-sm mt-1">{client.description}</p>
            )}
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
              placeholder="Label (optional) e.g. Hot Wallet"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                         text-white placeholder-gray-500 text-sm min-h-[44px]
                         focus:outline-none focus:border-blue-500"
            />
            {formError && <p className="text-red-400 text-xs">{formError}</p>}
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
      {wallets.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">No wallets yet. Add one to start auditing.</p>
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
                {wallet.next_audit_at && (
                  <p className="text-[10px] text-gray-600">
                    Next: {new Date(wallet.next_audit_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={wallet.schedule_frequency || ""}
                  onChange={(e) => handleScheduleChange(wallet.id, e.target.value)}
                  className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded
                             text-gray-300 min-h-[36px] focus:outline-none focus:border-blue-500"
                  title="Audit schedule"
                >
                  <option value="">Off</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button
                  onClick={() => handleAudit(wallet.id)}
                  disabled={auditing === wallet.id}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400
                             hover:bg-blue-600/30 rounded transition min-h-[36px] disabled:opacity-50"
                  title="Run audit"
                >
                  {auditing === wallet.id ? "Auditing..." : "Audit"}
                </button>
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

      {/* Webhook Settings */}
      <div className="mt-8 border border-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setWebhookOpen(!webhookOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/50
                     hover:bg-gray-900 transition text-left min-h-[48px]"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
            </svg>
            <span className="text-sm font-medium text-gray-300">Webhook Settings</span>
            {client.webhook_url && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 font-medium">
                Active
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${webhookOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {webhookOpen && (
          <div className="border-t border-gray-800 px-4 py-4 space-y-3">
            <p className="text-xs text-gray-500">
              Receive a POST request when audits detect failures or elevated risk. Works with Discord, Slack, or any HTTP endpoint.
            </p>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                           text-white placeholder-gray-500 text-sm min-h-[44px] font-mono
                           focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Signing Secret (optional)</label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Used to verify webhook authenticity"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                             text-white placeholder-gray-500 text-sm min-h-[44px] font-mono pr-10
                             focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
                >
                  {showSecret ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {webhookMsg && (
              <p className={`text-xs ${webhookMsg.ok ? "text-green-400" : "text-red-400"}`}>
                {webhookMsg.text}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleWebhookSave}
                disabled={webhookSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm
                           font-medium transition min-h-[40px] disabled:opacity-50"
              >
                {webhookSaving ? "Saving..." : "Save"}
              </button>
              {client.webhook_url && (
                <button
                  onClick={handleWebhookTest}
                  disabled={webhookTesting}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm
                             text-gray-300 transition min-h-[40px] disabled:opacity-50"
                >
                  {webhookTesting ? "Sending..." : "Test Webhook"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
