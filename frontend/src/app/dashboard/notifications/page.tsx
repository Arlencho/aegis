"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Notification } from "../../components/types";
import { useToast } from "../components/Toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SEVERITY_STYLES: Record<string, { dot: string; label: string }> = {
  critical: { dot: "bg-red-400", label: "text-red-400 bg-red-400/10" },
  warning: { dot: "bg-yellow-400", label: "text-yellow-400 bg-yellow-400/10" },
  info: { dot: "bg-blue-400", label: "text-blue-400 bg-blue-400/10" },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function authHeaders(): Record<string, string> {
    if (session?.accessToken) return { Authorization: `Bearer ${session.accessToken}` };
    return {};
  }

  async function fetchNotifications() {
    try {
      const res = await fetch(`${API_URL}/notifications?limit=100`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      showToast("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.accessToken) fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleMarkAllRead() {
    try {
      await fetch(`${API_URL}/notifications/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      showToast("Failed to mark notifications as read");
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await fetch(`${API_URL}/notifications/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ notification_ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      showToast("Failed to mark notification as read");
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-gray-400 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-600/10
                       hover:bg-blue-600/20 rounded-lg transition min-h-[40px]"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No notifications yet.</p>
          <p className="text-gray-600 text-xs mt-1">
            Notifications appear when audits find rule violations or risk changes.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const style = SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.info;
            return (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) handleMarkRead(n.id);
                  if (n.audit_id) router.push(`/dashboard/audits/${n.audit_id}`);
                }}
                className={`bg-gray-900 border border-gray-800 rounded-lg p-4 transition
                  ${n.audit_id || !n.is_read ? "cursor-pointer hover:border-gray-700" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-medium ${!n.is_read ? "text-white" : "text-gray-400"}`}>
                        {n.title}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${style.label}`}>
                        {n.severity}
                      </span>
                      {!n.is_read && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 font-medium">
                          new
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{n.body}</p>
                    <p className="text-[10px] text-gray-600 mt-2">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
