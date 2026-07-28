"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cloud, ArrowRight, Search, Brain, Wrench, FileText,
  ShieldCheck, DollarSign, Sparkles, ChevronDown,
} from "lucide-react";
import { FlowWave, WARP_DURATION } from "./components/FlowWave";

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShown(true); },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
    >
      {children}
    </div>
  );
}

const agents = [
  { icon: Search,   name: "Anomaly Detector", desc: "Scans live CloudWatch metrics against your threshold" },
  { icon: Brain,    name: "RCA Agent",        desc: "Gemini AI writes the root cause with a confidence level" },
  { icon: Wrench,   name: "Fix Agent",        desc: "Drafts a concrete Terraform change to remediate" },
  { icon: FileText, name: "Report Writer",    desc: "Posts a formatted incident report to Slack" },
];

const features = [
  { icon: ShieldCheck, title: "Security Agent",      desc: "Flags open security groups, public S3 buckets and missing MFA — with a live score." },
  { icon: DollarSign,  title: "Cost Agent",          desc: "Finds unattached volumes, idle instances and unused IPs, with monthly savings." },
  { icon: Sparkles,    title: "AI Copilot",          desc: "Voice-enabled assistant that knows your live incident data." },
];

export default function WelcomePage() {
  const [dashboardHref, setDashboardHref] = useState("/login");
  const [introDone, setIntroDone] = useState(false);
  const [warping, setWarping] = useState(false);

  // Fly through the wave, then hand over to the dashboard.
  const launch = (e: React.MouseEvent) => {
    e.preventDefault();
    if (warping) return;
    setWarping(true);
    document.body.style.overflow = "hidden";
    setTimeout(() => { window.location.href = dashboardHref; }, WARP_DURATION * 1000);
  };

  useEffect(() => {
    try {
      if (localStorage.getItem("cloudpilot_user")) setDashboardHref("/dashboard");
    } catch {}
  }, []);

  // Hold the page still while the camera flies in, then hand scroll back.
  useEffect(() => {
    if (introDone) {
      document.body.style.overflow = "";
      return;
    }
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";
    // Safety net: never leave the page locked if the scene can't animate.
    const failsafe = setTimeout(() => setIntroDone(true), 7000);
    return () => { clearTimeout(failsafe); document.body.style.overflow = ""; };
  }, [introDone]);

  return (
    <div className="relative bg-black text-slate-100">
      <FlowWave onIntroDone={() => setIntroDone(true)} warping={warping} />

      {/* Warp flash — brightens into the dashboard hand-off */}
      <div
        className={`pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(circle_at_center,rgba(52,232,154,0.55),rgba(2,22,12,0.9)_55%,#000_100%)] transition-opacity duration-[900ms] ease-in ${warping ? "opacity-100" : "opacity-0"}`}
      />

      {/* Top bar */}
      <header
        className={`fixed top-0 inset-x-0 z-20 flex items-center px-6 py-5 pointer-events-none transition-opacity duration-1000 ${introDone ? "opacity-100" : "opacity-0"}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-lg shadow-emerald-500/30">
            <Cloud className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-100">CloudPilot AI</span>
        </div>
      </header>

      {/* Scroll content — total height drives the camera dive */}
      <div className="relative z-10 pointer-events-none">
        {/* 1 — Hero */}
        <section className="flex h-screen flex-col items-center justify-center px-6 text-center">
          <div
            className={`transition-all duration-1000 ease-out ${introDone ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-8 blur-sm"}`}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/5 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-emerald-300 backdrop-blur-sm">
              Autonomous DevOps
            </span>
            <h1 className="mt-7 text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
              <span className="bg-gradient-to-r from-emerald-200 via-white to-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(52,232,154,0.25)]">
                CloudPilot AI
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-300/90 sm:text-lg">
              AI agents that detect, diagnose and fix your AWS incidents —
              <span className="text-emerald-300"> with a human in the loop</span> before anything ships.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={dashboardHref} onClick={launch}
                className="pointer-events-auto group inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_0_30px_-6px_rgba(52,232,154,0.7)] transition-all hover:bg-emerald-300 hover:shadow-[0_0_40px_-4px_rgba(52,232,154,0.9)]"
              >
                Launch dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>

          <div
            className={`absolute bottom-10 flex flex-col items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-emerald-300/40 transition-opacity duration-1000 delay-500 ${introDone ? "opacity-100" : "opacity-0"}`}
          >
            scroll
            <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
          </div>
        </section>

        {/* 2 — Pipeline */}
        <section className="flex min-h-screen items-center justify-center px-6 py-24">
          <div className="mx-auto w-full max-w-5xl">
            <Reveal className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Four agents. One pipeline.</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
                Every incident flows through the same chain — from raw CloudWatch metrics to a Terraform fix waiting for your approval.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {agents.map((a, i) => (
                <Reveal key={a.name} className={`[transition-delay:${i * 80}ms]`}>
                  <div className="h-full rounded-2xl border border-emerald-400/10 bg-slate-950/50 p-5 backdrop-blur-md transition-colors hover:border-emerald-400/30">
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10">
                        <a.icon className="h-4 w-4 text-emerald-300" />
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400/40">0{i + 1}</span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-slate-100">{a.name}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{a.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 3 — Human in the loop */}
        <section className="flex min-h-screen items-center justify-center px-6 py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              The AI proposes.
              <br />
              <span className="text-emerald-300">You approve.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
              No fix reaches your infrastructure without an engineer clicking approve. Every decision —
              approvals, rejections, scans, exports — lands in an immutable audit log and your Slack channel.
            </p>
          </Reveal>
        </section>

        {/* 4 — Features */}
        <section className="flex min-h-screen items-center justify-center px-6 py-24">
          <div className="mx-auto w-full max-w-4xl">
            <Reveal className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">More than monitoring</h2>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {features.map((f) => (
                <Reveal key={f.title}>
                  <div className="h-full rounded-2xl border border-white/10 bg-slate-950/50 p-6 backdrop-blur-md transition-colors hover:border-emerald-400/30">
                    <f.icon className="h-5 w-5 text-emerald-300" />
                    <h3 className="mt-4 text-sm font-semibold text-slate-100">{f.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 5 — Stack */}
        <section className="flex min-h-screen items-center justify-center px-6 py-24">
          <Reveal className="text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-300/50">Built with</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
              {["Next.js", "FastAPI", "AWS CloudWatch", "Gemini AI", "Terraform", "MongoDB", "Slack"].map((t) => (
                <span key={t} className="transition-colors hover:text-emerald-300">{t}</span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* 6 — CTA */}
        <section className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="bg-gradient-to-r from-emerald-200 via-white to-emerald-300 bg-clip-text text-transparent">
                See it running
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm text-slate-400">
              Live AWS metrics, real incidents, real remediation plans.
            </p>
            <a
              href={dashboardHref} onClick={launch}
              className="pointer-events-auto group mt-9 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-7 py-3.5 text-sm font-semibold text-emerald-950 shadow-[0_0_35px_-6px_rgba(52,232,154,0.8)] transition-all hover:bg-emerald-300"
            >
              Launch dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <p className="mt-8 text-[11px] text-slate-600">
              Demo login · demo@cloudpilot.ai / demo123
            </p>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
