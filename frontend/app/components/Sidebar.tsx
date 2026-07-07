"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, FileText, ShieldAlert,
  BarChart3, Cloud, Bell, Settings, Server,
} from "lucide-react";

const API_URL = "https://cloudpilot-ai-backend.onrender.com";

const navItems = [
  { label: "Dashboard",  href: "/",          icon: LayoutDashboard },
  { label: "Incidents",  href: "/incidents",  icon: FileText        },
  { label: "Approvals",  href: "/approvals",  icon: ShieldAlert     },
  { label: "Analytics",  href: "/analytics",  icon: BarChart3       },
  { label: "Services",   href: "/services",   icon: Server          },
];
const systemItems = [
  { label: "Notifications", href: "/notifications", icon: Bell     },
  { label: "Settings",      href: "/settings",      icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [unreadNotifs, setUnreadNotifs]         = useState(0);

  useEffect(() => {
    const fetchPending = () => {
      fetch(`${API_URL}/incidents`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const count = data.filter((i: any) => i.status === "needs_approval").length;
            setPendingApprovals(count);
          }
        })
        .catch(() => {
          try {
            const incidents = JSON.parse(localStorage.getItem("cloudpilot_incidents") || "[]");
            setPendingApprovals(incidents.filter((i: any) => i.status === "needs_approval").length);
          } catch { setPendingApprovals(0); }
        });
    };

    const fetchNotifs = () => {
      try {
        const notifs = JSON.parse(localStorage.getItem("cloudpilot_notifications") || "[]");
        setUnreadNotifs(notifs.filter((n: any) => !n.read).length);
      } catch { setUnreadNotifs(0); }
    };

    fetchPending();
    fetchNotifs();

    // Refresh every 5 seconds
    const iv = setInterval(() => { fetchPending(); fetchNotifs(); }, 5000);
    window.addEventListener("storage", fetchNotifs);
    return () => { clearInterval(iv); window.removeEventListener("storage", fetchNotifs); };
  }, []);

  const getBadge = (href: string) => {
    if (href === "/approvals"     && pendingApprovals > 0) return pendingApprovals;
    if (href === "/notifications" && unreadNotifs > 0)     return unreadNotifs;
    return null;
  };

  const badgeStyle = (href: string) => {
    if (href === "/approvals")     return "bg-amber-400/15 text-amber-400 border border-amber-400/20";
    if (href === "/notifications") return "bg-red-500/15 text-red-400 border border-red-400/20";
    return "bg-blue-400/15 text-blue-400 border border-blue-400/20";
  };

  const renderLink = (item: { href: string; label: string; icon: typeof Bell }) => {
    const isActive = pathname === item.href;
    const Icon     = item.icon;
    const badge    = getBadge(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-gradient-to-r from-blue-600/20 to-violet-600/10 text-blue-300 border border-blue-500/25 shadow-[0_0_12px_-3px_rgba(59,130,246,0.35)]"
            : "text-slate-400 hover:bg-slate-900 hover:text-slate-200 hover:translate-x-0.5 border border-transparent"
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-gradient-to-b from-blue-400 to-violet-500" />
        )}
        <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} />
        <span className="flex-1">{item.label}</span>
        {badge !== null && (
          <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${badgeStyle(item.href)}`}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="w-56 border-r border-slate-800 bg-slate-950 min-h-screen flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-violet-600/10 pointer-events-none" />
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-600/30 shrink-0">
          <Cloud className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="relative">
          <span className="font-bold text-sm leading-none bg-gradient-to-r from-blue-300 via-slate-100 to-violet-300 bg-clip-text text-transparent">
            CloudPilot AI
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">DevOps Assistant</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider px-3 py-2">Navigation</p>
        {navItems.map(renderLink)}
        <div className="pt-4">
          <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider px-3 py-2">System</p>
          {systemItems.map(renderLink)}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400/90">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          System Online
        </div>
        <div className="text-[10px] text-slate-600 px-1">v1.0.0 · CloudPilot AI</div>
      </div>
    </aside>
  );
}