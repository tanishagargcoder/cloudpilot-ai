"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ShieldCheck, ShieldAlert, Clock,
  Lock, Users, Boxes, FlaskConical, RefreshCw,
} from "lucide-react";
import { parseServerDate } from "../lib/time";

const API_URL = "https://cloudpilot-ai-backend.onrender.com";

type Finding = {
  category: string;
  resource: string;
  issue: string;
  recommendation: string;
  severity: "critical" | "medium" | "low";
};

type SecurityReport = {
  simulated: boolean;
  score: number;
  checks_run: number;
  findings: Finding[];
  scanned_at: string;
};

const FALLBACK_DEMO: SecurityReport = {
  simulated: true,
  score: 56,
  checks_run: 3,
  scanned_at: new Date().toISOString(),
  findings: [
    { category: "S3 Bucket", resource: "cloudpilot-public-assets", issue: "Bucket allows public read access", recommendation: "Enable Block Public Access unless static hosting is required", severity: "critical" },
    { category: "Security Group", resource: "sg-0a1b2c3d4e5f6a7b8", issue: "Port 22 (SSH) open to the world (0.0.0.0/0)", recommendation: "Restrict SSH to your IP or use SSM Session Manager", severity: "critical" },
    { category: "IAM", resource: "user/deploy-bot", issue: "User has no MFA device configured", recommendation: "Enable MFA for all IAM users", severity: "medium" },
    { category: "IAM", resource: "role/legacy-admin", issue: "Role has AdministratorAccess policy attached", recommendation: "Apply least-privilege permissions", severity: "medium" },
  ],
};

const catIcon: Record<string, typeof Lock> = {
  "Security Group": Lock,
  "S3 Bucket": Boxes,
  IAM: Users,
};

const sevStyle: Record<string, string> = {
  critical: "border-red-400/25 text-red-400 bg-red-400/10",
  medium:   "border-amber-400/25 text-amber-400 bg-amber-400/10",
  low:      "border-blue-400/25 text-blue-400 bg-blue-400/10",
};

export default function SecurityPage() {
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const fetchReport = useCallback(async (demo: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/security/findings${demo ? "?demo=true" : ""}`);
      if (!res.ok) throw new Error("scan failed");
      setReport(await res.json());
    } catch {
      setReport(FALLBACK_DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(demoMode); }, [demoMode, fetchReport]);

  const score = report?.score ?? 0;
  const scoreColor = score >= 90 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444";
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const criticalCount = report?.findings.filter((f) => f.severity === "critical").length ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-2">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </a>
          <h1 className="text-2xl font-bold text-slate-100">Security Agent</h1>
          <p className="text-sm text-slate-500 mt-1">Scans security groups, S3 buckets and IAM for risky configuration</p>
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

      {/* Score + summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex items-center gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
              <circle cx="50" cy="50" r={R} fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle
                cx="50" cy="50" r={R} fill="none"
                stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - score / 100)}
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-100">{loading ? "…" : score}</span>
              <span className="text-[10px] text-slate-500">/100</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Security Score</p>
            <p className="text-xs text-slate-500 mt-1">
              {score >= 90 ? "Excellent posture" : score >= 70 ? "Needs attention" : "At risk — fix critical findings"}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-red-400/20 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Critical Findings</span>
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-400">{report?.findings ? criticalCount : "—"}</div>
          <p className="text-xs text-slate-500 mt-1">{(report?.findings.length ?? 0) - criticalCount} medium/low</p>
        </div>
        <div className="rounded-xl border border-blue-400/20 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">Checks Run</span>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100">{report?.checks_run ?? "—"}</div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {report ? parseServerDate(report.scanned_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-3">
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center text-sm text-slate-500 animate-pulse">
            Scanning AWS account for security risks...
          </div>
        )}

        {!loading && report && report.findings.length === 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/50 py-14 text-center space-y-3">
            <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto" />
            <p className="text-slate-200 font-medium">No security issues found!</p>
            <p className="text-slate-500 text-sm">All configured checks passed on this scan.</p>
          </div>
        )}

        {!loading && report?.findings.map((f, i) => {
          const Icon = catIcon[f.category] || Lock;
          return (
            <div key={i} className={`rounded-xl border bg-slate-900/50 p-5 flex items-start gap-4 ${sevStyle[f.severity]?.split(" ")[0] || "border-slate-800"}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800/80">
                <Icon className="h-5 w-5 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-slate-100">{f.category}</span>
                  <span className="font-mono text-[11px] text-slate-500">{f.resource}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${sevStyle[f.severity]}`}>{f.severity}</span>
                </div>
                <p className="text-sm text-slate-300">{f.issue}</p>
                <p className="text-xs text-slate-500 mt-1">🔒 {f.recommendation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
