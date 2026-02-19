"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  function authHeaders(): Record<string, string> {
    if (session?.accessToken) return { Authorization: `Bearer ${session.accessToken}` };
    return {};
  }

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch(`${API_URL}/users/me`, { headers: authHeaders() })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setNameInput(data.name || "");
          setPlan(data.plan || "free");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleSaveName() {
    setSavingName(true);
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: nameInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setNameInput(data.name || "");
        setPlan(data.plan || "free");
        setEditingName(false);
      }
    } catch {
      // silently fail
    } finally {
      setSavingName(false);
    }
  }

  const planLabel = plan === "pro" ? "Pro Plan" : "Free Plan";
  const planDescription = plan === "pro"
    ? "Unlimited wallets, scheduled audits, AI analysis"
    : "1 wallet, manual audits only";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account</p>
      </div>

      {/* Profile section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Email</label>
            <p className="text-sm text-gray-300">{session?.user?.email}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Name</label>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                             text-white text-sm min-h-[40px] focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm
                             font-medium transition min-h-[40px] disabled:opacity-50"
                >
                  {savingName ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm
                             text-gray-400 transition min-h-[40px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-300">{nameInput || "Not set"}</p>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">{planLabel}</p>
            <p className="text-xs text-gray-500 mt-1">{planDescription}</p>
          </div>
          <button
            disabled
            className="px-4 py-2 bg-gray-800 text-gray-500 rounded-lg text-sm cursor-not-allowed min-h-[40px]"
          >
            Upgrade (Coming Soon)
          </button>
        </div>
      </div>

      {/* Team & Organizations */}
      <Link
        href="/dashboard/team"
        className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6 flex items-center justify-between
                   hover:border-gray-700 transition group"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-1">Team & Organizations</h2>
          <p className="text-xs text-gray-500">Manage your team members and org settings</p>
        </div>
        <svg
          className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>

      {/* Danger zone */}
      <div className="bg-gray-900 border border-red-900/30 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-red-400 mb-4">Account</h2>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30
                     rounded-lg text-sm transition min-h-[40px]"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
