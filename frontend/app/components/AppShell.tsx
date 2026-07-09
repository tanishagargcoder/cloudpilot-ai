"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { AIChatbot } from "./AIChatbot";
import { KeepAlive } from "./KeepAlive";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isLogin) return;
    // Demo-grade auth: session lives in localStorage
    const user = localStorage.getItem("cloudpilot_user");
    if (!user) window.location.replace("/login");
    else setAuthed(true);
  }, [pathname, isLogin]);

  // Login page renders full-screen without the app shell
  if (isLogin) return <>{children}</>;

  // Splash while the session check runs (avoids flashing protected content)
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-600/30 animate-pulse">
            <Cloud className="h-6 w-6 text-white" />
          </div>
          <p className="text-xs text-slate-600">Loading CloudPilot AI...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <KeepAlive />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 max-lg:pt-20">
            {children}
          </main>
        </div>
      </div>
      <AIChatbot />
    </>
  );
}
