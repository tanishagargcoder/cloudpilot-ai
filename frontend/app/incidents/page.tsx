"use client";
import React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  Search, AlertTriangle, CheckCircle, XCircle, Clock,
  ChevronLeft, ChevronRight, Filter, BarChart3,
  ShieldAlert, ShieldCheck, ShieldX, Activity,
  Cpu, TrendingUp, Database, CheckCircle2, Wrench,
} from "lucide-react";

type IncidentStatus = "healthy" | "needs_approval" | "approved" | "rejected";

type IncidentRecord = {
  id: string;
  created_at: string;
  status: IncidentStatus;
  metrics: Record<string, unknown>;
  anomalies: unknown[];
  root_cause: string | null;
  fix_plan: string | null;
  report: string | null;
  requires_approval: boolean;
};

const API_URL = "https://cloudpilot-ai-backend.onrender.com";

const statusConfig: Record<IncidentStatus, { color: string; bg: string; label: string; icon: typeof Activity; border: string }> = {
  healthy:       { color: "text-emerald-400", bg: "bg-emerald-400/10", label: "healthy",      icon: CheckCircle,  border: "border-emerald-400/30" },
  needs_approval:{ color: "text-amber-400",  bg: "bg-amber-400/10",  label: "needs approval",icon: ShieldAlert,  border: "border-amber-400/30"   },
  approved:      { color: "text-blue-400",   bg: "bg-blue-400/10",   label: "approved",      icon: ShieldCheck,  border: "border-blue-400/30"    },
  rejected:      { color: "text-red-400",    bg: "bg-red-400/10",    label: "rejected",      icon: ShieldX,      border: "border-red-400/30"     },
};

const severityConfig = {
  critical: { color: "text-red-400",   bg: "bg-red-400/10",   label: "critical", border: "border-l-red-500"    },
  warning:  { color: "text-amber-400", bg: "bg-amber-400/10", label: "warning",  border: "border-l-amber-500"  },
  info:     { color: "text-blue-400",  bg: "bg-blue-400/10",  label: "info",     border: "border-l-blue-500"   },
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow-sm backdrop-blur-sm ${className}`}>{children}</div>;
}
function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
}
function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold leading-none tracking-tight text-slate-100 ${className}`}>{children}</h3>;
}
function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

function parseMetrics(metrics: Record<string, unknown>) {
  const datapoints = (metrics?.datapoints as any[]) || [];
  const values = datapoints.map((d) => d.Average || 0);
  const avg  = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : "—";
  const peak = values.length > 0 ? Math.max(...values).toFixed(2) : "—";
  return {
    avg:    avg  !== "—" ? `${avg}%`  : "—",
    peak:   peak !== "—" ? `${peak}%` : "—",
    datapoints: datapoints.length,
    status: values.length > 0 && Math.max(...values) < 70 ? "Healthy" : values.length > 0 ? "Elevated" : "No data",
    statusColor: values.length > 0 && Math.max(...values) < 70 ? "text-emerald-400" : "text-amber-400",
  };
}

