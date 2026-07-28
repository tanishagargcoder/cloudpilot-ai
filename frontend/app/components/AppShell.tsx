"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AIChatbot } from "./AIChatbot";
import { KeepAlive } from "./KeepAlive";
import { CommandPalette } from "./CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Landing and login render full-screen, without the dashboard shell
  const isPublic = pathname === "/" || pathname === "/login" || pathname === "/welcome";
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isPublic) return;
    // Demo-grade auth: session lives in localStorage
    const user = localStorage.getItem("cloudpilot_user");
    if (!user) window.location.replace("/login");
    else setAuthed(true);
  }, [pathname, isPublic]);

  if (isPublic) return <>{children}</>;

  // Splash while the session check runs (avoids flashing protected content).
  // Echoes the landing's wave rather than showing a logo.
  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="flex items-end gap-1.5 h-16">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-emerald-700/40 to-emerald-300 wave-bar"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          ))}
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
      <CommandPalette />
    </>
  );
}
