"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Organization } from "../../components/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TeamPage() {
  const { data: session } = useSession();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function authHeaders(): Record<string, string> {
    if (session?.accessToken) return { Authorization: `Bearer ${session.accessToken}` };
    return {};
  }

  async function fetchOrgs() {
    try {
      const res = await fetch(`${API_URL}/orgs`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.organizations || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.accessToken) fetchOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/orgs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to create organization" }));
        throw new Error(err.detail);
      }

      setName("");
      setShowForm(false);
      await fetchOrgs();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setSaving(false);
    }
  }

  const ROLE_COLORS: Record<string, string> = {
    owner: "text-yellow-400 bg-yellow-400/10",
    admin: "text-blue-400 bg-blue-400/10",
    viewer: "text-gray-400 bg-gray-400/10",
  };

  const PLAN_COLORS: Record<string, string> = {
    pro: "text-purple-400 bg-purple-400/10",
    free: "text-gray-400 bg-gray-400/10",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your organizations and team members
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                     rounded-lg font-medium transition text-sm min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Organization
        </button>
      </div>

      {/* Create org form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name (e.g. Acme Treasury, Protocol X Team)"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                         text-white placeholder-gray-500 text-sm min-h-[44px]
                         focus:outline-none focus:border-blue-500"
              required
            />
            {formError && <p className="text-red-400 text-xs">{formError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm
                           font-medium transition min-h-[40px] disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Organization"}
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

      {/* Org list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-lg" />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-600/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Create one to collaborate with your team. Organizations let you share wallets
            and audit history with team members.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700
                       rounded-lg font-medium transition text-sm min-h-[48px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Organization
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/dashboard/team/${org.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-lg p-4
                         hover:border-gray-700 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-white">{org.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${PLAN_COLORS[org.plan] || PLAN_COLORS.free}`}>
                      {org.plan}
                    </span>
                    {org.role && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${ROLE_COLORS[org.role] || ROLE_COLORS.viewer}`}>
                        {org.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Created {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0 p-2 text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
