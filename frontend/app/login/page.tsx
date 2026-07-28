"use client";

import { useState } from "react";
import { Cloud, Mail, Lock, LogIn, Sparkles, Eye, EyeOff } from "lucide-react";
import { logAudit } from "../lib/audit";

const DEMO_EMAIL = "demo@cloudpilot.ai";
const DEMO_PASSWORD = "demo123";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = (userEmail: string) => {
    const name = userEmail
      .split("@")[0]
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    localStorage.setItem(
      "cloudpilot_user",
      JSON.stringify({ name, email: userEmail, loginTime: new Date().toISOString() })
    );
    logAudit("Signed in", userEmail, name);
    window.location.replace("/dashboard");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError("Invalid credentials. Use the demo account below.");
      return;
    }
    setLoading(true);
    setTimeout(() => login(email.trim().toLowerCase()), 600);
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setTimeout(() => login(DEMO_EMAIL), 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-emerald-600/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 h-64 w-64 rounded-full bg-emerald-600/8 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-2xl shadow-emerald-600/40 mb-4">
            <Cloud className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-200 via-white to-emerald-400 bg-clip-text text-transparent">
            CloudPilot AI
          </h1>
          <p className="text-sm text-slate-500 mt-1">AI-powered DevOps monitoring & remediation</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
          <h2 className="text-lg font-semibold text-slate-100 mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-6">Sign in to your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                <Lock className="h-4 w-4 text-slate-500 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-emerald-600/25"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Continue with Demo Account
          </button>

          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-center">
            <p className="text-[11px] text-slate-500">
              Demo credentials: <span className="text-slate-300 font-mono">{DEMO_EMAIL}</span> · <span className="text-slate-300 font-mono">{DEMO_PASSWORD}</span>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          v1.0.0 · CloudPilot AI · Portfolio demo — no real credentials required
        </p>
      </div>
    </div>
  );
}
