"use client";
import { useState, useEffect, useRef } from "react";

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

export default function Dashboard() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
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
          localStorage.setItem(
            "cloudpilot_incidents",
            JSON.stringify([incident, ...existing].slice(0, 10))
          );
        }
      }
    };

    return () => ws.close();
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>Dashboard</h1>
          <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "4px" }}>
            {connected
              ? <span style={{ color: "#34d399" }}>● Live — connected to backend</span>
              : <span style={{ color: "#ef4444" }}>● Disconnected</span>}
          </div>
        </div>
        <button
          onClick={runAgent}
          disabled={running || !connected}
          style={{
            background: running ? "#374151" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "⏳ Running agents..." : "🚀 Run Agent Pipeline"}
        </button>
      </div>

      <div style={{
        background: "#1a1d27",
        border: "1px solid #2a2d3a",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
      }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Live Agent Feed
        </div>
        <div ref={feedRef} style={{ height: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          {events.length === 0 && (
            <div style={{ color: "#374151", fontSize: "13px", textAlign: "center", marginTop: "120px" }}>
              Click "Run Agent Pipeline" to start monitoring
            </div>
          )}
          {events.map((ev, i) => (
            <div key={i} style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
              fontSize: "13px",
              padding: "8px 12px",
              background: "#0f1117",
              borderRadius: "6px",
              borderLeft: `3px solid ${getEventColor(ev.event)}`,
            }}>
              <span style={{ color: getEventColor(ev.event), fontWeight: 600, minWidth: "180px" }}>
                {getAgentLabel(ev)}
              </span>
              {ev.result && (
                <span style={{ color: "#6b7280", fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all" }}>
                  {JSON.stringify(ev.result).slice(0, 120)}...
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {events.some(e => e.event === "pipeline_complete") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {[
            { label: "Anomalies Found", value: (events.find(e => e.agent === "anomaly_detector" && e.event === "agent_complete")?.result?.anomalies as unknown[])?.length ?? 0, color: "#ef4444" },
            { label: "Root Cause", value: "Generated", color: "#60a5fa" },
            { label: "Fix Plan", value: "Ready for review", color: "#34d399" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color, marginTop: "8px" }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}