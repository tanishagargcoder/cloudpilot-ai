"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  ShieldAlert,
  BarChart3,
  Cloud,
  Bell,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Incidents", href: "/incidents", icon: FileText },
  { label: "Approvals", href: "/approvals", icon: ShieldAlert },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    const update = () => {
      // Pending approvals count
      try {
        const incidents = JSON.parse(localStorage.getItem("cloudpilot_incidents") || "[]");
        setPendingApprovals(incidents.filter((i: any) => i.status === "needs_approval").length);
      } catch { setPendingApprovals(0); }

      // Unread notifications count
      try {
        const notifs = JSON.parse(localStorage.getItem("cloudpilot_notifications") || "[]");
        setUnreadNotifs(notifs.filter((n: any) => !n.read).length);
      } catch { setUnreadNotifs(0); }
    };

    update();
    const interval = setInterval(update, 2000);
    window.addEventListener("storage", update);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", update);
    };
  }, []);

  const getBadge = (href: string) => {
    if (href === "/approvals" && pendingApprovals > 0) return pendingApprovals;
    return null;
  };

  return (
    <aside className="w-56 border-r border-slate-800 bg-slate-950 min-h-screen flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shrink-0">
          <Cloud className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-semibold text-slate-100 text-sm leading-none">CloudPilot AI</span>
          <p className="text-[10px] text-slate-500 mt-0.5">DevOps Assistant</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider px-3 py-2">Navigation</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const badge = getBadge(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
              <span className="flex-1">{item.label}</span>
              {badge !== null && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400/15 px-1.5 text-[10px] font-semibold text-amber-400 border border-amber-400/20">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4">
          <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider px-3 py-2">System</p>
          <Link
            href="/notifications"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              pathname === "/notifications"
                ? "bg-blue-600/15 text-blue-400 border border-blue-600/20"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Bell className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="flex-1">Notifications</span>
            {unreadNotifs > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/15 px-1.5 text-[10px] font-semibold text-red-400 border border-red-400/20">
                {unreadNotifs}
              </span>
            )}
          </Link>
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              pathname === "/settings"
                ? "bg-blue-600/15 text-blue-400 border border-blue-600/20"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="flex-1">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          System Online
        </div>
        <div className="text-[10px] text-slate-600">v1.0.0 · CloudPilot AI</div>
      </div>
    </aside>
  );
}