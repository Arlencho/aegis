"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PlanBadge() {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPlan(data.plan || "free");
      })
      .catch(() => {});
  }, [session?.accessToken]);

  if (!plan) return null;

  const label = plan === "pro" ? "Pro" : "Free Plan";
  const style =
    plan === "pro"
      ? "bg-purple-600/20 text-purple-400"
      : "bg-gray-800 text-gray-400";

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${style}`}>
      {label}
    </span>
  );
}
