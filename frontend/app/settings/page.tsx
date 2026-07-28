"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Cpu, Brain, Cloud, Monitor, Moon, Sun, LayoutGrid,
  Save, RotateCcw, CheckCircle2, ArrowLeft,
} from "lucide-react";

type SettingsState = {
  monitoring: {
    cpuThreshold: number;
    memoryThreshold: number;
    networkThreshold: number;
  };
  ai: {
    geminiModel: string;
    rcaConfidence: number;
  };
  aws: {
    region: string;
    instanceId: string;
  };
};

const defaultSettings: SettingsState = {
  monitoring: { cpuThreshold: 85, memoryThreshold: 80, networkThreshold: 1000 },
  ai: { geminiModel: "gemini-2.0-flash", rcaConfidence: 0.85 },
  aws: { region: "ap-south-1", instanceId: "i-0cbf039f5c1709375" },
};

const STORAGE_KEY = "cloudpilot_settings";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm p-6 ${className}`}>
      {children}
    </div>
  );
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-slate-100 tracking-tight">{children}</h3>;
}
function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 mt-1">{children}</p>;
}
function SectionIcon({ icon: Icon, color }: { icon: typeof Cpu; color: string }) {
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
      <Icon className={`h-5 w-5 ${color.replace("bg-", "text-").replace("/10", "")}`} />
    </div>
  );
}

// ── Toggle Switch UI ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-emerald-600" : "bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => { setMounted(true); }, []);
  
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
        if (parsed.compactMode !== undefined) setCompactMode(parsed.compactMode);
      } catch {}
    }
  }, []);

  if (!mounted) {
    return null;
  }

  const update = (section: keyof SettingsState, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setSaved(false);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, compactMode }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    setSettings(defaultSettings);
    setTheme("dark");
    setCompactMode(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultSettings, compactMode: false }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isDark = theme === "dark";

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </a>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure monitoring thresholds, AI parameters, and platform preferences</p>
      </div>

      {/* Monitoring */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <SectionIcon icon={Cpu} color="bg-emerald-400/10" />
          <div>
            <CardTitle>Monitoring Settings</CardTitle>
            <CardDescription>Configure alert thresholds for system metrics</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "CPU Threshold", key: "cpuThreshold", unit: "%", min: 50, max: 100, color: "accent-emerald-500" },
            { label: "Memory Threshold", key: "memoryThreshold", unit: "%", min: 50, max: 100, color: "accent-emerald-500" },
            { label: "Network Threshold", key: "networkThreshold", unit: " Mbps", min: 100, max: 5000, color: "accent-purple-500" },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-slate-300">{field.label}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  value={settings.monitoring[field.key as keyof typeof settings.monitoring] as number}
                  onChange={(e) => update("monitoring", field.key, Number(e.target.value))}
                  className={`flex-1 h-2 rounded-full bg-slate-800 ${field.color}`}
                />
                <span className="text-sm font-mono text-slate-300 w-20 text-right">
                  {settings.monitoring[field.key as keyof typeof settings.monitoring]}{field.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Settings */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <SectionIcon icon={Brain} color="bg-emerald-400/10" />
          <div>
            <CardTitle>AI Settings</CardTitle>
            <CardDescription>Configure Gemini model and analysis confidence</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Gemini Model</label>
            <select
              value={settings.ai.geminiModel}
              onChange={(e) => update("ai", "geminiModel", e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-800/60 bg-slate-950 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Free)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">RCA Confidence Level</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={50}
                max={100}
                value={Math.round(settings.ai.rcaConfidence * 100)}
                onChange={(e) => update("ai", "rcaConfidence", Number(e.target.value) / 100)}
                className="flex-1 h-2 rounded-full bg-slate-800 accent-purple-500"
              />
              <span className="text-sm font-mono text-slate-300 w-12 text-right">
                {Math.round(settings.ai.rcaConfidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* AWS Settings */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <SectionIcon icon={Cloud} color="bg-amber-400/10" />
          <div>
            <CardTitle>AWS Settings</CardTitle>
            <CardDescription>Configure cloud infrastructure parameters</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Region</label>
            <select
              value={settings.aws.region}
              onChange={(e) => update("aws", "region", e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-800/60 bg-slate-950 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="ap-south-1">Asia Pacific (Mumbai) — ap-south-1</option>
              <option value="us-east-1">US East (N. Virginia) — us-east-1</option>
              <option value="us-west-2">US West (Oregon) — us-west-2</option>
              <option value="eu-west-1">EU (Ireland) — eu-west-1</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">EC2 Instance ID</label>
            <input
              type="text"
              value={settings.aws.instanceId}
              onChange={(e) => update("aws", "instanceId", e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-800/60 bg-slate-950 px-3 text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <p className="text-xs text-slate-600">Your monitored EC2 instance</p>
          </div>
        </div>
      </Card>

      {/* ── Theme Settings — REAL working toggle ── */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <SectionIcon icon={Monitor} color="bg-emerald-400/10" />
          <div>
            <CardTitle>Theme Settings</CardTitle>
            <CardDescription>Customize your dashboard appearance</CardDescription>
          </div>
        </div>

        <div className="space-y-4">
          {/* Dark / Light toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isDark ? "bg-slate-700" : "bg-amber-400/10"}`}>
                {mounted && isDark
                  ? <Moon className="h-4 w-4 text-slate-300" />
                  : <Sun className="h-4 w-4 text-amber-400" />}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {mounted ? (isDark ? "Dark Mode" : "Light Mode") : "Dark Mode"}
                </p>
                <p className="text-xs text-slate-500">
                  {mounted ? (isDark ? "Easy on the eyes in low light" : "Better visibility in bright environments") : ""}
                </p>
              </div>
            </div>
            {mounted && (
              <Toggle
                checked={isDark}
                onChange={(val) => setTheme(val ? "dark" : "light")}
              />
            )}
          </div>

          {/* Compact mode */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${compactMode ? "bg-emerald-500/10" : "bg-slate-800"}`}>
                <LayoutGrid className={`h-4 w-4 ${compactMode ? "text-emerald-400" : "text-slate-500"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Compact Mode</p>
                <p className="text-xs text-slate-500">Reduce spacing and padding (saved for next session)</p>
              </div>
            </div>
            <Toggle checked={compactMode} onChange={setCompactMode} />
          </div>

          {/* Theme preview */}
          {mounted && (
            <div className={`rounded-xl border p-4 transition-all ${
              isDark
                ? "border-slate-800 bg-slate-950 text-slate-200"
                : "border-slate-300 bg-white text-slate-800"
            }`}>
              <p className="text-xs font-medium mb-2 opacity-60 uppercase tracking-wider">Preview</p>
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg ${isDark ? "bg-emerald-600" : "bg-emerald-500"} flex items-center justify-center`}>
                  <Cloud className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">CloudPilot AI</p>
                  <p className="text-xs opacity-50">DevOps Assistant</p>
                </div>
                <div className="ml-auto flex gap-2">
                  {["bg-red-400", "bg-amber-400", "bg-emerald-400"].map((c) => (
                    <span key={c} className={`h-2 w-2 rounded-full ${c}`} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 pb-8">
        <button
          onClick={save}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Default
        </button>
        {saved && (
          <span className="text-sm text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}