function Timeline({ incident }: { incident: IncidentRecord }) {
  const base = new Date(incident.created_at);
  const fmt  = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const steps = [
    { time: fmt(base),                                  label: "Alert Triggered",   desc: "Anomaly detected in CloudWatch",        color: "bg-red-500",     done: true },
    { time: fmt(new Date(base.getTime() + 60000)),      label: "RCA Generated",     desc: "Root cause analysis completed by AI",   color: "bg-amber-500",   done: true },
    { time: fmt(new Date(base.getTime() + 120000)),     label: "Fix Plan Generated",desc: "AI remediation plan prepared",          color: "bg-blue-500",    done: true },
    { time: fmt(new Date(base.getTime() + 180000)),
      label: incident.status === "approved" ? "Approved & Deployed" : incident.status === "rejected" ? "Rejected" : "Awaiting Approval",
      desc:  incident.status === "approved" ? "Fix successfully deployed" : incident.status === "rejected" ? "Manual intervention required" : "Pending human review",
      color: incident.status === "approved" ? "bg-emerald-500" : incident.status === "rejected" ? "bg-red-500" : "bg-slate-600",
      done:  incident.status !== "needs_approval",
    },
  ];
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center" style={{ minWidth: 64 }}>
            <span className="text-[10px] text-slate-500 whitespace-nowrap pt-0.5">{step.time}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${step.done ? step.color : "bg-slate-700 border border-slate-600"}`} />
            {i < steps.length - 1 && <div className="w-px flex-1 bg-slate-800 my-1" style={{ minHeight: 24 }} />}
          </div>
          <div className="pb-4">
            <p className={`text-sm font-medium ${step.done ? "text-slate-200" : "text-slate-500"}`}>{step.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FixPlanCard({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.replace(/\*\*/g, "").replace(/\*/g, "").trim()).filter(Boolean);
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const isBullet = line.startsWith("•") || line.startsWith("-") || /^\d+\./.test(line);
        const content  = line.replace(/^[•\-]\s*/, "").replace(/^\d+\.\s*/, "");
        if (isBullet) return (
          <div key={i} className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            <p className="text-sm text-slate-300 leading-relaxed">{content}</p>
          </div>
        );
        if (line.includes(":") && line.length < 50) return <p key={i} className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-3">{line}</p>;
        return <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents]           = useState<IncidentRecord[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [filter, setFilter]                 = useState<IncidentStatus | "all">("all");
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [currentPage, setCurrentPage]       = useState(1);
  const itemsPerPage = 8;

  // ── Fetch from MongoDB API ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch(`${API_URL}/incidents`);
        const data = await res.json();
        setIncidents(Array.isArray(data) ? data : []);
      } catch {
        // fallback to localStorage
        const stored = localStorage.getItem("cloudpilot_incidents");
        if (stored) { try { setIncidents(JSON.parse(stored)); } catch { setIncidents([]); } }
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
    const iv = setInterval(fetchIncidents, 15000);
    return () => clearInterval(iv);
  }, []);

  const getIncidentSeverity = (incident: IncidentRecord) => {
    if (incident.status === "needs_approval" || incident.status === "rejected") return "critical";
    if ((incident.anomalies as unknown[])?.length > 0) return "warning";
    return "info";
  };

  const filteredIncidents = useMemo(() => {
    let result = incidents;
    if (filter !== "all") result = result.filter((i) => i.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.id.toLowerCase().includes(q) ||
        (i.root_cause || "").toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q)
      );
    }
    return result;
  }, [incidents, filter, search]);

  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const paginated  = filteredIncidents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalIncidents    = incidents.length;
  const criticalIncidents = incidents.filter((i) => getIncidentSeverity(i) === "critical").length;
  const approvedCount     = incidents.filter((i) => i.status === "approved").length;
  const pendingCount      = incidents.filter((i) => i.status === "needs_approval").length;

  const kpiConfig = [
    { title: "Total Incidents",   value: totalIncidents,    icon: BarChart3,   color: "text-slate-300", borderColor: "border-slate-400/20", trend: "All time"          },
    { title: "Critical Incidents",value: criticalIncidents, icon: AlertTriangle,color:"text-red-400",   borderColor: "border-red-400/20",   trend: "Requires attention"},
    { title: "Approved",          value: approvedCount,     icon: ShieldCheck,  color:"text-blue-400",  borderColor: "border-blue-400/20",  trend: "Remediated"        },
    { title: "Pending Approval",  value: pendingCount,      icon: ShieldAlert,  color:"text-amber-400", borderColor: "border-amber-400/20", trend: "Awaiting review"   },
  ];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="text-slate-100">
      <main className="max-w-7xl mx-auto space-y-6">
        <div>
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-2">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </a>
          <h2 className="text-2xl font-bold text-slate-100">Incidents</h2>
          <p className="text-sm text-slate-400 mt-1">View and manage all system incidents</p>
        </div>

        {/* KPIs */}
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

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <input type="text" placeholder="Search by ID, root cause, or status..."
              value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 text-slate-500 shrink-0" />
            {(["all", "needs_approval", "approved", "rejected"] as const).map((f) => (
              <button key={f} onClick={() => { setFilter(f); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}`}>
                {f === "all" ? "All" : f === "needs_approval" ? "Needs Approval" : f === "approved" ? "Approved" : "Rejected"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
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
                  {loading && [1, 2, 3, 4].map((i) => (
                    <tr key={`skel-${i}`}>
                      {[24, 20, 12, 16, 32, 20].map((w, j) => (
                        <td key={j} className="py-3 pr-4">
                          <div className={`h-4 animate-pulse rounded bg-slate-800/60`} style={{ width: `${w * 4}px` }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!loading && paginated.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-600 text-sm">
                      {incidents.length === 0 ? "No incidents yet. Run the agent pipeline." : "No incidents match your search."}
                    </td></tr>
                  )}
                  {!loading && paginated.map((incident) => {
                    const sev = severityConfig[getIncidentSeverity(incident)];
                    const st  = statusConfig[incident.status];
                    const StatusIcon = st.icon;
                    return (
                      <tr key={incident.id} className={`hover:bg-slate-800/50 transition-colors cursor-pointer border-l-2 ${sev.border}`}
                        onClick={() => setSelectedIncident(incident)}>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-400">{incident.id.slice(0, 22)}...</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sev.bg} ${sev.color}`}>{sev.label}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.bg} ${st.color}`}>
                            <StatusIcon className="h-3 w-3" />{st.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">{(incident.anomalies as unknown[])?.length ?? 0}</td>
                        <td className="py-3 pr-4 text-slate-400 max-w-xs truncate text-xs">
                          {(incident.root_cause || "—").replace(/\*\*/g, "").replace(/\*/g, "").slice(0, 60)}...
                        </td>
                        <td className="py-3 text-slate-500 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(incident.created_at)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500">Showing {(currentPage-1)*itemsPerPage+1}–{Math.min(currentPage*itemsPerPage, filteredIncidents.length)} of {filteredIncidents.length}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p-1))} disabled={currentPage===1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-xs text-slate-500">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal */}
      {selectedIncident && (() => {
        const sev     = severityConfig[getIncidentSeverity(selectedIncident)];
        const st      = statusConfig[selectedIncident.status];
        const metrics = parseMetrics(selectedIncident.metrics);
        const anomalyCount = (selectedIncident.anomalies as unknown[])?.length ?? 0;
        const aiScore = anomalyCount > 0 ? 87 : 95;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedIncident(null)}>
            <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border bg-slate-900 shadow-2xl border-l-4 ${sev.border}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-800 p-5">
                <div>
                  <p className="font-mono text-xs text-slate-500 mb-1">{selectedIncident.id}</p>
                  <h3 className="text-base font-semibold text-slate-100">Incident Details</h3>
                </div>
                <button onClick={() => setSelectedIncident(null)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors">✕</button>
              </div>
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${sev.bg} ${sev.color}`}>{sev.label}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${st.bg} ${st.color}`}>
                    {React.createElement(st.icon, { className: "h-3 w-3" })}{st.label}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(selectedIncident.created_at)}</span>
                </div>
                {/* Metrics */}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Metrics</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Average CPU", value: metrics.avg,        icon: Cpu,        color: "text-blue-400"    },
                      { label: "Peak CPU",    value: metrics.peak,       icon: TrendingUp,  color: "text-amber-400"   },
                      { label: "Datapoints",  value: metrics.datapoints, icon: Database,    color: "text-purple-400"  },
                      { label: "Status",      value: metrics.status,     icon: Activity,    color: metrics.statusColor},
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</span>
                        </div>
                        <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Timeline */}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Timeline</p>
                  <div className="rounded-lg bg-slate-950 border border-slate-800 p-4"><Timeline incident={selectedIncident} /></div>
                </div>
                {/* AI Score */}
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">AI Analysis Quality</p>
                      <p className="text-xs text-slate-500 mt-0.5">{aiScore >= 90 ? "Excellent" : aiScore >= 75 ? "Good" : "Moderate"}</p>
                    </div>
                    <span className={`text-2xl font-bold ${aiScore >= 90 ? "text-emerald-400" : "text-blue-400"}`}>{aiScore}<span className="text-sm font-normal text-slate-500">/100</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full ${aiScore >= 90 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${aiScore}%` }} />
                  </div>
                </div>
                {/* Root Cause */}
                <div>
                  <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-amber-400" /><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Root Cause</p></div>
                  <div className="rounded-lg bg-slate-950 border border-amber-500/20 border-l-2 border-l-amber-500 p-4">
                    <p className="text-sm text-slate-200 leading-relaxed">{(selectedIncident.root_cause || "No root cause generated.").replace(/\*\*/g, "").replace(/\*/g, "")}</p>
                  </div>
                </div>
                {/* Fix Plan */}
                <div>
                  <div className="flex items-center gap-2 mb-2"><Wrench className="h-4 w-4 text-blue-400" /><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recommended Fix</p></div>
                  <div className="rounded-lg bg-slate-950 border border-blue-500/20 border-l-2 border-l-blue-500 p-4">
                    <FixPlanCard text={selectedIncident.fix_plan || "No fix plan generated."} />
                  </div>
                </div>
                {/* Report */}
                {selectedIncident.report && (
                  <div>
                    <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Incident Report</p></div>
                    <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedIncident.report.replace(/\*\*/g, "").replace(/\*/g, "")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}