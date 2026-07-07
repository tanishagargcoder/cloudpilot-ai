import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import { AIChatbot } from "./components/AIChatbot";
import { KeepAlive } from "./components/KeepAlive";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CloudPilot AI",
  description: "DevOps Assistant",
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
          <KeepAlive />
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <main className="flex-1 overflow-y-auto p-6 max-lg:pt-20">
                {children}
              </main>
            </div>
          </div>
          <AIChatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}