import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "./components/Sidebar";
import NotificationBell from "./components/NotificationBell";
import { ToastProvider } from "./components/Toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-950">
        <Sidebar userName={session.user.name || session.user.email} />

        {/* Main content area */}
        <div className="md:ml-56">
          {/* Top bar */}
          <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="md:hidden">
                <span className="text-lg font-bold tracking-tight">
                  AEGIS <span className="text-xs font-normal text-blue-400 ml-1">Pro</span>
                </span>
              </div>
              <div className="hidden md:block" />
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                  Free Plan
                </span>
                <NotificationBell />
                <span className="text-sm text-gray-400 hidden sm:inline">
                  {session.user.email}
                </span>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 sm:p-6 pb-24 md:pb-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
