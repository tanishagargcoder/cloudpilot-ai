"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle,
  X,
  AlertTriangle,
  Cpu,
  Activity,
  ShieldCheck,
  MessageSquare,
  Trash2,
  Filter,
  CheckCircle2,
} from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  time: string;
  read: boolean;
  type: string;
};

const severityConfig = {
  info: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", icon: Activity },
  warning: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: AlertTriangle },
  critical: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", icon: AlertTriangle },
  success: { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: CheckCircle },
};

const typeIcons: Record<string, typeof Cpu> = {
  cpu: Cpu,
  incident: AlertTriangle,
  rca: MessageSquare,
  fix: ShieldCheck,
  approval: Bell,
  system: Activity,
};

const STORAGE_KEY = "cloudpilot_notifications";

function getInitialNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [
    {
      id: "notif-1",
      title: "CPU Spike Detected",
      message: "CPU usage exceeded 85% threshold on instance i-0a1b2c3d",
      severity: "warning",
      time: "2 min ago",
      read: false,
      type: "cpu",
    },
    {
      id: "notif-2",
      title: "New Incident Created",
      message: "Incident INC-2024-006 triggered by anomaly detector",
      severity: "critical",
      time: "15 min ago",
      read: false,
      type: "incident",
    },
    {
      id: "notif-3",
      title: "RCA Generated",
      message: "Root cause analysis completed for auth-service latency",
      severity: "info",
      time: "32 min ago",
      read: true,
      type: "rca",
    },
    {
      id: "notif-4",
      title: "Approval Required",
      message: "Fix plan for INC-2024-005 requires manual approval",
      severity: "warning",
      time: "1 hr ago",
      read: false,
      type: "approval",
    },
    {
      id: "notif-5",
      title: "Fix Deployed",
      message: "Auto-remediation completed for payment-gateway",
      severity: "success",
      time: "2 hr ago",
      read: true,
      type: "fix",
    },
  ];
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow-sm backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    setNotifications(getInitialNotifications());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotif = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount} unread · {notifications.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Mark all read
          </button>
          <button
            onClick={clearAll}
            className="rounded-lg border border-red-800/30 bg-red-900/20 px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card>
            <div className="py-12 text-center">
              <Bell className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No notifications</p>
            </div>
          </Card>
        )}

        {filtered.map((notif) => {
          const sev = severityConfig[notif.severity];
          const TypeIcon = typeIcons[notif.type] || Activity;
          return (
            <Card
              key={notif.id}
              className={`group transition-colors ${!notif.read ? "border-slate-700/60 bg-slate-900/60" : ""}`}
            >
              <div className="flex items-start gap-4 p-4">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${sev.bg} ${sev.border} border`}>
                  <TypeIcon className={`h-4 w-4 ${sev.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm font-semibold ${!notif.read ? "text-slate-200" : "text-slate-400"}`}>
                      {notif.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">{notif.time}</span>
                      {!notif.read && (
                        <button
                          onClick={() => markRead(notif.id)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Mark as read"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotif(notif.id)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                </div>
                {!notif.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}