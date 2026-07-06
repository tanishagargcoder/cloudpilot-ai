"use client";

import { useState, useEffect, useCallback } from "react";
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
  ArrowLeft,
  ShieldAlert,
  CheckSquare,
  Square,
  MailOpen,
  Mail,
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

const STORAGE_KEY = "cloudpilot_notifications";

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
  approval: ShieldAlert,
  system: Activity,
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow-sm backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

// Save to localStorage directly — single source of truth
function saveNotifications(notifs: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
  } catch {}
}

// Read from localStorage
function readNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load + poll every 1s
  const load = useCallback(() => {
    setNotifications(readNotifications());
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 1000);
    window.addEventListener("storage", load);
    window.addEventListener("notifications-updated", load);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", load);
      window.removeEventListener("notifications-updated", load);
    };
  }, [load]);

  // ── Helpers that update state AND localStorage together ──────────────────
  const update = (updated: Notification[]) => {
    saveNotifications(updated);
    setNotifications(updated);
  };

  const markOneRead = (id: string) => {
    const updated = notifications.map((n) => n.id === id ? { ...n, read: true } : n);
    update(updated);
  };

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    update(updated);
    setSelectedIds(new Set());
  };

  const markSelectedRead = () => {
    const updated = notifications.map((n) => selectedIds.has(n.id) ? { ...n, read: true } : n);
    update(updated);
    setSelectedIds(new Set());
  };

  const markSelectedUnread = () => {
    const updated = notifications.map((n) => selectedIds.has(n.id) ? { ...n, read: false } : n);
    update(updated);
    setSelectedIds(new Set());
  };

  const deleteOne = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    update(updated);
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const deleteSelected = () => {
    const updated = notifications.filter((n) => !selectedIds.has(n.id));
    update(updated);
    setSelectedIds(new Set());
  };

  const deleteAll = () => {
    update([]);
    setSelectedIds(new Set());
  };

  // ── Selection helpers ────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((n) => n.id)));
  const deselectAll = () => setSelectedIds(new Set());

  // ── Derived ──────────────────────────────────────────────────────────────
  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;
  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </a>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount} unread · {readCount} read · {notifications.length} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          {(["all", "unread", "read"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelectedIds(new Set()); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {f === "all" ? `All (${notifications.length})` : f === "unread" ? `Unread (${unreadCount})` : `Read (${readCount})`}
            </button>
          ))}
        </div>

        {/* Bulk actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{selectedCount} selected</span>
            <button
              onClick={markSelectedRead}
              className="flex items-center gap-1 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600/30 transition-colors border border-emerald-600/20"
            >
              <MailOpen className="h-3 w-3" /> Mark read
            </button>
            <button
              onClick={markSelectedUnread}
              className="flex items-center gap-1 rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-600/30 transition-colors border border-amber-600/20"
            >
              <Mail className="h-3 w-3" /> Mark unread
            </button>
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-600/30 transition-colors border border-red-600/20"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Select All + Global Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={selectAll} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            Select all
          </button>
          {selectedCount > 0 && (
            <button onClick={deselectAll} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
              Deselect
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" /> Mark all read
          </button>
          <button
            onClick={deleteAll}
            className="flex items-center gap-1 rounded-lg border border-red-800/30 bg-red-900/20 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-3 w-3" /> Clear all
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card>
            <div className="py-16 text-center space-y-3">
              <Bell className="h-12 w-12 text-slate-700 mx-auto" />
              <p className="text-slate-500 font-medium">No notifications</p>
              <p className="text-slate-600 text-sm">
                {filter === "unread" ? "All caught up!" : filter === "read" ? "No read notifications." : "Run the agent pipeline to generate notifications."}
              </p>
            </div>
          </Card>
        )}

        {filtered.map((notif) => {
          const sev = severityConfig[notif.severity] || severityConfig.info;
          const TypeIcon = typeIcons[notif.type] || Activity;
          const isSelected = selectedIds.has(notif.id);

          return (
            <Card
              key={notif.id}
              className={`group transition-all ${
                !notif.read ? "border-slate-700/60 bg-slate-900/70" : "opacity-75"
              } ${isSelected ? "ring-2 ring-blue-500/30 border-blue-500/30" : ""}`}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(notif.id)}
                  className="mt-1 shrink-0 text-slate-500 hover:text-blue-400 transition-colors"
                >
                  {isSelected
                    ? <CheckSquare className="h-4 w-4 text-blue-400" />
                    : <Square className="h-4 w-4" />}
                </button>

                {/* Severity icon */}
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${sev.bg} border ${sev.border}`}>
                  <TypeIcon className={`h-4 w-4 ${sev.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-semibold ${!notif.read ? "text-slate-200" : "text-slate-400"}`}>
                        {notif.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-600 mr-1">{notif.time}</span>

                      {/* Mark as read button */}
                      {!notif.read && (
                        <button
                          onClick={() => markOneRead(notif.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => deleteOne(notif.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unread dot */}
                {!notif.read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500 animate-pulse" />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}