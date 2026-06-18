"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Cloud,
  Bell,
  Settings,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Activity,
} from "lucide-react";

type IncidentStatus = "healthy" | "needs_approval" | "approved" | "rejected";

type PipelineState = {
  metrics: Record<string, unknown>;
  anomalies: unknown[];
  root_cause: string | null;
  fix_plan: string | null;
  report: string | null;
  requires_approval: boolean;
};

type IncidentRecord = PipelineState & {
  id: string;
  created_at: string;
  status: IncidentStatus;
};

const statusConfig: Record<IncidentStatus, { color: string; bg: string; label: string; icon: typeof Activity }> = {
  healthy: { color: "text-emerald-400", bg: "bg-emerald-400/10", label: "healthy", icon: CheckCircle },
  needs_approval: { color: "text-amber-400", bg: "bg-amber-400/10", label: "needs approval", icon: ShieldAlert },
  approved: { color: "text-blue-400", bg: "bg-blue-400/10", label: "approved", icon: ShieldCheck },
  rejected: { color: "text-red-400", bg: "bg-red-400/10", label: "rejected", icon: ShieldX },
};

const severityConfig = {
  critical: { color: "text-red-400", bg: "bg-red-400/10", label: "critical" },
  warning: { color: "text-amber-400", bg: "bg-amber-400/10", label: "warning" },
  info: { color: "text-blue-400", bg: "bg-blue-400/10", label: "info" },
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow-sm backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold leading-none tracking-tight text-slate-100 ${className}`}>
      {children}
    </h3>
  );
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export default function ApprovalsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("cloudpilot_incidents");
    if (stored) {
      try {
        const parsed: IncidentRecord[] = JSON.parse(stored);
        const pending = parsed.filter((i) => i.status === "needs_approval");
        setIncidents(pending);
      } catch {
        setIncidents([]);
      }
    }
    setLoading(false);
  }, []);

  const updateIncidentStatus = (id: string, newStatus: "approved" | "rejected") => {
    const allStored = localStorage.getItem("cloudpilot_incidents");
    if (!allStored) return;

    try {
      const all: IncidentRecord[] = JSON.parse(allStored);
      const updated = all.map((incident) =>
        incident.id === id ? { ...incident, status: newStatus } : incident
      );

      localStorage.setItem("cloudpilot_incidents", JSON.stringify(updated));

      setIncidents((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleApprove = (id: string) => updateIncidentStatus(id, "approved");
  const handleReject = (id: string) => updateIncidentStatus(id, "rejected");

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getIncidentSeverity = (incident: IncidentRecord) => {
    if (incident.status === "needs_approval" || incident.status === "rejected") return "critical";
    if ((incident.anomalies as unknown[])?.length > 0) return "warning";
    return "info";
  };

  const today = new Date().toDateString();
  const approvedToday = useMemo(() => {
    const stored = localStorage.getItem("cloudpilot_incidents");
    if (!stored) return 0;
    try {
      const all: IncidentRecord[] = JSON.parse(stored);
      return all.filter((i) => i.status === "approved" && new Date(i.created_at).toDateString() === today).length;
    } catch {
      return 0;
    }
  }, [incidents, today]);

  const rejectedToday = useMemo(() => {
    const stored = localStorage.getItem("cloudpilot_incidents");
    if (!stored) return 0;
    try {
      const all: IncidentRecord[] = JSON.parse(stored);
      return all.filter((i) => i.status === "rejected" && new Date(i.created_at).toDateString() === today).length;
    } catch {
      return 0;
    }
  }, [incidents, today]);

  const kpiConfig = [
    {
      title: "Pending Approvals",
      value: incidents.length,
      icon: ShieldAlert,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/20",
      trend: "Awaiting review",
    },
    {
      title: "Approved Today",
      value: approvedToday,
      icon: ShieldCheck,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      borderColor: "border-blue-400/20",
      trend: "Remediated today",
    },
    {
      title: "Rejected Today",
      value: rejectedToday,
      icon: ShieldX,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
      borderColor: "border-red-400/20",
      trend: "Dismissed today",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">CloudPilot AI</h1>
            <span className="hidden sm:inline-flex rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
              DevOps Assistant
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-64 rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronLeft className="h-4 w-4" />
                Dashboard
              </a>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Pending Approvals</h2>
            <p className="text-sm text-slate-400 mt-1">Review and approve remediation plans before deployment</p>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">{incidents.length} pending</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpiConfig.map((kpi) => (
            <Card key={kpi.title} className={kpi.borderColor}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">{kpi.title}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{kpi.value}</div>
                <p className="text-xs text-slate-400 mt-1">{kpi.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Incidents */}
        <div className="space-y-4">
          {loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-pulse text-slate-500 text-sm">Loading incidents...</div>
              </CardContent>
            </Card>
          )}

          {!loading && incidents.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
                <p className="text-slate-300 font-medium">All clear</p>
                <p className="text-slate-500 text-sm">No incidents require approval at this time.</p>
              </CardContent>
            </Card>
          )}

          {!loading &&
            incidents.map((incident) => {
              const sev = severityConfig[getIncidentSeverity(incident)];
              return (
                <Card key={incident.id} className="border-amber-400/20">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">{incident.id}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          needs approval
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sev.bg} ${sev.color}`}>
                          {sev.label}
                        </span>
                      </div>
                      <CardTitle className="text-base">
                        {(incident.anomalies as unknown[])?.length ?? 0} anomalies detected
                      </CardTitle>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(incident.created_at)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Root Cause</div>
                      <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 text-sm text-slate-200 leading-relaxed">
                        {incident.root_cause || "No root cause generated."}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fix Plan</div>
                      <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 text-sm text-slate-200 leading-relaxed">
                        {incident.fix_plan || "No fix plan generated."}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleApprove(incident.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve & Deploy
                      </button>
                      <button
                        onClick={() => handleReject(incident.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </main>
    </div>
  );
}