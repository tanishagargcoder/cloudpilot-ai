"use client";

import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle,
  Bot,
  Lightbulb,
  Activity,
  Pause,
  Play,
  Cloud,
  Bell,
  Settings,
  Search,
  Zap,
  Info,
  CheckCircle2,
} from "lucide-react";

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
  status: "healthy" | "needs_approval";
};

type AgentEvent = {
  event: string;
  agent?: string;
  result?: Record<string, unknown>;
  message?: string;
  final_state?: PipelineState;
};

type AgentStatus = {
  id: string;
  name: string;
  status: "running" | "idle" | "error";
  lastSeen: string;
  tasks: number;
};

const mockAgents: AgentStatus[] = [
  { id: "agent-1", name: "Monitoring Agent", status: "running", lastSeen: "2s ago", tasks: 142 },
  { id: "agent-2", name: "Analysis Agent", status: "running", lastSeen: "5s ago", tasks: 89 },
  { id: "agent-3", name: "Report Agent", status: "idle", lastSeen: "1m ago", tasks: 34 },
  { id: "agent-4", name: "Remediation Agent", status: "running", lastSeen: "3s ago", tasks: 67 },
];

const memoryData = [
  { time: "00:00", usage: 60 },
  { time: "02:00", usage: 58 },
  { time: "04:00", usage: 61 },
  { time: "06:00", usage: 68 },
  { time: "08:00", usage: 75 },
  { time: "10:00", usage: 78 },
  { time: "12:00", usage: 76 },
];

const networkData = [
  { time: "00:00", inbound: 120, outbound: 80 },
  { time: "02:00", inbound: 150, outbound: 95 },
  { time: "04:00", inbound: 110, outbound: 70 },
  { time: "06:00", inbound: 200, outbound: 140 },
  { time: "08:00", inbound: 350, outbound: 220 },
  { time: "10:00", inbound: 420, outbound: 280 },
  { time: "12:00", inbound: 380, outbound: 250 },
];

const statusConfig: Record<string, { color: string; bg: string; icon: typeof Play }> = {
  running: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: Play },
  idle: { color: "text-amber-400", bg: "bg-amber-400/10", icon: Pause },
  error: { color: "text-red-400", bg: "bg-red-400/10", icon: Activity },
};

const typeConfig: Record<string, { color: string; bg: string; icon: typeof Info }> = {
  alert: { color: "text-red-400", bg: "bg-red-400/10", icon: AlertTriangle },
  info: { color: "text-blue-400", bg: "bg-blue-400/10", icon: Info },
  action: { color: "text-amber-400", bg: "bg-amber-400/10", icon: Zap },
  success: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
};

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
        <p className="text-sm font-medium text-slate-300 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
            {entry.name.includes("Network") ? " Mbps" : "%"}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow-sm backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
}

function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`text-lg font-semibold leading-none tracking-tight text-slate-100 ${className}`}
    >
      {children}
    </h3>
  );
}

function CardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export default function Dashboard() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [cpuData, setCpuData] = useState<{ time: string; usage: number }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/events");
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (e) => {
      const data: AgentEvent = JSON.parse(e.data);
      setEvents((prev) => [...prev, data]);

      if (data.event === "pipeline_complete") {
        setRunning(false);

        if (data.final_state) {
          const incident: IncidentRecord = {
            ...data.final_state,
            id: `incident-${Date.now()}`,
            created_at: new Date().toISOString(),
            status: data.final_state.requires_approval ? "needs_approval" : "healthy",
          };

          localStorage.setItem("cloudpilot_latest_incident", JSON.stringify(incident));

          const existing = JSON.parse(localStorage.getItem("cloudpilot_incidents") || "[]");
          const updated = [incident, ...existing].slice(0, 10);
          localStorage.setItem("cloudpilot_incidents", JSON.stringify(updated));
          setIncidents(updated);
        }
      }
    };

    return () => ws.close();
  }, []);


  useEffect(() => {
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/metrics/ec2-cpu`)
    .then((r) => r.json())
    .then((data) => {
      const points = (data.datapoints || [])
        .sort(
          (a: { Timestamp: string }, b: { Timestamp: string }) =>
            new Date(a.Timestamp).getTime() -
            new Date(b.Timestamp).getTime()
        )
        .map((p: { Timestamp: string; Average: number }) => ({
          time: new Date(p.Timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          usage: Math.round(p.Average * 100) / 100,
        }));

      if (points.length > 0) {
        setCpuData(points);
      }
    })
    .catch((err) => console.log("CPU fetch failed", err));
  }, []);


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

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const runAgent = () => {
    if (!wsRef.current || running) return;
    setEvents([]);
    setRunning(true);
    wsRef.current.send("run_agent");
  };

  const getEventColor = (event: string) => {
    if (event === "agent_start") return "#60a5fa";
    if (event === "agent_complete") return "#34d399";
    if (event === "pipeline_complete") return "#a78bfa";
    if (event === "connected") return "#6b7280";
    return "#f9fafb";
  };

  const getAgentLabel = (event: AgentEvent) => {
    if (event.event === "agent_start") return `⚙️ Running ${event.agent}...`;
    if (event.event === "agent_complete") return `✅ ${event.agent} complete`;
    if (event.event === "pipeline_complete") return `🎉 Pipeline complete!`;
    if (event.event === "connected") return `🔗 Connected to CloudPilot AI`;
    return event.message || event.event;
  };

  const getEventType = (event: string) => {
    if (event === "agent_start") return "info";
    if (event === "agent_complete") return "success";
    if (event === "pipeline_complete") return "action";
    if (event === "connected") return "info";
    return "alert";
  };

  const getIncidentSeverity = (incident: IncidentRecord) => {
    if (incident.status === "needs_approval") return "critical";
    if ((incident.anomalies as unknown[])?.length > 0) return "warning";
    return "info";
  };

  const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
    critical: { color: "text-red-400", bg: "bg-red-400/10", label: "critical" },
    warning: { color: "text-amber-400", bg: "bg-amber-400/10", label: "warning" },
    info: { color: "text-blue-400", bg: "bg-blue-400/10", label: "info" },
  };

  const statusBadge: Record<string, string> = {
    healthy: "bg-emerald-400/10 text-emerald-400",
    needs_approval: "bg-amber-400/10 text-amber-400",
  };

  const activeIncidents = incidents.length;
  const aiRecommendations = incidents.filter((i) => i.requires_approval).length;
  const runningAgents = mockAgents.filter((a) => a.status === "running").length;
  const healthyServices = Math.max(0, 24 - incidents.length);

  const kpiConfig = [
    {
      title: "Active Incidents",
      value: activeIncidents,
      icon: AlertTriangle,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
      borderColor: "border-red-400/20",
      trend: `${activeIncidents} open`,
    },
    {
      title: "Healthy Services",
      value: healthyServices,
      icon: CheckCircle,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
      borderColor: "border-emerald-400/20",
      trend: `${Math.round((healthyServices / 24) * 100)}% uptime`,
    },
    {
      title: "Running Agents",
      value: runningAgents,
      icon: Bot,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      borderColor: "border-blue-400/20",
      trend: `${runningAgents}/${mockAgents.length} active`,
    },
    {
      title: "AI Recommendations",
      value: aiRecommendations,
      icon: Lightbulb,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/20",
      trend: `${aiRecommendations} pending review`,
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
      <main className="p-4 lg:p-8 space-y-6">
        {/* Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                connected ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className={connected ? "text-emerald-400" : "text-red-400"}>
              {connected ? "Live — connected to backend" : "Disconnected"}
            </span>
          </div>
          <button
            onClick={runAgent}
            disabled={running || !connected}
            className={`rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors ${
              running || !connected
                ? "cursor-not-allowed bg-slate-700"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {running ? "⏳ Running agents..." : "🚀 Run Agent Pipeline"}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiConfig.map((kpi) => (
            <Card key={kpi.title} className={kpi.borderColor}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{kpi.value}</div>
                <p className="text-xs text-slate-400 mt-1">{kpi.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monitoring Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CPU Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cpuData}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#cpuGradient)"
                    name="CPU Usage"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Memory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={memoryData}>
                  <defs>
                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#memGradient)"
                    name="Memory Usage"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Network Traffic</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={networkData}>
                  <defs>
                    <linearGradient id="inGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    unit=" Mbps"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area
                    type="monotone"
                    dataKey="inbound"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#inGradient)"
                    name="Inbound"
                  />
                  <Area
                    type="monotone"
                    dataKey="outbound"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#outGradient)"
                    name="Outbound"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Agent Status + Live Feed */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Agent Status Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Agent Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAgents.map((agent) => {
                const config = statusConfig[agent.status] || statusConfig.idle;
                const StatusIcon = config.icon;
                return (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg}`}
                      >
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{agent.name}</p>
                        <p className="text-xs text-slate-500">Last seen {agent.lastSeen}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}
                      >
                        {agent.status}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">{agent.tasks} tasks</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Live Agent Feed */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Live Agent Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={feedRef}
                className="space-y-3 max-h-[400px] overflow-y-auto pr-2"
              >
                {events.length === 0 && (
                  <div className="text-slate-600 text-sm text-center py-24">
                    Click "Run Agent Pipeline" to start monitoring
                  </div>
                )}
                {events.map((ev, i) => {
                  const evType = getEventType(ev.event);
                  const config = typeConfig[evType] || typeConfig.info;
                  const TypeIcon = config.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${config.bg}`}
                      >
                        <TypeIcon className={`h-3.5 w-3.5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-400">
                            {getAgentLabel(ev)}
                          </p>
                          <p className="text-xs text-slate-600 shrink-0">just now</p>
                        </div>
                        {ev.result && (
                          <p className="text-xs text-slate-500 font-mono mt-1 break-all">
                            {JSON.stringify(ev.result).slice(0, 120)}...
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Incidents from localStorage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">ID</th>
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">Severity</th>
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">Status</th>
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">Anomalies</th>
                    <th className="pb-3 pr-4 text-left font-medium text-slate-400">Root Cause</th>
                    <th className="pb-3 text-left font-medium text-slate-400">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {incidents.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-600 text-sm"
                      >
                        No incidents recorded yet. Run the agent pipeline to generate incident data.
                      </td>
                    </tr>
                  )}
                  {incidents.map((incident) => {
                    const sev = severityConfig[getIncidentSeverity(incident)];
                    return (
                      <tr
                        key={incident.id}
                        className="hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 pr-4 font-mono text-xs text-slate-400">
                          {incident.id}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sev.bg} ${sev.color}`}
                          >
                            {sev.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[incident.status]}`}
                          >
                            {incident.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {(incident.anomalies as unknown[])?.length ?? 0}
                        </td>
                        <td className="py-3 pr-4 text-slate-300 max-w-xs truncate">
                          {incident.root_cause || "—"}
                        </td>
                        <td className="py-3 text-slate-500 text-xs">
                          {new Date(incident.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Summary Cards (existing functionality preserved) */}
        {events.some((e) => e.event === "pipeline_complete") && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                label: "Anomalies Found",
                value:
                  (
                    events.find(
                      (e) => e.agent === "anomaly_detector" && e.event === "agent_complete"
                    )?.result?.anomalies as unknown[]
                  )?.length ?? 0,
                color: "text-red-400",
              },
              {
                label: "Root Cause",
                value: "Generated",
                color: "text-blue-400",
              },
              {
                label: "Fix Plan",
                value: "Ready for review",
                color: "text-emerald-400",
              },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardContent className="pt-6">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">
                    {label}
                  </div>
                  <div className={`text-2xl font-bold ${color} mt-2`}>{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}