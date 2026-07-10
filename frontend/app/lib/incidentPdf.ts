import { jsPDF } from "jspdf";
import { parseServerDate } from "./time";

type IncidentLike = {
  id: string;
  created_at: string;
  status: string;
  anomalies: unknown[];
  root_cause: string | null;
  fix_plan: string | null;
  report: string | null;
};

const clean = (t: string) =>
  t
    .replace(/```[a-z]*\n?/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,3} /g, "");

export function downloadIncidentPdf(incident: IncidentLike) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = 0;

  // Header band
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 90, pageW, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CloudPilot AI", margin, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Incident Report", margin, 60);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 60, { align: "right" });

  y = 124;

  // Incident metadata
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const anomalyCount = incident.anomalies?.length ?? 0;
  const meta: [string, string][] = [
    ["Incident ID", incident.id],
    ["Created", parseServerDate(incident.created_at).toLocaleString()],
    ["Status", incident.status.replace(/_/g, " ").toUpperCase()],
    ["Anomalies detected", String(anomalyCount)],
  ];
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, margin + 130, y);
    y += 18;
  });
  y += 12;

  const section = (title: string, body: string, rgb: [number, number, number]) => {
    if (y + 40 > pageH - 60) {
      doc.addPage();
      y = 60;
    }
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(margin, y - 10, 3, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin + 10, y);
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const lines: string[] = doc.splitTextToSize(clean(body), maxW);
    lines.forEach((line) => {
      if (y > pageH - 60) {
        doc.addPage();
        y = 60;
      }
      doc.text(line, margin, y);
      y += 13;
    });
    y += 20;
  };

  section("Root Cause Analysis", incident.root_cause || "No root cause generated.", [245, 158, 11]);
  section("Recommended Fix", incident.fix_plan || "No fix plan generated.", [59, 130, 246]);
  if (incident.report) {
    section("Incident Report", incident.report, [16, 185, 129]);
  }

  // Footer with page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `CloudPilot AI — Automated DevOps Assistant  ·  Page ${i} of ${pages}`,
      pageW / 2,
      pageH - 30,
      { align: "center" }
    );
  }

  doc.save(`${incident.id}-report.pdf`);
}
