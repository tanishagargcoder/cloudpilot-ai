"use client";

import { useState, useEffect } from "react";
import { Cpu, Brain, Cloud, Monitor, Moon, LayoutGrid, Save, RotateCcw, CheckCircle2 } from "lucide-react";

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
  theme: {
    darkMode: boolean;
    compactMode: boolean;
  };
};

const defaultSettings: SettingsState = {
  monitoring: { cpuThreshold: 85, memoryThreshold: 80, networkThreshold: 1000 },
  ai: { geminiModel: "gemini-1.5-pro", rcaConfidence: 0.85 },
  aws: { region: "us-east-1", instanceId: "i-0a1b2c3d4e5f6789a" },
  theme: { darkMode: true, compactMode: false },
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const update = (section: keyof SettingsState, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setSaved(false);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    setSettings(defaultSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-2">Configure monitoring thresholds, AI parameters, and platform preferences</p>
      </div>

      {/* Monitoring Settings */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <SectionIcon icon={Cpu} color="bg-blue-400/10" />
          <div>
            <CardTitle>Monitoring Settings</CardTitle>
            <CardDescription>Configure alert thresholds for system metrics</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "CPU Threshold", key: "cpuThreshold", unit: "%", min: 50, max: 100 },
            { label: "Memory Threshold", key: "memoryThreshold", unit: "%", min: 50, max: 100 },
            { label: "Network Threshold", key: "networkThreshold", unit: " Mbps", min: 100, max: 5000 },
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
                  className="flex-1 h-2 rounded-full bg-slate-800 accent-blue-500"
                />
                <span className="text-sm font-mono text-slate-300 w-16 text-right">
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
          <SectionIcon icon={Brain} color="bg-purple-400/10" />
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
              className="w-full h-10 rounded-xl border border-slate-800/60 bg-slate-950 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">RCA Confidence Level</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.05}
                value={settings.ai.rcaConfidence}
                onChange={(e) => update("ai", "rcaConfidence", Number(e.target.value))}
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
              className="w-full h-10 rounded-xl border border-slate-800/60 bg-slate-950 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">EU (Ireland)</option>
              <option value="ap-south-1">Asia Pacific (Mumbai)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Instance ID</label>
            <input
              type="text"
              value={settings.aws.instanceId}
              onChange={(e) => update("aws", "instanceId", e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-800/60 bg-slate-950 px-3 text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
      </Card>

      {/* Theme Settings */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <SectionIcon icon={Monitor} color="bg-emerald-400/10" />
          <div>
            <CardTitle>Theme Settings</CardTitle>
            <CardDescription>Customize your dashboard appearance</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${settings.theme.darkMode ? "bg-blue-500/20" : "bg-slate-800"}`}>
              <Moon className={`h-5 w-5 ${settings.theme.darkMode ? "text-blue-400" : "text-slate-500"}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Dark Mode</p>
              <p className="text-xs text-slate-500">Always on for enterprise</p>
            </div>
            <input
              type="checkbox"
              checked={settings.theme.darkMode}
              onChange={(e) => update("theme", "darkMode", e.target.checked)}
              className="ml-4 h-5 w-5 rounded border-slate-700 bg-slate-800 accent-blue-500"
            />
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${settings.theme.compactMode ? "bg-blue-500/20" : "bg-slate-800"}`}>
              <LayoutGrid className={`h-5 w-5 ${settings.theme.compactMode ? "text-blue-400" : "text-slate-500"}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Compact Mode</p>
              <p className="text-xs text-slate-500">Reduce spacing and padding</p>
            </div>
            <input
              type="checkbox"
              checked={settings.theme.compactMode}
              onChange={(e) => update("theme", "compactMode", e.target.checked)}
              className="ml-4 h-5 w-5 rounded border-slate-700 bg-slate-800 accent-blue-500"
            />
          </label>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
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
          <span className="text-sm text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}