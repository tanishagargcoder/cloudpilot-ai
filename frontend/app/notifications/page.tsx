"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, CheckCircle, X, AlertTriangle, Cpu, Activity,
  ShieldCheck, MessageSquare, Trash2, Filter, CheckCircle2,
  ArrowLeft, ShieldAlert, CheckSquare, Square, MailOpen, Mail,
} from "lucide-react";
import { parseServerDate } from "../lib/time";

type Notification = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  time: string;
  read: boolean;
  type: string;
  created_at?: string;
};

const API_URL = "https://cloudpilot-ai-backend.onrender.com";

const LOCAL_KEY = "cloudpilot_notifications";

const severityConfig = {
  info:     { color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20",    icon: Activity    },
  warning:  { color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20",   icon: AlertTriangle},
  critical: { color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/20",     icon: AlertTriangle},
  success:  { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: CheckCircle },
};

const typeIcons: Record<string, typeof Cpu> = {
  cpu: Cpu, incident: AlertTriangle, rca: MessageSquare,
  fix: ShieldCheck, approval: ShieldAlert, system: Activity,
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow-sm backdrop-blur-sm ${className}`}>{children}</div>;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter]               = useState<"all" | "unread" | "read">("all");
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [loading, setLoading]             = useState(true);

  // ── Fetch from API + localStorage merge ──────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/notifications`);
      const data = await res.json();
      const apiNotifs: Notification[] = Array.isArray(data) ? data : [];

      // Merge with localStorage (local ones might have read status)
      const localRaw = localStorage.getItem(LOCAL_KEY);
      const localNotifs: Notification[] = localRaw ? JSON.parse(localRaw) : [];
      const localMap = new Map(localNotifs.map((n) => [n.id, n]));

      const merged = apiNotifs.map((n) => ({
        ...n,
        read: localMap.get(n.id)?.read ?? n.read,
      }));

      // Add any local-only (not yet in API)
      const apiIds = new Set(apiNotifs.map((n) => n.id));
      const localOnly = localNotifs.filter((n) => !apiIds.has(n.id));

      const all = [...merged, ...localOnly].sort((a, b) => {
        const ta = a.created_at ? parseServerDate(a.created_at).getTime() : 0;
        const tb = b.created_at ? parseServerDate(b.created_at).getTime() : 0;
        return tb - ta;
      });

      setNotifications(all);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch {
      // fallback localStorage only
      const localRaw = localStorage.getItem(LOCAL_KEY);
      if (localRaw) { try { setNotifications(JSON.parse(localRaw)); } catch { setNotifications([]); } }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    window.addEventListener("storage", load);
    return () => { clearInterval(iv); window.removeEventListener("storage", load); };
  }, [load]);

  // ── Update helpers ────────────────────────────────────────────────────────────
  const save = (updated: Notification[]) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
    setNotifications(updated);
  };

  const markOneRead = async (id: string) => {
    try { await fetch(`${API_URL}/notifications/${id}/read`, { method: "POST" }); } catch {}
    save(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    try { await fetch(`${API_URL}/notifications/read-all`, { method: "POST" }); } catch {}
    save(notifications.map((n) => ({ ...n, read: true })));
    setSelectedIds(new Set());
  };

  const markSelectedRead = () => {
    save(notifications.map((n) => selectedIds.has(n.id) ? { ...n, read: true } : n));
    setSelectedIds(new Set());
  };

  const markSelectedUnread = () => {
    save(notifications.map((n) => selectedIds.has(n.id) ? { ...n, read: false } : n));
    setSelectedIds(new Set());
  };

  const deleteOne = (id: string) => {
    save(notifications.filter((n) => n.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const deleteSelected = () => {
    save(notifications.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
  };

  const deleteAll = () => { save([]); setSelectedIds(new Set()); };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read")   return n.read;
    return true;
  });

  const unreadCount   = notifications.filter((n) => !n.read).length;
  const readCount     = notifications.filter((n) => n.read).length;
  const selectedCount = selectedIds.size;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-2">
          <ArrowLeft className="h-4 w-4" />Dashboard
        </a>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Notifications</h1>
        <p className="text-sm text-slate-500 mt-1">{unreadCount} unread · {readCount} read · {notifications.length} total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          {(["all", "unread", "read"] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setSelectedIds(new Set()); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"}`}>
              {f === "all" ? `All (${notifications.length})` : f === "unread" ? `Unread (${unreadCount})` : `Read (${readCount})`}
            </button>
          ))}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{selectedCount} selected</span>
            <button onClick={markSelectedRead} className="flex items-center gap-1 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600/30 transition-colors border border-emerald-600/20">
              <MailOpen className="h-3 w-3" /> Mark read
            </button>
            <button onClick={markSelectedUnread} className="flex items-center gap-1 rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-600/30 transition-colors border border-amber-600/20">
              <Mail className="h-3 w-3" /> Mark unread
            </button>
            <button onClick={deleteSelected} className="flex items-center gap-1 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-600/30 transition-colors border border-red-600/20">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Select All + Global Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedIds(new Set(filtered.map((n) => n.id)))} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Select all</button>
          {selectedCount > 0 && <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Deselect</button>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAllRead} className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <CheckCircle2 className="h-3 w-3" /> Mark all read
          </button>
          <button onClick={deleteAll} className="flex items-center gap-1 rounded-lg border border-red-800/30 bg-red-900/20 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
            <Trash2 className="h-3 w-3" /> Clear all
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading && (
          <Card><div className="py-12 text-center animate-pulse text-slate-500 text-sm">Loading from database...</div></Card>
        )}
        {!loading && filtered.length === 0 && (
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

        {!loading && filtered.map((notif) => {
          const sev = severityConfig[notif.severity] || severityConfig.info;
          const TypeIcon = typeIcons[notif.type] || Activity;
          const isSelected = selectedIds.has(notif.id);
          return (
            <Card key={notif.id} className={`group transition-all ${!notif.read ? "border-slate-700/60 bg-slate-900/70" : "opacity-75"} ${isSelected ? "ring-2 ring-blue-500/30 border-blue-500/30" : ""}`}>
              <div className="flex items-start gap-3 p-4">
                <button onClick={() => toggleSelect(notif.id)} className="mt-1 shrink-0 text-slate-500 hover:text-blue-400 transition-colors">
                  {isSelected ? <CheckSquare className="h-4 w-4 text-blue-400" /> : <Square className="h-4 w-4" />}
                </button>
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${sev.bg} border ${sev.border}`}>
                  <TypeIcon className={`h-4 w-4 ${sev.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-semibold ${!notif.read ? "text-slate-200" : "text-slate-400"}`}>{notif.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-600 mr-1">
                        {notif.created_at
                          ? parseServerDate(notif.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })
                          : notif.time}
                      </span>
                      {!notif.read && (
                        <button onClick={() => markOneRead(notif.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors" title="Mark as read">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteOne(notif.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {!notif.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500 animate-pulse" />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}