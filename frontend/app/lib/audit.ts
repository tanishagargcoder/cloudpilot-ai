export type AuditEntry = {
  id: string;
  time: string;
  actor: string;
  action: string;
  detail?: string;
};

const KEY = "cloudpilot_audit";

export function logAudit(action: string, detail?: string, actor?: string) {
  if (typeof window === "undefined") return;
  try {
    const user = JSON.parse(localStorage.getItem("cloudpilot_user") || "null");
    const entries: AuditEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    entries.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toISOString(),
      actor: actor || user?.name || "System",
      action,
      detail,
    });
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 200)));
  } catch {}
}

export function getAuditLog(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearAuditLog() {
  try { localStorage.removeItem(KEY); } catch {}
}
