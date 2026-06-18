import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CloudPilot AI",
  description: "AI-powered DevOps Assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", background: "#0f1117" }}>
        {/* Sidebar */}
        <aside style={{
          width: "220px",
          background: "#1a1d27",
          borderRight: "1px solid #2a2d3a",
          padding: "24px 0",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          flexShrink: 0,
        }}>
          <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #2a2d3a", marginBottom: "8px" }}>
            <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: "18px" }}>☁️ CloudPilot</span>
            <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>AI DevOps Assistant</div>
          </div>
          {[
            { href: "/", label: "🏠 Dashboard" },
            { href: "/incidents", label: "🚨 Incidents" },
            { href: "/approvals", label: "✅ Approvals" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              display: "block",
              padding: "10px 20px",
              color: "#d1d5db",
              textDecoration: "none",
              fontSize: "14px",
              borderRadius: "6px",
              margin: "0 8px",
            }}>
              {label}
            </Link>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: "32px", color: "#f9fafb", overflowY: "auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
