"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, CheckCircle, XCircle, Clock,
  ChevronLeft, ShieldAlert, ShieldCheck, ShieldX,
} from "lucide-react";

type IncidentStatus = "healthy" | "needs_approval" | "approved" | "rejected";

type IncidentRecord = {
  id: string;
  created_at: string;
  resolved_at?: string;
  status: IncidentStatus;
  metrics: Record<string, unknown>;
  anomalies: unknown[];
  root_cause: string | null;
  fix_plan: string | null;
  report: string | null;
  requires_approval: boolean;
};

const API_URL = "https://cloudpilot-ai-backend.onrender.com";

const severityConfig = {
  critical: { color: "text-red-400",   bg: "bg-red-400/10",   label: "critical" },
  warning:  { color: "text-amber-400", bg: "bg-amber-400/10", label: "warning"  },
  info:     { color: "text-blue-400",  bg: "bg-blue-400/10",  label: "info"     },
};

export default function ApprovalsPage() {
  const [pendingIncidents, setPendingIncidents] = useState<IncidentRecord[]>([]);
  const [allIncidents, setAllIncidents]         = useState<IncidentRecord[]>([]);
  const [loading, setLoading]                   = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/incidents`);
      const data = await res.json();
      const all  = Array.isArray(data) ? data : [];
      setAllIncidents(all);
      setPendingIncidents(all.filter((i: IncidentRecord) => i.status === "needs_approval"));
    } catch {
      // fallback localStorage
      try {
        const stored = localStorage.getItem("cloudpilot_incidents");
        const all    = stored ? JSON.parse(stored) : [];
        setAllIncidents(all);
        setPendingIncidents(all.filter((i: IncidentRecord) => i.status === "needs_approval"));
      } catch { setPendingIncidents([]); setAllIncidents([]); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 8000);
    return () => clearInterval(iv);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`${API_URL}/incidents/${id}/approve`, { method: "POST" });
    } catch {}
    // Update localStorage too
    try {
      const stored = localStorage.getItem("cloudpilot_incidents");
      if (stored) {
        const all = JSON.parse(stored).map((i: IncidentRecord) => i.id === id ? { ...i, status: "approved" } : i);
        localStorage.setItem("cloudpilot_incidents", JSON.stringify(all));
      }
    } catch {}
    await fetchAll();
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`${API_URL}/incidents/${id}/reject`, { method: "POST" });
    } catch {}
    try {
      const stored = localStorage.getItem("cloudpilot_incidents");
      if (stored) {
        const all = JSON.parse(stored).map((i: IncidentRecord) => i.id === id ? { ...i, status: "rejected" } : i);
        localStorage.setItem("cloudpilot_incidents", JSON.stringify(all));
      }
    } catch {}
    await fetchAll();
  };

  const getIncidentSeverity = (incident: IncidentRecord) => {
    if ((incident.anomalies as unknown[])?.length > 0) return "critical";
    return "warning";
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const today = new Date().toDateString();

  const approvedToday = useMemo(() =>
    allIncidents.filter((i) => i.status === "approved" && new Date(i.created_at).toDateString() === today).length,
    [allIncidents, today]);

  const rejectedToday = useMemo(() =>
    allIncidents.filter((i) => i.status === "rejected" && new Date(i.created_at).toDateString() === today).length,
    [allIncidents, today]);

  const kpiConfig = [
    { title: "Pending Approvals", value: pendingIncidents.length, icon: ShieldAlert, color: "text-amber-400", border: "border-amber-400/20", trend: "Awaiting review"   },
    { title: "Approved Today",    value: approvedToday,           icon: ShieldCheck, color: "text-blue-400",  border: "border-blue-400/20",  trend: "Remediated today" },
    { title: "Rejected Today",    value: rejectedToday,           icon: ShieldX,     color: "text-red-400",   border: "border-red-400/20",   trend: "Dismissed today"  },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-3">
          <ChevronLeft className="h-4 w-4" />Dashboard
        </a>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Pending Approvals</h1>
            <p className="text-sm text-slate-500 mt-1">Review and approve AI-generated remediation plans before deployment</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/20 px-3 py-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">{pendingIncidents.length} pending</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpiConfig.map((kpi) => (
          <div key={kpi.title} className={`rounded-xl border ${kpi.border} bg-slate-900/50 p-5 backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-400">{kpi.title}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <p className="text-xs text-slate-500 mt-1">{kpi.trend}</p>
          </div>
        ))}
      </div>

      {/* Incident Cards */}
      <div className="space-y-4">
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <div className="animate-pulse text-slate-500 text-sm">Loading from database...</div>
          </div>
        )}

        {!loading && pendingIncidents.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 py-16 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
            <p className="text-slate-200 font-medium">All clear!</p>
            <p className="text-slate-500 text-sm">No incidents require approval at this time.</p>
            <p className="text-slate-600 text-xs">Run the agent pipeline to generate new incidents.</p>
          </div>
        )}

        {!loading && pendingIncidents.map((incident) => {
          const sev = severityConfig[getIncidentSeverity(incident)];
          const anomalyCount = (incident.anomalies as unknown[])?.length ?? 0;
          return (
            <div key={incident.id} className="rounded-xl border border-amber-400/20 border-l-4 border-l-amber-500 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
              <div className="p-5 border-b border-slate-800/60">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">{incident.id}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sev.bg} ${sev.color}`}>{sev.label}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                      <AlertTriangle className="h-3 w-3" />needs approval
                    </span>
                  </div>
                  <p className="text-base font-semibold text-slate-100">
                    {anomalyCount > 0 ? `${anomalyCount} anomal${anomalyCount === 1 ? "y" : "ies"} detected` : "System check required"}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />{formatDate(incident.created_at)}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Root Cause */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Root Cause</span>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 border-l-2 border-l-amber-500 bg-slate-950/50 p-3 text-sm text-slate-200 leading-relaxed">
                    {(incident.root_cause || "No root cause generated.").replace(/\*\*/g, "").replace(/\*/g, "")}
                  </div>
                </div>

                {/* Fix Plan */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Fix</span>
                  </div>
                  <div className="rounded-lg border border-blue-500/20 border-l-2 border-l-blue-500 bg-slate-950/50 p-3 text-sm text-slate-200 leading-relaxed">
                    {(incident.fix_plan || "No fix plan generated.").replace(/\*\*/g, "").replace(/\*/g, "")}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleApprove(incident.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle className="h-4 w-4" />Approve & Deploy
                  </button>
                  <button
                    onClick={() => handleReject(incident.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />Reject
                  </button>
                  <span className="text-xs text-slate-600 ml-2">Human approval required before deployment</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}