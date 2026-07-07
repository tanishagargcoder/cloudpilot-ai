"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Sparkles,
  User,
  Mic,
  Volume2,
  VolumeX,
  Type,
  AudioLines,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isVoice?: boolean;
};

type VoiceMode = "text-only" | "voice-and-text";

const API_URL = "https://cloudpilot-ai-backend.onrender.com";

// ── Text-to-speech ──────────────────────────────────────────────────────────
function speak(text: string, onEnd?: () => void) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,3} /g, "")
    );
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const goodVoice = voices.find(
      (v) => v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Microsoft")
    );
    if (goodVoice) utterance.voice = goodVoice;
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  }
}
function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ── Suggestions ─────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What's the system status?",
  "Show recent incidents",
  "Any pending approvals?",
  "What is DevOps?",
  "Explain Terraform simply",
  "How do AI agents work?",
];

// ── Main Component ───────────────────────────────────────────────────────────
export function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm **CloudPilot AI** 👋\n\nI can answer anything — DevOps, cloud, AI, your incidents, or just a chat!\n\nPick a suggestion below or type your question.",
      timestamp: "now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("text-only");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Speech recognition init
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.getVoices();
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onstart = () => { setIsListening(true); setSpeechError(null); };
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setInput(t);
      if (e.results[0].isFinal) {
        setTimeout(() => sendMessage(t, true), 300);
        setIsListening(false);
      }
    };
    rec.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === "not-allowed") setSpeechError("Microphone blocked. Allow mic access in browser settings.");
      else if (e.error === "no-speech") setSpeechError("No speech detected. Try again.");
      else setSpeechError(`Error: ${e.error}`);
      setTimeout(() => setSpeechError(null), 4000);
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  // ── Local fallback answers (works without any API key) ──────────────────
  const getLocalAnswer = (q: string): string => {
    const incidents = JSON.parse(localStorage.getItem("cloudpilot_incidents") || "[]");
    const pending = incidents.filter((i: any) => i.status === "needs_approval");
    const lower = q.toLowerCase();

    if (lower.includes("status") || lower.includes("health") || lower.includes("system")) {
      return `**System Status** 📊\n\n• Total incidents: **${incidents.length}**\n• Pending approvals: **${pending.length}**\n• Monitoring: **Active** (EC2 CPU via CloudWatch)\n\n${pending.length > 0 ? "⚠️ You have approvals waiting — check the Approvals page." : "✅ Nothing needs your attention right now."}`;
    }
    if (lower.includes("incident")) {
      if (incidents.length === 0) return "No incidents recorded yet. Click **Run Agent Pipeline** on the dashboard to scan for anomalies.";
      const recent = incidents.slice(0, 3).map((i: any, idx: number) =>
        `${idx + 1}. [${i.status}] ${(i.root_cause || "Analyzing...").replace(/\*\*/g, "").slice(0, 80)}`
      ).join("\n");
      return `**Recent Incidents** (${incidents.length} total)\n\n${recent}\n\nSee the Incidents page for full details.`;
    }
    if (lower.includes("approval") || lower.includes("pending")) {
      return pending.length === 0
        ? "✅ No pending approvals — you're all caught up!"
        : `⚠️ **${pending.length} approval${pending.length > 1 ? "s" : ""} pending.** Head to the Approvals page to review the AI-generated fix plans.`;
    }
    return "I can answer questions about your **system status**, **incidents**, and **approvals** right now.\n\nFor full AI answers (DevOps, cloud, anything!), add a `NEXT_PUBLIC_GEMINI_API_KEY` in your environment settings.";
  };

  // ── Infra context shared by backend + direct calls ──────────────────────
  const buildContext = () => {
    const incidents = JSON.parse(localStorage.getItem("cloudpilot_incidents") || "[]");
    const pending = incidents.filter((i: any) => i.status === "needs_approval");
    return `Current infrastructure context:
- Total incidents recorded: ${incidents.length}
- Pending approvals: ${pending.length}
- Recent incidents: ${
      incidents
        .slice(0, 3)
        .map((i: any) => `[${i.status}] ${(i.root_cause || "unknown").slice(0, 60)}`)
        .join(" | ") || "None yet"
    }`;
  };

  // ── Preferred path: backend /chat (Gemini key stays server-side) ────────
  const callBackendChat = async (userMessage: string): Promise<string> => {
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, context: buildContext() }),
    });
    if (!response.ok) throw new Error(`Backend error ${response.status}`);
    const data = await response.json();
    if (!data.reply) throw new Error(data.error || "No reply from backend");
    return data.reply;
  };

  // ── Fallback: direct Gemini call (only if a public key is set) ──────────
  const callGemini = async (userMessage: string): Promise<string> => {
    const systemContext = `You are CloudPilot AI, a friendly and intelligent DevOps assistant embedded in a cloud monitoring dashboard.

${buildContext()}

You can answer ANY question — DevOps, cloud computing, AI, programming, general knowledge, or friendly conversation. Keep answers concise (under 150 words unless more detail is needed). Use bullet points for lists. Be warm and helpful.

User question: ${userMessage}`;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("No API key");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemContext }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 400,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${response.status}`);
    }
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't get a response. Please try again."
    );
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (text: string, fromVoice = false) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isVoice: fromVoice,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Try secure backend first, then direct Gemini, then local answers
      let reply: string;
      try {
        reply = await callBackendChat(trimmed);
      } catch {
        reply = await callGemini(trimmed);
      }
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isVoice: fromVoice && voiceMode === "voice-and-text",
      };
      setMessages((prev) => [...prev, botMsg]);
      if (fromVoice && voiceMode === "voice-and-text") {
        setIsSpeaking(true);
        speak(reply, () => setIsSpeaking(false));
      }
    } catch {
      // Gemini unavailable → answer from live dashboard data instead of erroring
      const fallback = getLocalAnswer(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: fallback,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      if (fromVoice && voiceMode === "voice-and-text") {
        setIsSpeaking(true);
        speak(fallback, () => setIsSpeaking(false));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      setSpeechError("Voice not supported. Use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try { recognitionRef.current.start(); }
      catch { setSpeechError("Could not start voice input. Try again."); }
    }
  };

  const clearChat = () => {
    setMessages([{
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: "Chat cleared! Ask me anything.",
      timestamp: "now",
    }]);
    stopSpeaking();
    setIsSpeaking(false);
  };

  // ── Simple markdown renderer ──────────────────────────────────────────────
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line === "") return <br key={i} />;
      if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
        return <p key={i} className="pl-2 before:content-['·'] before:mr-1.5 before:text-slate-500">{line.slice(2)}</p>;
      }
      if (/^\d+\. /.test(line)) {
        return <p key={i} className="pl-2">{line}</p>;
      }
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} className="text-slate-100 font-semibold">{part}</strong>
              : part
          )}
        </p>
      );
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-2xl shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-105 transition-all duration-300 group"
          title="Open CloudPilot AI"
        >
          <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[400px] rounded-2xl border border-slate-800/60 bg-slate-950/98 backdrop-blur-xl shadow-2xl shadow-black/50 flex flex-col transition-all duration-300 overflow-hidden ${
            minimized ? "h-[60px]" : "h-[580px]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100 leading-none">CloudPilot AI</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
                  <span className="text-[10px] text-slate-500">
                    {isLoading ? "Thinking..." : voiceMode === "voice-and-text" ? "Voice + Text" : "Ready · Gemini AI"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={clearChat} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors" title="Clear chat">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setVoiceMode((p) => p === "text-only" ? "voice-and-text" : "text-only"); stopSpeaking(); setIsSpeaking(false); }}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${voiceMode === "voice-and-text" ? "bg-violet-500/20 text-violet-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"}`}
                title="Toggle voice responses"
              >
                {voiceMode === "voice-and-text" ? <AudioLines className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setMinimized((p) => !p)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
                title={minimized ? "Expand" : "Minimize"}
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${minimized ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={() => { stopSpeaking(); setOpen(false); setMinimized(false); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl mt-0.5 ${
                      msg.role === "assistant"
                        ? "bg-gradient-to-br from-violet-500 to-purple-700"
                        : "bg-slate-800"
                    }`}>
                      {msg.role === "assistant"
                        ? <Sparkles className="h-3.5 w-3.5 text-white" />
                        : <User className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                    <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === "assistant"
                        ? "bg-slate-900/80 border border-slate-800/60 text-slate-300"
                        : "bg-violet-600/20 border border-violet-500/20 text-slate-200"
                    }`}>
                      {msg.isVoice && msg.role === "assistant" && (
                        <div className="flex items-center gap-1 mb-1 text-[10px] text-violet-400">
                          <Volume2 className="h-2.5 w-2.5" /><span>Voice response</span>
                        </div>
                      )}
                      <div className="space-y-0.5">{renderContent(msg.content)}</div>
                      <span className="text-[9px] text-slate-600 block mt-1.5">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}

                {/* Loading dots */}
                {isLoading && (
                  <div className="flex gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Speech error */}
                {speechError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                    <p className="text-xs text-red-400">{speechError}</p>
                  </div>
                )}

                {/* Suggestion chips — only on first message */}
                {messages.length <= 1 && !isLoading && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] text-slate-600 px-1">Try asking:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => sendMessage(s)}
                          className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400 hover:border-violet-500/40 hover:text-violet-400 hover:bg-violet-500/5 transition-all text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Speaking indicator */}
              {isSpeaking && (
                <div className="px-4 py-2 border-t border-slate-800/60 shrink-0">
                  <button
                    onClick={() => { stopSpeaking(); setIsSpeaking(false); }}
                    className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/20 transition-colors w-full justify-center"
                  >
                    <VolumeX className="h-3 w-3" /> Stop speaking
                  </button>
                </div>
              )}

              {/* Input area */}
              <div className="p-3 border-t border-slate-800/60 shrink-0 space-y-2">
                {isListening && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[11px] text-red-400">Listening... speak now</span>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-900/50 px-3 py-2 focus-within:ring-1 focus-within:ring-violet-500/40 focus-within:border-violet-500/30 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                      isListening ? "Listening..." :
                      isLoading ? "Waiting for response..." :
                      "Ask anything..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                    disabled={isListening || isLoading}
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={toggleVoice}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      isListening
                        ? "bg-red-500/20 text-red-400 animate-pulse"
                        : "text-slate-500 hover:text-violet-400 hover:bg-violet-500/10"
                    }`}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isListening || isLoading}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[9px] text-slate-700 text-center">
                  Powered by Gemini AI · {voiceMode === "voice-and-text" ? "🔊 Voice on" : "💬 Text mode"}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}