"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, DollarSign, TrendingDown, Clock, Server,
  HardDrive, Globe, Database, FlaskConical, RefreshCw, CheckCircle,
} from "lucide-react";
import { parseServerDate } from "../lib/time";

const API_URL = "https://cloudpilot-ai-backend.onrender.com";

type CostRec = {
  type: string;
  resource: string;
  issue: string;
  action: string;
  monthly_savings: number;
  severity: "high" | "medium" | "low";
};

type CostReport = {
  simulated: boolean;
  total_monthly_savings: number;
  recommendations: CostRec[];
  scanned_at: string;
};

const FALLBACK_DEMO: CostReport = {
  simulated: true,
  total_monthly_savings: 51.65,
  scanned_at: new Date().toISOString(),
  recommendations: [
    { type: "EC2 Instance", resource: "i-0b3f2a91c4e7d8f01", issue: "CPU below 5% for 14 days (idle worker)", action: "Downsize t3.medium to t3.small", monthly_savings: 15.18, severity: "high" },
    { type: "EBS Volume", resource: "vol-0f2a9c13b7e64d215", issue: "Unattached 100 GB gp3 volume", action: "Snapshot and delete the volume", monthly_savings: 8.0, severity: "medium" },
    { type: "Elastic IP", resource: "eipalloc-09d13c2ab8f7e6d41", issue: "Not associated with any instance", action: "Release the unused address", monthly_savings: 3.65, severity: "low" },
    { type: "RDS Database", resource: "db-reports-dev", issue: "No connections in the last 30 days", action: "Stop or delete the dev database", monthly_savings: 24.82, severity: "high" },
  ],
};

const typeIcon: Record<string, typeof Server> = {
  "EC2 Instance": Server,
  "EBS Volume": HardDrive,
  "Elastic IP": Globe,
  "RDS Database": Database,
};

const sevStyle: Record<string, string> = {
  high:   "border-red-400/25 text-red-400 bg-red-400/10",
  medium: "border-amber-400/25 text-amber-400 bg-amber-400/10",
  low:    "border-blue-400/25 text-blue-400 bg-blue-400/10",
};

export default function CostPage() {
  const [report, setReport] = useState<CostReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const fetchReport = useCallback(async (demo: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cost/recommendations${demo ? "?demo=true" : ""}`);
      if (!res.ok) throw new Error("scan failed");
      setReport(await res.json());
    } catch {
      setReport(FALLBACK_DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(demoMode); }, [demoMode, fetchReport]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-2">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </a>
          <h1 className="text-2xl font-bold text-slate-100">Cost Optimization</h1>
          <p className="text-sm text-slate-500 mt-1">AI agent scans your AWS account for wasted spend</p>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <span className={`text-xs px-2.5 py-1 rounded-full border ${report.simulated ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"}`}>
              {report.simulated ? "🧪 Demo data" : "✓ Live AWS scan"}
            </span>
          )}
          <button
            onClick={() => setDemoMode((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            {demoMode ? "Show Live Scan" : "Show Demo Scan"}
          </button>
          <button
            onClick={() => fetchReport(demoMode)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Rescan
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-400/20 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Estimated Savings</span>
            <TrendingDown className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            ${report?.total_monthly_savings?.toFixed(2) ?? "—"}<span className="text-sm font-normal text-slate-500">/month</span>
          </div>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Recommendations</span>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100">{report?.recommendations.length ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-blue-400/20 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Last Scanned</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-slate-100">
            {report ? parseServerDate(report.scanned_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center text-sm text-slate-500 animate-pulse">
            Scanning AWS account for cost waste...
          </div>
        )}

        {!loading && report && report.recommendations.length === 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/50 py-14 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
            <p className="text-slate-200 font-medium">No wasted spend found!</p>
            <p className="text-slate-500 text-sm">Your AWS account is running lean — no idle resources detected.</p>
            <p className="text-slate-600 text-xs">Use "Show Demo Scan" to preview how recommendations look.</p>
          </div>
        )}

        {!loading && report?.recommendations.map((rec, i) => {
          const Icon = typeIcon[rec.type] || Server;
          return (
            <div key={i} className={`rounded-xl border bg-slate-900/50 p-5 flex items-start gap-4 ${sevStyle[rec.severity]?.split(" ")[0] || "border-slate-800"}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800/80">
                <Icon className="h-5 w-5 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-slate-100">{rec.type}</span>
                  <span className="font-mono text-[11px] text-slate-500">{rec.resource}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${sevStyle[rec.severity]}`}>{rec.severity}</span>
                </div>
                <p className="text-sm text-slate-300">{rec.issue}</p>
                <p className="text-xs text-slate-500 mt-1">💡 {rec.action}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-emerald-400">${rec.monthly_savings.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">per month</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
