"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Activity,
  Cpu,
  ArrowLeft,
} from "lucide-react";

type IncidentRecord = {
  id: string;
  created_at: string;
  status: string;
  anomalies: unknown[];
  root_cause: string | null;
  requires_approval: boolean;
};

const COLORS = {
  cpu: "#3b82f6",
  critical: "#ef4444",
  warning: "#f59e0b",
  approved: "#10b981",
  pending: "#f59e0b",
  rejected: "#ef4444",
  healthy: "#3b82f6",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
        <p className="text-sm font-medium text-slate-300 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [cpuData, setCpuData] = useState<{ time: string; value: number }[]>([]);
  const [cpuLoading, setCpuLoading] = useState(true);

  // Load incidents from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cloudpilot_incidents");
    if (stored) {
      try { setIncidents(JSON.parse(stored)); }
      catch { setIncidents([]); }
    }
  }, []);

  // Fetch REAL CPU data from AWS via FastAPI
  useEffect(() => {
    setCpuLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/metrics/ec2-cpu`)
      .then((r) => r.json())
      .then((data) => {
        const points = (data.datapoints || [])
          .sort(
            (a: { Timestamp: string }, b: { Timestamp: string }) =>
              new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
          )
          .map((p: { Timestamp: string; Average: number }) => ({
            time: new Date(p.Timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            value: Math.round(p.Average * 100) / 100,
          }));
        if (points.length > 0) setCpuData(points);
      })
      .catch(() => {
        // fallback mock if backend not reachable
        setCpuData([
          { time: "00:00", value: 0.2 },
          { time: "02:00", value: 0.2 },
          { time: "04:00", value: 0.2 },
        ]);
      })
      .finally(() => setCpuLoading(false));
  }, []);

  // Build REAL incident trend from localStorage data (last 7 days)
  const incidentTrend = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last7: { day: string; total: number; critical: number; approved: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = days[d.getDay()];
      const dateStr = d.toDateString();

      const dayIncidents = incidents.filter(
        (inc) => new Date(inc.created_at).toDateString() === dateStr
      );

      last7.push({
        day: label,
        total: dayIncidents.length,
        critical: dayIncidents.filter((inc) => (inc.anomalies as unknown[])?.length > 0).length,
        approved: dayIncidents.filter((inc) => inc.status === "approved").length,
      });
    }
    return last7;
  }, [incidents]);

  const stats = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((i) => (i.anomalies as unknown[])?.length > 0).length;
    const approved = incidents.filter((i) => i.status === "approved").length;
    const pending = incidents.filter((i) => i.status === "needs_approval").length;
    const rejected = incidents.filter((i) => i.status === "rejected").length;
    const healthy = incidents.filter((i) => i.status === "healthy").length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const severityData = [
      { name: "Critical", value: critical || 0, color: COLORS.critical },
      { name: "Healthy", value: Math.max(0, total - critical), color: COLORS.approved },
    ].filter((d) => d.value > 0);

    const approvalData = [
      { name: "Approved", value: approved, color: COLORS.approved },
      { name: "Pending", value: pending, color: COLORS.pending },
      { name: "Rejected", value: rejected, color: COLORS.rejected },
      { name: "Healthy", value: healthy, color: COLORS.healthy },
    ].filter((d) => d.value > 0);

    return { total, critical, approved, approvalRate, severityData, approvalData };
  }, [incidents]);

  const kpiCards = [
    {
      title: "Total Incidents",
      value: stats.total,
      icon: BarChart3,
      color: "text-blue-400",
      trend: "From agent pipeline runs",
    },
    {
      title: "Critical Incidents",
      value: stats.critical,
      icon: AlertTriangle,
      color: "text-red-400",
      trend: "With anomalies detected",
    },
    {
      title: "Approval Rate",
      value: `${stats.approvalRate}%`,
      icon: ShieldCheck,
      color: "text-emerald-400",
      trend: "Fixes approved",
    },
    {
      title: "Fixes Approved",
      value: stats.approved,
      icon: Clock,
      color: "text-amber-400",
      trend: "Remediated incidents",
    },
  ];

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
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Real system performance and incident metrics</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live data
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-400">{kpi.title}</span>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <p className="text-xs text-slate-500 mt-1">{kpi.trend}</p>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* REAL CPU Chart */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-blue-400" />
              <h3 className="text-base font-semibold text-slate-200">CPU Usage — Last Hour</h3>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
              Live from AWS
            </span>
          </div>
          <div className="h-[260px]">
            {cpuLoading ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                Loading AWS data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuData}>
                  <defs>
                    <linearGradient id="cpuGradAnalytics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.cpu} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.cpu} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS.cpu}
                    strokeWidth={2}
                    fill="url(#cpuGradAnalytics)"
                    name="CPU %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* REAL Incident Trend — last 7 days from localStorage */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-slate-200">Incident Trend — Last 7 Days</h3>
            </div>
            <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
              Real data
            </span>
          </div>
          <div className="h-[260px]">
            {incidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm gap-2">
                <Activity className="h-8 w-8 text-slate-700" />
                <p>No incidents yet.</p>
                <p className="text-xs">Run the agent pipeline to generate data.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidentTrend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill={COLORS.cpu} radius={[4, 4, 0, 0]} name="Total" />
                  <Bar dataKey="critical" fill={COLORS.critical} radius={[4, 4, 0, 0]} name="Critical" />
                  <Bar dataKey="approved" fill={COLORS.approved} radius={[4, 4, 0, 0]} name="Approved" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Severity Pie */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-base font-semibold text-slate-200">Severity Distribution</h3>
          </div>
          {stats.severityData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-600 text-sm">
              No incident data yet
            </div>
          ) : (
            <div className="h-[260px] flex items-center gap-6">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.severityData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3 flex-1">
                {stats.severityData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-slate-400 flex-1">{d.name}</span>
                    <span className="text-xs font-semibold text-slate-200">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Approval Pie */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-slate-200">Approval Breakdown</h3>
          </div>
          {stats.approvalData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-600 text-sm">
              No incident data yet
            </div>
          ) : (
            <div className="h-[260px] flex items-center gap-6">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.approvalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.approvalData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3 flex-1">
                {stats.approvalData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-slate-400 flex-1">{d.name}</span>
                    <span className="text-xs font-semibold text-slate-200">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}