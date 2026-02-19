"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Organization, OrgMember } from "../../../components/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function OrgDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const orgId = params.id as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer">("viewer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  function authHeaders(): Record<string, string> {
    if (session?.accessToken) return { Authorization: `Bearer ${session.accessToken}` };
    return {};
  }

  async function fetchData() {
    try {
      const [orgRes, membersRes] = await Promise.all([
        fetch(`${API_URL}/orgs/${orgId}`, { headers: authHeaders() }),
        fetch(`${API_URL}/orgs/${orgId}/members`, { headers: authHeaders() }),
      ]);
      if (orgRes.ok) setOrg(await orgRes.json());
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
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
  }, [session, orgId]);

  const canManage = org?.role === "owner" || org?.role === "admin";

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviting(true);

    try {
      const res = await fetch(`${API_URL}/orgs/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to invite member" }));
        throw new Error(err.detail);
      }

      setInviteEmail("");
      setInviteRole("viewer");
      setShowInvite(false);
      await fetchData();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: number) {
    if (!confirm("Remove this member from the organization?")) return;
    setRemovingId(userId);
    try {
      await fetch(`${API_URL}/orgs/${orgId}/members/${userId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      await fetchData();
    } catch {
      // silently fail
    } finally {
      setRemovingId(null);
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

  if (!org) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-500">Organization not found.</p>
        <Link href="/dashboard/team" className="text-blue-400 text-sm mt-2 inline-block">
          Back to Team
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/team"
          className="text-xs text-gray-500 hover:text-gray-400 transition inline-flex items-center gap-1 mb-2"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          All Organizations
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{org.name}</h1>
              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${PLAN_COLORS[org.plan] || PLAN_COLORS.free}`}>
                {org.plan}
              </span>
              {org.role && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${ROLE_COLORS[org.role] || ROLE_COLORS.viewer}`}>
                  {org.role}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                         rounded-lg font-medium transition text-sm min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Invite form */}
      {showInvite && canManage && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <form onSubmit={handleInvite} className="space-y-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address (must have an AEGIS account)"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                         text-white placeholder-gray-500 text-sm min-h-[44px]
                         focus:outline-none focus:border-blue-500"
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInviteRole("viewer")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition min-h-[36px]
                  ${inviteRole === "viewer" ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400"}`}
              >
                Viewer
              </button>
              <button
                type="button"
                onClick={() => setInviteRole("admin")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition min-h-[36px]
                  ${inviteRole === "admin" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}
              >
                Admin
              </button>
            </div>
            {inviteError && <p className="text-red-400 text-xs">{inviteError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm
                           font-medium transition min-h-[40px] disabled:opacity-50"
              >
                {inviting ? "Inviting..." : "Send Invite"}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm
                           text-gray-400 transition min-h-[40px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">No members yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center
                         justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium text-white">
                    {member.name || member.email}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.viewer}`}>
                    {member.role}
                  </span>
                </div>
                {member.name && (
                  <p className="text-xs text-gray-500">{member.email}</p>
                )}
                <p className="text-[10px] text-gray-600 mt-1">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </p>
              </div>

              {canManage && member.role !== "owner" && (
                <button
                  onClick={() => handleRemove(member.user_id)}
                  disabled={removingId === member.user_id}
                  className="p-2 text-gray-500 hover:text-red-400 transition min-h-[40px] min-w-[40px]
                             flex items-center justify-center shrink-0 disabled:opacity-50"
                  title="Remove member"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
