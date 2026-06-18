"use client";
import React from "react";
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
  ChevronRight,
  Filter,
  BarChart3,
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

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<IncidentStatus | "all">("all");
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const stored = localStorage.getItem("cloudpilot_incidents");
    if (stored) {
      try {
        setIncidents(JSON.parse(stored));
      } catch {
        setIncidents([]);
      }
    }
  }, []);

  const getIncidentSeverity = (incident: IncidentRecord) => {
    if (incident.status === "needs_approval" || incident.status === "rejected") return "critical";
    if ((incident.anomalies as unknown[])?.length > 0) return "warning";
    return "info";
  };

  const filteredIncidents = useMemo(() => {
    let result = incidents;
    if (filter !== "all") {
      result = result.filter((i) => i.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.id.toLowerCase().includes(q) ||
          (i.root_cause || "").toLowerCase().includes(q) ||
          i.status.toLowerCase().includes(q)
      );
    }
    return result;
  }, [incidents, filter, search]);

  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const paginated = filteredIncidents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalIncidents = incidents.length;
  const criticalIncidents = incidents.filter((i) => getIncidentSeverity(i) === "critical").length;
  const approvedCount = incidents.filter((i) => i.status === "approved").length;
  const pendingCount = incidents.filter((i) => i.status === "needs_approval").length;

  const kpiConfig = [
    {
      title: "Total Incidents",
      value: totalIncidents,
      icon: BarChart3,
      color: "text-slate-300",
      bgColor: "bg-slate-400/10",
      borderColor: "border-slate-400/20",
      trend: "All time",
    },
    {
      title: "Critical Incidents",
      value: criticalIncidents,
      icon: AlertTriangle,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
      borderColor: "border-red-400/20",
      trend: "Requires attention",
    },
    {
      title: "Approved",
      value: approvedCount,
      icon: ShieldCheck,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      borderColor: "border-blue-400/20",
      trend: "Remediated",
    },
    {
      title: "Pending Approval",
      value: pendingCount,
      icon: ShieldAlert,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/20",
      trend: "Awaiting review",
    },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

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
        <div>
          <div className="flex items-center gap-2 mb-2">
            <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </a>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Incidents</h2>
          <p className="text-sm text-slate-400 mt-1">View and manage all system incidents</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ID, root cause, or status..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 text-slate-500 shrink-0" />
            {(["all", "needs_approval", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {f === "all" ? "All" : f === "needs_approval" ? "Needs Approval" : f === "approved" ? "Approved" : "Rejected"}
              </button>
            ))}
          </div>
        </div>

        {/* Incidents Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">Incident ID</th>
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">Severity</th>
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">Status</th>
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">Anomalies</th>
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">Root Cause</th>
                    <th className="pb-3 text-left font-medium text-slate-400">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-600 text-sm">
                        {incidents.length === 0
                          ? "No incidents recorded yet. Run the agent pipeline to generate incident data."
                          : "No incidents match your search or filter."}
                      </td>
                    </tr>
                  )}
                  {paginated.map((incident) => {
                    const sev = severityConfig[getIncidentSeverity(incident)];
                    const st = statusConfig[incident.status];
                    const StatusIcon = st.icon;
                    return (
                      <tr
                        key={incident.id}
                        className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <td className="py-3 pr-4 font-mono text-xs text-slate-400">{incident.id}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sev.bg} ${sev.color}`}>
                            {sev.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.bg} ${st.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">{(incident.anomalies as unknown[])?.length ?? 0}</td>
                        <td className="py-3 pr-4 text-slate-300 max-w-xs truncate">{incident.root_cause || "—"}</td>
                        <td className="py-3 text-slate-500 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(incident.created_at)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredIncidents.length)} of {filteredIncidents.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Panel */}
      {selectedIncident && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedIncident(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 p-6">
              <div>
                <p className="font-mono text-xs text-slate-400 mb-1">{selectedIncident.id}</p>
                <h3 className="text-lg font-semibold text-slate-100">Incident Details</h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${severityConfig[getIncidentSeverity(selectedIncident)].bg} ${severityConfig[getIncidentSeverity(selectedIncident)].color}`}>
                  {severityConfig[getIncidentSeverity(selectedIncident)].label}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[selectedIncident.status].bg} ${statusConfig[selectedIncident.status].color}`}>
                  {React.createElement(
                    statusConfig[selectedIncident.status].icon,
                    { className: "h-3 w-3" }
                    )}
                    {statusConfig[selectedIncident.status].label}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(selectedIncident.created_at)}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Metrics</div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                  <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
                    {JSON.stringify(selectedIncident.metrics, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Root Cause</div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-slate-200 leading-relaxed">
                  {selectedIncident.root_cause || "No root cause generated."}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fix Plan</div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-slate-200 leading-relaxed">
                  {selectedIncident.fix_plan || "No fix plan generated."}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Full Report</div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedIncident.report || "No report generated."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}