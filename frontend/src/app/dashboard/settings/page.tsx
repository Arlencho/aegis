"use client";

import { useSession, signOut } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();

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
            <p className="text-sm text-gray-300">{session?.user?.name || "Not set"}</p>
          </div>
        </div>
      </div>

      {/* Plan section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">Free Plan</p>
            <p className="text-xs text-gray-500 mt-1">1 wallet, manual audits only</p>
          </div>
          <button
            disabled
            className="px-4 py-2 bg-gray-800 text-gray-500 rounded-lg text-sm cursor-not-allowed min-h-[40px]"
          >
            Upgrade (Coming Soon)
          </button>
        </div>
      </div>

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
