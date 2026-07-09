import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { AppShell } from "./components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "CloudPilot AI — DevOps Dashboard",
    template: "%s · CloudPilot AI",
  },
  description:
    "AI-powered AWS monitoring with autonomous anomaly detection, root cause analysis, and one-click remediation — with a human in the loop.",
  openGraph: {
    title: "CloudPilot AI — DevOps Dashboard",
    description: "AI agents that detect, diagnose, and fix cloud incidents.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}