"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, FileText, ShieldAlert, BarChart3, Server,
  DollarSign, ShieldCheck, Bell, Settings, ScrollText,
  FlaskConical, Rocket, LogOut, Search, CornerDownLeft, AlertTriangle,
} from "lucide-react";
import { logAudit } from "../lib/audit";

type Item = {
  group: "Pages" | "Actions" | "Incidents";
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K to toggle, Esc to close, custom event from sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((p) => !p);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cloudpilot:cmdk", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cloudpilot:cmdk", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const go = useCallback((href: string) => {
    setOpen(false);
    window.location.href = href;
  }, []);

  const baseItems: Item[] = [
    { group: "Pages", label: "Dashboard",     icon: LayoutDashboard, run: () => go("/") },
    { group: "Pages", label: "Incidents",     icon: FileText,        run: () => go("/incidents") },
    { group: "Pages", label: "Approvals",     icon: ShieldAlert,     run: () => go("/approvals") },
    { group: "Pages", label: "Analytics",     icon: BarChart3,       run: () => go("/analytics") },
    { group: "Pages", label: "Services",      icon: Server,          run: () => go("/services") },
    { group: "Pages", label: "Cost Optimization", icon: DollarSign,  run: () => go("/cost") },
    { group: "Pages", label: "Security Agent",    icon: ShieldCheck, run: () => go("/security") },
    { group: "Pages", label: "Notifications", icon: Bell,            run: () => go("/notifications") },
    { group: "Pages", label: "Settings",      icon: Settings,        run: () => go("/settings") },
    { group: "Pages", label: "Audit Logs",    icon: ScrollText,      run: () => go("/audit") },
    { group: "Actions", label: "Simulate Incident", hint: "runs demo pipeline", icon: FlaskConical, run: () => go("/?simulate=true") },
    { group: "Actions", label: "Run Agent Pipeline", hint: "live AWS scan", icon: Rocket, run: () => go("/?run=true") },
    { group: "Actions", label: "Log out", icon: LogOut, run: () => {
        logAudit("Signed out");
        localStorage.removeItem("cloudpilot_user");
        window.location.replace("/login");
      } },
  ];

  // Universal search: also match recent incidents by id / root cause
  let incidentItems: Item[] = [];
  if (query.trim().length >= 2) {
    try {
      const incidents = JSON.parse(localStorage.getItem("cloudpilot_incidents") || "[]");
      incidentItems = incidents
        .filter((i: any) =>
          `${i.id} ${i.root_cause || ""} ${i.status}`.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 4)
        .map((i: any) => ({
          group: "Incidents" as const,
          label: i.id,
          hint: `${i.status} · ${(i.root_cause || "").replace(/\*/g, "").slice(0, 44)}`,
          icon: AlertTriangle,
          run: () => go("/incidents"),
        }));
    } catch {}
  }

  const q = query.trim().toLowerCase();
  const filtered = [
    ...baseItems.filter((i) => !q || i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q)),
    ...incidentItems,
  ];

  useEffect(() => { setSelected(0); }, [query]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((p) => Math.min(filtered.length - 1, p + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((p) => Math.max(0, p - 1)); }
    else if (e.key === "Enter" && filtered[selected]) { filtered[selected].run(); }
  };

  if (!open) return null;

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        className="mx-auto w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search pages, actions, incidents..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
          <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">esc</kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-slate-600">No results for "{query}"</p>
          )}
          {filtered.map((item, i) => {
            const showHeader = item.group !== lastGroup;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <div key={`${item.group}-${item.label}-${i}`}>
                {showHeader && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-600">{item.group}</p>
                )}
                <button
                  onClick={item.run}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    i === selected ? "bg-blue-600/15 text-blue-300" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${i === selected ? "text-blue-400" : "text-slate-500"}`} />
                  <span className="flex-1 text-sm truncate">{item.label}</span>
                  {item.hint && <span className="text-[10px] text-slate-600 truncate max-w-[45%]">{item.hint}</span>}
                  {i === selected && <CornerDownLeft className="h-3 w-3 text-slate-600 shrink-0" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-800 px-4 py-2 text-[10px] text-slate-600">
          <span><kbd className="text-slate-500">↑↓</kbd> navigate</span>
          <span><kbd className="text-slate-500">↵</kbd> select</span>
          <span className="ml-auto">CloudPilot Command Palette</span>
        </div>
      </div>
    </div>
  );
}
