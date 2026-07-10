"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft, ScrollText, Trash2, User, Bot, Shield,
  CheckCircle, XCircle, LogIn, LogOut, FileDown, Rocket, FlaskConical,
} from "lucide-react";
import { getAuditLog, clearAuditLog, type AuditEntry } from "../lib/audit";

function iconFor(action: string) {
  const a = action.toLowerCase();
  if (a.includes("approved")) return { Icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" };
  if (a.includes("rejected")) return { Icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" };
  if (a.includes("signed in")) return { Icon: LogIn, color: "text-blue-400", bg: "bg-blue-400/10" };
  if (a.includes("signed out")) return { Icon: LogOut, color: "text-slate-400", bg: "bg-slate-400/10" };
  if (a.includes("pdf") || a.includes("report")) return { Icon: FileDown, color: "text-violet-400", bg: "bg-violet-400/10" };
  if (a.includes("demo") || a.includes("simulat")) return { Icon: FlaskConical, color: "text-amber-400", bg: "bg-amber-400/10" };
  if (a.includes("pipeline")) return { Icon: Rocket, color: "text-blue-400", bg: "bg-blue-400/10" };
  if (a.includes("security") || a.includes("scan")) return { Icon: Shield, color: "text-cyan-400", bg: "bg-cyan-400/10" };
  return { Icon: Bot, color: "text-slate-400", bg: "bg-slate-400/10" };
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  const abs = d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
  if (mins < 1) return `just now · ${abs}`;
  if (mins < 60) return `${mins}m ago · ${abs}`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago · ${abs}`;
  return abs;
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    setEntries(getAuditLog());
    const iv = setInterval(() => setEntries(getAuditLog()), 5000);
    return () => clearInterval(iv);
  }, []);

  const handleClear = () => {
    clearAuditLog();
    setEntries([]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-2">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </a>
          <h1 className="text-2xl font-bold text-slate-100">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">{entries.length} recorded action{entries.length === 1 ? "" : "s"} · stored in this browser</p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear log
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 py-16 text-center space-y-3">
          <ScrollText className="h-12 w-12 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-medium">No audit entries yet</p>
          <p className="text-slate-500 text-sm">Actions like approving fixes, running scans, and signing in will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 divide-y divide-slate-800/70">
          {entries.map((e) => {
            const { Icon, color, bg } = iconFor(e.action);
            return (
              <div key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">
                    <span className="font-semibold">{e.actor}</span>{" "}
                    <span className="text-slate-400">{e.action.toLowerCase()}</span>
                    {e.detail && <span className="font-mono text-xs text-slate-500 ml-2">{e.detail}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                  <User className="h-3 w-3" />
                  {timeLabel(e.time)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
